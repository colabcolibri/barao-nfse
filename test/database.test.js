'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  initDatabase,
  PrestadorRepository,
  TomadorRepository,
  NotaRepository
} = require('../src/db/database');

test('SQLite nativo (node:sqlite) persiste prestador, tomadores e notas', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'barao-db-'));
  const db = initDatabase(path.join(tmpDir, 'test.sqlite'));

  try {
    const prestadorRepo = new PrestadorRepository(db, path.join(tmpDir, '.master.key'));
    const tomadorRepo = new TomadorRepository(db);
    const notaRepo = new NotaRepository(db);

    const p0 = prestadorRepo.get();
    assert.equal(p0.codigoMunicipioIbge, '3549904');

    const p1 = prestadorRepo.save({
      ...p0,
      cnpj: '11222333000181',
      razaoSocial: 'Barão Tech Ltda',
      certificadoSenha: 'segredo-super-forte'
    });
    assert.equal(p1.razaoSocial, 'Barão Tech Ltda');
    assert.equal(p1.certificadoSenha, 'segredo-super-forte');

    const rawSenha = db.prepare('SELECT certificado_senha FROM prestador WHERE id = 1').get().certificado_senha;
    assert.match(rawSenha, /^enc:v1:/);

    tomadorRepo.create({
      id: 't-1',
      tipoPessoa: 'BR',
      documento: '52998224725',
      nome: 'Cliente SJC',
      inscricaoMunicipal: '',
      email: 'c@sjc.com',
      telefone: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      municipio: 'São José dos Campos',
      uf: 'SP',
      codigoMunicipioIbge: '3549904',
      pais: 'BR',
      criadoEm: '2026-11-27T00:00:00.000Z'
    });
    assert.equal(tomadorRepo.list().length, 1);

    notaRepo.save({
      id: 'n-1',
      numero: 1,
      dpsNumero: 1,
      dpsSerie: '1',
      idDps: 'DPS123',
      chaveAcesso: null,
      codigoVerificacao: 'ABCD1234',
      status: 'emitida_local',
      ambiente: 'homologacao',
      dataEmissao: '2026-11-27T00:00:00.000Z',
      competencia: '2026-11-27',
      tomador: { nome: 'Cliente SJC', documento: '52998224725' },
      tributos: { valorServicos: 1000, valorLiquido: 1000 }
    });
    assert.equal(notaRepo.list().length, 1);

    const cancelada = notaRepo.markCanceled('n-1', 'Erro', '2026-11-27T01:00:00.000Z');
    assert.equal(cancelada.status, 'cancelada');
  } finally {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
