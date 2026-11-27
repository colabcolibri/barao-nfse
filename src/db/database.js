'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { encryptSecret, decryptSecret } = require('../infra/secretStore');

function initDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(dbPath);
  try { fs.chmodSync(dbPath, 0o600); } catch { /* ignore if new */ }
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS prestador (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      cnpj TEXT NOT NULL DEFAULT '',
      razao_social TEXT NOT NULL DEFAULT '',
      nome_fantasia TEXT NOT NULL DEFAULT '',
      inscricao_municipal TEXT NOT NULL DEFAULT '',
      cep TEXT NOT NULL DEFAULT '',
      logradouro TEXT NOT NULL DEFAULT '',
      numero TEXT NOT NULL DEFAULT '',
      complemento TEXT NOT NULL DEFAULT '',
      bairro TEXT NOT NULL DEFAULT '',
      municipio TEXT NOT NULL DEFAULT 'São José dos Campos',
      uf TEXT NOT NULL DEFAULT 'SP',
      codigo_municipio_ibge TEXT NOT NULL DEFAULT '3549904',
      telefone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      op_simp_nac TEXT NOT NULL DEFAULT '3',
      reg_esp_trib TEXT NOT NULL DEFAULT '0',
      aliquota_padrao_iss REAL NOT NULL DEFAULT 2.0,
      p_tot_trib_sn REAL NOT NULL DEFAULT 6.0,
      rps_serie TEXT NOT NULL DEFAULT '1',
      proximo_numero_nota INTEGER NOT NULL DEFAULT 1,
      proximo_numero_dps INTEGER NOT NULL DEFAULT 1,
      ultimo_nsu INTEGER NOT NULL DEFAULT 0,
      ambiente TEXT NOT NULL DEFAULT 'homologacao',
      certificado_path TEXT NOT NULL DEFAULT '',
      certificado_senha TEXT NOT NULL DEFAULT '',
      logo_path TEXT NOT NULL DEFAULT ''
    );

    INSERT OR IGNORE INTO prestador (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      tomador_id TEXT DEFAULT '',
      c_trib_nac TEXT NOT NULL DEFAULT '010101',
      c_nbs TEXT DEFAULT '',
      codigo_interno TEXT DEFAULT '',
      discriminacao TEXT NOT NULL,
      info_complementar TEXT DEFAULT '',
      valor_padrao REAL DEFAULT 0,
      aliquota_iss REAL DEFAULT 2.0,
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transmissoes_log (
      id TEXT PRIMARY KEY,
      criado_em TEXT NOT NULL,
      tipo TEXT NOT NULL,
      ambiente TEXT NOT NULL,
      id_dps TEXT,
      status_http INTEGER,
      chave_acesso TEXT,
      resposta TEXT,
      xml_enviado TEXT
    );

    CREATE TABLE IF NOT EXISTS tomadores (
      id TEXT PRIMARY KEY,
      tipo_pessoa TEXT NOT NULL DEFAULT 'BR',
      documento TEXT NOT NULL,
      nome TEXT NOT NULL,
      inscricao_municipal TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      telefone TEXT NOT NULL DEFAULT '',
      cep TEXT NOT NULL DEFAULT '',
      logradouro TEXT NOT NULL DEFAULT '',
      numero TEXT NOT NULL DEFAULT '',
      complemento TEXT NOT NULL DEFAULT '',
      bairro TEXT NOT NULL DEFAULT '',
      municipio TEXT NOT NULL DEFAULT '',
      uf TEXT NOT NULL DEFAULT '',
      codigo_municipio_ibge TEXT NOT NULL DEFAULT '',
      pais TEXT NOT NULL DEFAULT 'BR',
      criado_em TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notas (
      id TEXT PRIMARY KEY,
      numero INTEGER,
      dps_numero INTEGER,
      dps_serie TEXT NOT NULL,
      id_dps TEXT,
      chave_acesso TEXT,
      codigo_verificacao TEXT,
      status TEXT NOT NULL,
      ambiente TEXT NOT NULL,
      data_emissao TEXT NOT NULL,
      competencia TEXT NOT NULL,
      valor_servicos REAL NOT NULL,
      valor_liquido REAL NOT NULL,
      tomador_nome TEXT NOT NULL,
      tomador_documento TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      motivo_cancelamento TEXT,
      data_cancelamento TEXT
    );
  `);

  // Migração segura caso o banco já exista sem colunas novas
  const cols = db.prepare('PRAGMA table_info(prestador)').all().map((c) => c.name);
  if (!cols.includes('ultimo_nsu')) {
    db.exec('ALTER TABLE prestador ADD COLUMN ultimo_nsu INTEGER NOT NULL DEFAULT 0;');
  }
  if (!cols.includes('ultimo_nsu_homologacao')) {
    db.exec('ALTER TABLE prestador ADD COLUMN ultimo_nsu_homologacao INTEGER NOT NULL DEFAULT 0;');
  }
  if (!cols.includes('proximo_numero_dps_homologacao')) {
    db.exec('ALTER TABLE prestador ADD COLUMN proximo_numero_dps_homologacao INTEGER NOT NULL DEFAULT 1;');
  }
  if (!cols.includes('logo_path')) {
    db.exec("ALTER TABLE prestador ADD COLUMN logo_path TEXT NOT NULL DEFAULT '';");
  }

  return db;
}

class PrestadorRepository {
  constructor(db, keyPath) {
    this.db = db;
    this.keyPath = keyPath || path.join(__dirname, '../../data/.master.key');
  }

  get() {
    const row = this.db.prepare('SELECT * FROM prestador WHERE id = 1').get();
    const isHom = row.ambiente !== 'producao';
    return {
      cnpj: row.cnpj,
      razaoSocial: row.razao_social,
      nomeFantasia: row.nome_fantasia,
      inscricaoMunicipal: row.inscricao_municipal,
      cep: row.cep,
      logradouro: row.logradouro,
      numero: row.numero,
      complemento: row.complemento,
      bairro: row.bairro,
      municipio: row.municipio,
      uf: row.uf,
      codigoMunicipioIbge: row.codigo_municipio_ibge,
      telefone: row.telefone,
      email: row.email,
      opSimpNac: row.op_simp_nac,
      regEspTrib: row.reg_esp_trib,
      aliquotaPadraoIss: row.aliquota_padrao_iss,
      pTotTribSN: row.p_tot_trib_sn,
      rpsSerie: row.rps_serie,
      proximoNumeroNota: row.proximo_numero_nota,
      proximoNumeroDps: isHom ? (row.proximo_numero_dps_homologacao || 1) : row.proximo_numero_dps,
      ultimoNsu: isHom ? (row.ultimo_nsu_homologacao || 0) : (row.ultimo_nsu || 0),
      ambiente: row.ambiente,
      certificadoPath: row.certificado_path,
      certificadoSenha: decryptSecret(row.certificado_senha, this.keyPath),
      logoPath: row.logo_path || ''
    };
  }

  save(data) {
    const atual = this.db.prepare('SELECT logo_path FROM prestador WHERE id = 1').get();
    const logoPath = data.logoPath !== undefined ? String(data.logoPath || '') : (atual?.logo_path || '');
    this.db.prepare(`
      UPDATE prestador SET
        cnpj = @cnpj,
        razao_social = @razaoSocial,
        nome_fantasia = @nomeFantasia,
        inscricao_municipal = @inscricaoMunicipal,
        cep = @cep,
        logradouro = @logradouro,
        numero = @numero,
        complemento = @complemento,
        bairro = @bairro,
        municipio = @municipio,
        uf = @uf,
        codigo_municipio_ibge = @codigoMunicipioIbge,
        telefone = @telefone,
        email = @email,
        op_simp_nac = @opSimpNac,
        reg_esp_trib = @regEspTrib,
        aliquota_padrao_iss = @aliquotaPadraoIss,
        p_tot_trib_sn = @pTotTribSN,
        rps_serie = @rpsSerie,
        ambiente = @ambiente,
        certificado_path = @certificadoPath,
        certificado_senha = @certificadoSenha,
        logo_path = @logoPath
      WHERE id = 1
    `).run({
      cnpj: data.cnpj,
      razaoSocial: data.razaoSocial,
      nomeFantasia: data.nomeFantasia,
      inscricaoMunicipal: data.inscricaoMunicipal,
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      municipio: data.municipio,
      uf: data.uf,
      codigoMunicipioIbge: data.codigoMunicipioIbge,
      telefone: data.telefone,
      email: data.email,
      opSimpNac: data.opSimpNac,
      regEspTrib: data.regEspTrib,
      aliquotaPadraoIss: data.aliquotaPadraoIss,
      pTotTribSN: data.pTotTribSN,
      rpsSerie: data.rpsSerie,
      ambiente: data.ambiente,
      certificadoPath: data.certificadoPath,
      certificadoSenha: encryptSecret(data.certificadoSenha, this.keyPath),
      logoPath
    });
    return this.get();
  }

  incrementCounters() {
    const atual = this.get();
    if (atual.ambiente === 'producao') {
      this.db.prepare(`
        UPDATE prestador
        SET proximo_numero_nota = proximo_numero_nota + 1,
            proximo_numero_dps = proximo_numero_dps + 1
        WHERE id = 1
      `).run();
    } else {
      this.db.prepare(`
        UPDATE prestador
        SET proximo_numero_dps_homologacao = proximo_numero_dps_homologacao + 1
        WHERE id = 1
      `).run();
    }
    return this.get();
  }

  updateSyncState({ ultimoNsu, proximoNumeroNota, proximoNumeroDps }) {
    const atual = this.get();
    if (atual.ambiente === 'producao') {
      this.db.prepare(`
        UPDATE prestador
        SET ultimo_nsu = @ultimoNsu,
            proximo_numero_nota = @proximoNumeroNota,
            proximo_numero_dps = @proximoNumeroDps
        WHERE id = 1
      `).run({ ultimoNsu, proximoNumeroNota, proximoNumeroDps });
    } else {
      this.db.prepare(`
        UPDATE prestador
        SET ultimo_nsu_homologacao = @ultimoNsu,
            proximo_numero_dps_homologacao = @proximoNumeroDps
        WHERE id = 1
      `).run({ ultimoNsu, proximoNumeroDps });
    }
    return this.get();
  }
}

class TomadorRepository {
  constructor(db) {
    this.db = db;
  }

  list() {
    return this.db.prepare('SELECT * FROM tomadores ORDER BY criado_em DESC').all().map((r) => ({
      id: r.id,
      tipoPessoa: r.tipo_pessoa,
      documento: r.documento,
      nome: r.nome,
      inscricaoMunicipal: r.inscricao_municipal,
      email: r.email,
      telefone: r.telefone,
      cep: r.cep,
      logradouro: r.logradouro,
      numero: r.numero,
      complemento: r.complemento,
      bairro: r.bairro,
      municipio: r.municipio,
      uf: r.uf,
      codigoMunicipioIbge: r.codigo_municipio_ibge,
      pais: r.pais,
      criadoEm: r.criado_em
    }));
  }

  create(t) {
    this.db.prepare(`
      INSERT INTO tomadores (
        id, tipo_pessoa, documento, nome, inscricao_municipal, email, telefone,
        cep, logradouro, numero, complemento, bairro, municipio, uf,
        codigo_municipio_ibge, pais, criado_em
      ) VALUES (
        @id, @tipoPessoa, @documento, @nome, @inscricaoMunicipal, @email, @telefone,
        @cep, @logradouro, @numero, @complemento, @bairro, @municipio, @uf,
        @codigoMunicipioIbge, @pais, @criadoEm
      )
    `).run(t);
    return t;
  }

  update(id, t) {
    this.db.prepare(`
      UPDATE tomadores SET
        tipo_pessoa = @tipoPessoa,
        documento = @documento,
        nome = @nome,
        inscricao_municipal = @inscricaoMunicipal,
        email = @email,
        telefone = @telefone,
        cep = @cep,
        logradouro = @logradouro,
        numero = @numero,
        complemento = @complemento,
        bairro = @bairro,
        municipio = @municipio,
        uf = @uf,
        codigo_municipio_ibge = @codigoMunicipioIbge,
        pais = @pais
      WHERE id = @id
    `).run({ ...t, id });
    return this.list().find((x) => x.id === id) || null;
  }

  remove(id) {
    this.db.prepare('DELETE FROM tomadores WHERE id = ?').run(id);
  }
}

class NotaRepository {
  constructor(db) {
    this.db = db;
  }

  list(ambiente = null) {
    if (ambiente) {
      return this.db.prepare('SELECT payload_json FROM notas WHERE ambiente = ? ORDER BY data_emissao DESC').all(ambiente)
        .map((r) => JSON.parse(r.payload_json));
    }
    return this.db.prepare('SELECT payload_json FROM notas ORDER BY data_emissao DESC').all()
      .map((r) => JSON.parse(r.payload_json));
  }

  findById(id) {
    const row = this.db.prepare('SELECT payload_json FROM notas WHERE id = ?').get(id);
    return row ? JSON.parse(row.payload_json) : null;
  }

  findByChaveAcesso(chave, ambiente = null) {
    if (!chave) return null;
    const row = ambiente
      ? this.db.prepare('SELECT payload_json FROM notas WHERE chave_acesso = ? AND ambiente = ?').get(chave, ambiente)
      : this.db.prepare('SELECT payload_json FROM notas WHERE chave_acesso = ?').get(chave);
    return row ? JSON.parse(row.payload_json) : null;
  }

  save(nota) {
    this.db.prepare(`
      INSERT INTO notas (
        id, numero, dps_numero, dps_serie, id_dps, chave_acesso, codigo_verificacao,
        status, ambiente, data_emissao, competencia, valor_servicos, valor_liquido,
        tomador_nome, tomador_documento, payload_json
      ) VALUES (
        @id, @numero, @dpsNumero, @dpsSerie, @idDps, @chaveAcesso, @codigoVerificacao,
        @status, @ambiente, @dataEmissao, @competencia, @valorServicos, @valorLiquido,
        @tomadorNome, @tomadorDocumento, @payloadJson
      )
    `).run({
      id: nota.id,
      numero: nota.numero,
      dpsNumero: nota.dpsNumero,
      dpsSerie: nota.dpsSerie,
      idDps: nota.idDps || null,
      chaveAcesso: nota.chaveAcesso || null,
      codigoVerificacao: nota.codigoVerificacao || null,
      status: nota.status,
      ambiente: nota.ambiente,
      dataEmissao: nota.dataEmissao,
      competencia: nota.competencia,
      valorServicos: nota.tributos.valorServicos,
      valorLiquido: nota.tributos.valorLiquido,
      tomadorNome: nota.tomador.nome,
      tomadorDocumento: nota.tomador.documento,
      payloadJson: JSON.stringify(nota)
    });
    return nota;
  }

  updateNotaPayload(nota) {
    this.db.prepare(`
      UPDATE notas
      SET valor_servicos = @valorServicos,
          valor_liquido = @valorLiquido,
          payload_json = @payloadJson
      WHERE id = @id
    `).run({
      id: nota.id,
      valorServicos: nota.tributos.valorServicos,
      valorLiquido: nota.tributos.valorLiquido,
      payloadJson: JSON.stringify(nota)
    });
  }

  markCanceled(id, motivo, dataCancelamento) {
    const nota = this.findById(id);
    if (!nota) return null;
    nota.status = 'cancelada';
    nota.motivoCancelamento = motivo;
    nota.dataCancelamento = dataCancelamento;

    this.db.prepare(`
      UPDATE notas
      SET status = 'cancelada',
          motivo_cancelamento = ?,
          data_cancelamento = ?,
          payload_json = ?
      WHERE id = ?
    `).run(motivo, dataCancelamento, JSON.stringify(nota), id);
    return nota;
  }
}

class TemplateRepository {
  constructor(db) {
    this.db = db;
  }

  list() {
    return this.db.prepare('SELECT * FROM templates ORDER BY criado_em DESC').all().map((r) => ({
      id: r.id,
      nome: r.nome,
      tomadorId: r.tomador_id || '',
      cTribNac: r.c_trib_nac,
      cNBS: r.c_nbs || '',
      codigoInterno: r.codigo_interno || '',
      discriminacao: r.discriminacao,
      infoComplementar: r.info_complementar || '',
      valorPadrao: r.valor_padrao || 0,
      aliquotaIss: r.aliquota_iss ?? 2.0,
      criadoEm: r.criado_em
    }));
  }

  create(t) {
    this.db.prepare(`
      INSERT INTO templates (
        id, nome, tomador_id, c_trib_nac, c_nbs, codigo_interno,
        discriminacao, info_complementar, valor_padrao, aliquota_iss, criado_em
      ) VALUES (
        @id, @nome, @tomadorId, @cTribNac, @cNBS, @codigoInterno,
        @discriminacao, @infoComplementar, @valorPadrao, @aliquotaIss, @criadoEm
      )
    `).run(t);
    return t;
  }

  update(id, t) {
    this.db.prepare(`
      UPDATE templates SET
        nome = @nome,
        tomador_id = @tomadorId,
        c_trib_nac = @cTribNac,
        c_nbs = @cNBS,
        codigo_interno = @codigoInterno,
        discriminacao = @discriminacao,
        info_complementar = @infoComplementar,
        valor_padrao = @valorPadrao,
        aliquota_iss = @aliquotaIss
      WHERE id = @id
    `).run({ ...t, id });
    return this.list().find((x) => x.id === id) || null;
  }

  remove(id) {
    this.db.prepare('DELETE FROM templates WHERE id = ?').run(id);
  }
}

class LogRepository {
  constructor(db) {
    this.db = db;
  }

  save(entry) {
    this.db.prepare(`
      INSERT INTO transmissoes_log (
        id, criado_em, tipo, ambiente, id_dps, status_http, chave_acesso, resposta, xml_enviado
      ) VALUES (
        @id, @criadoEm, @tipo, @ambiente, @idDps, @statusHttp, @chaveAcesso, @resposta, @xmlEnviado
      )
    `).run(entry);
    return entry;
  }

  list(limit = 50) {
    return this.db.prepare('SELECT * FROM transmissoes_log ORDER BY criado_em DESC LIMIT ?').all(limit);
  }
}

module.exports = {
  initDatabase,
  PrestadorRepository,
  TomadorRepository,
  NotaRepository,
  TemplateRepository,
  LogRepository
};
