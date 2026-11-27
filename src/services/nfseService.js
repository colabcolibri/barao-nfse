'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { validarCpfCnpj, apenasDigitos } = require('../domain/validators');
const { calcularTributos } = require('../domain/taxCalculator');
const { gerarXmlDps } = require('../infra/dpsXmlBuilder');
const { gerarDanfsePdfBuffer } = require('../infra/danfsePdfGenerator');

function extrairTag(xml, tagName) {
  const m = String(xml || '').match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return m ? m[1].trim() : '';
}

function extrairBloco(xml, blockTag) {
  const m = String(xml || '').match(new RegExp(`<${blockTag}[^>]*>([\\s\\S]*?)<\\/${blockTag}>`, 'i'));
  return m ? m[1] : '';
}

class NfseService {
  constructor({ prestadorRepo, tomadorRepo, notaRepo, sefinClient, xmlDir }) {
    this.prestadorRepo = prestadorRepo;
    this.tomadorRepo = tomadorRepo;
    this.notaRepo = notaRepo;
    this.sefinClient = sefinClient;
    this.xmlDir = xmlDir;
    fs.mkdirSync(this.xmlDir, { recursive: true, mode: 0o700 });
  }

  emitirOuSalvarRascunho(input) {
    const prestador = this.prestadorRepo.get();
    const isRascunho = input.status === 'rascunho';
    const modoNacional = !isRascunho && input.modo === 'nacional';

    if (!isRascunho) {
      if (!prestador.cnpj || !prestador.razaoSocial) {
        throw new Error('Configure os dados do Prestador (CNPJ e Razão Social) antes de emitir.');
      }
      if (!input.tomador?.nome) {
        throw new Error('Informe o Nome/Razão Social do Tomador.');
      }
      if (input.tomador.tipoPessoa !== 'EXT' && !validarCpfCnpj(input.tomador.documento)) {
        throw new Error('CPF/CNPJ do Tomador inválido.');
      }
      if (!input.servico?.discriminacao || Number(input.tributos?.valorServicos) <= 0) {
        throw new Error('Informe a discriminação do serviço e um valor maior que zero.');
      }
      if (modoNacional && !prestador.certificadoPath) {
        throw new Error('Configure o caminho do Certificado A1 (.pfx) na aba Prestador.');
      }
    }

    const tributos = calcularTributos(input.tributos);
    const numero = isRascunho ? null : prestador.proximoNumeroNota;
    const dpsNumero = isRascunho ? null : prestador.proximoNumeroDps;
    const codigoVerificacao = isRascunho ? null : crypto.randomBytes(4).toString('hex').toUpperCase();
    const dataEmissao = new Date().toISOString();

    const nota = {
      id: crypto.randomUUID(),
      direcao: 'emitida',
      numero,
      dpsNumero,
      dpsSerie: prestador.rpsSerie || '1',
      idDps: null,
      chaveAcesso: null,
      codigoVerificacao,
      status: isRascunho ? 'rascunho' : (modoNacional ? 'emitida_nacional' : 'emitida_local'),
      ambiente: prestador.ambiente,
      dataEmissao,
      competencia: input.competencia || dataEmissao.slice(0, 10),
      prestadorSnapshot: { ...prestador, certificadoSenha: '' },
      tomador: {
        tipoPessoa: input.tomador?.tipoPessoa === 'EXT' ? 'EXT' : 'BR',
        documento: String(input.tomador?.documento || '').trim(),
        nome: String(input.tomador?.nome || '').trim(),
        inscricaoMunicipal: String(input.tomador?.inscricaoMunicipal || '').trim(),
        email: String(input.tomador?.email || '').trim(),
        telefone: String(input.tomador?.telefone || '').trim(),
        cep: String(input.tomador?.cep || '').trim(),
        logradouro: String(input.tomador?.logradouro || '').trim(),
        numero: String(input.tomador?.numero || '').trim(),
        complemento: String(input.tomador?.complemento || '').trim(),
        bairro: String(input.tomador?.bairro || '').trim(),
        municipio: String(input.tomador?.municipio || '').trim(),
        uf: String(input.tomador?.uf || '').trim().toUpperCase().slice(0, 2),
        codigoMunicipioIbge: String(input.tomador?.codigoMunicipioIbge || '').trim(),
        pais: String(input.tomador?.pais || 'BR').trim()
      },
      servico: {
        cTribNac: String(input.servico?.cTribNac || '010101'),
        cNBS: String(input.servico?.cNBS || ''),
        codigoInterno: String(input.servico?.codigoInterno || '').trim(),
        codigoMunicipioPrestacao: String(input.servico?.codigoMunicipioPrestacao || prestador.codigoMunicipioIbge || '3549904').trim(),
        discriminacao: String(input.servico?.discriminacao || '').trim(),
        infoComplementar: String(input.servico?.infoComplementar || '').trim()
      },
      tributos
    };

    return this._finalizarEmissao(nota, prestador, { isRascunho, modoNacional });
  }

  async _finalizarEmissao(nota, prestador, { isRascunho, modoNacional }) {
    if (modoNacional) {
      const ret = await this.sefinClient.emitir(nota, prestador);
      nota.idDps = ret.idDps;
      nota.chaveAcesso = ret.chaveAcesso || null;
      if (ret.nfseXml) {
        const numOficial = Number(extrairTag(ret.nfseXml, 'nNFSe'));
        if (numOficial) nota.numero = numOficial;
      }
      const xmlFinal = ret.nfseXml || ret.dpsXmlAssinado;
      fs.writeFileSync(path.join(this.xmlDir, `nfse-${nota.numero}.xml`), xmlFinal, { encoding: 'utf8', mode: 0o600 });
    } else if (!isRascunho) {
      const { idDps, xml } = gerarXmlDps(nota, prestador);
      nota.idDps = idDps;
      fs.writeFileSync(path.join(this.xmlDir, `nfse-${nota.numero}.xml`), xml, 'utf8');
    }

    const prestadorAtualizado = isRascunho ? prestador : this.prestadorRepo.incrementCounters();
    this.notaRepo.save(nota);
    return { nota, prestador: prestadorAtualizado };
  }

  obterXml(id) {
    const nota = this.notaRepo.findById(id);
    if (!nota || !nota.numero) return null;
    const xmlPath = path.join(this.xmlDir, `nfse-${nota.numero}.xml`);
    if (fs.existsSync(xmlPath)) {
      return { filename: `nfse-${nota.numero}.xml`, xml: fs.readFileSync(xmlPath, 'utf8') };
    }
    const { xml } = gerarXmlDps(nota, nota.prestadorSnapshot || this.prestadorRepo.get());
    return { filename: `nfse-${nota.numero}.xml`, xml };
  }

  async obterDanfsePdf(id) {
    const nota = this.notaRepo.findById(id);
    if (!nota) {
      throw new Error('Nota não encontrada.');
    }
    const prestador = this.prestadorRepo.get();
    return gerarDanfsePdfBuffer(nota, prestador);
  }

  parseXmlNfse(xml, prestador, chave = null, existingId = null) {
    const meuCnpj = apenasDigitos(prestador.cnpj);
    const numero = Number(extrairTag(xml, 'nNFSe')) || null;
    const dpsNumero = Number(extrairTag(xml, 'nDPS')) || null;

    const emitXml = extrairBloco(xml, 'emit') || extrairBloco(xml, 'prest');
    const prestDoc = apenasDigitos(extrairTag(emitXml, 'CNPJ') || extrairTag(emitXml, 'CPF'));
    const prestNome = extrairTag(emitXml, 'xNome') || prestador.razaoSocial;
    const direcao = !prestDoc || prestDoc === meuCnpj ? 'emitida' : 'recebida';

    const tomaXml = extrairBloco(xml, 'toma');
    const tomaDoc = extrairTag(tomaXml, 'CNPJ') || extrairTag(tomaXml, 'CPF') || extrairTag(tomaXml, 'NIF');
    const tomaNome = extrairTag(tomaXml, 'xNome') || 'Tomador';

    const valorLiq = Number(extrairTag(xml, 'vLiq')) || 0;
    const valorServ =
      Number(extrairTag(xml, 'vServ')) ||
      Number(extrairTag(xml, 'vBC')) ||
      Number(extrairTag(xml, 'ValorServicos')) ||
      valorLiq;

    const dhEmi = extrairTag(xml, 'dhEmi') || new Date().toISOString();
    const dCompet = extrairTag(xml, 'dCompet') || dhEmi.slice(0, 10);

    return {
      id: existingId || crypto.randomUUID(),
      direcao,
      numero,
      dpsNumero,
      dpsSerie: extrairTag(xml, 'serie') || prestador.rpsSerie || '1',
      idDps: null,
      chaveAcesso: chave,
      codigoVerificacao: null,
      status: 'emitida_nacional',
      ambiente: prestador.ambiente,
      dataEmissao: dhEmi,
      competencia: dCompet,
      prestadorSnapshot: {
        ...prestador,
        cnpj: prestDoc || prestador.cnpj,
        razaoSocial: prestNome,
        certificadoSenha: ''
      },
      tomador: {
        tipoPessoa: 'BR',
        documento: tomaDoc,
        nome: tomaNome,
        email: extrairTag(tomaXml, 'email')
      },
      servico: {
        cTribNac: extrairTag(xml, 'cTribNac') || '010101',
        cNBS: extrairTag(xml, 'cNBS'),
        discriminacao: extrairTag(xml, 'xDescServ') || 'Serviço sincronizado do Portal Nacional'
      },
      tributos: {
        valorServicos: valorServ,
        descontoIncondicionado: 0,
        baseCalculo: valorServ,
        aliquotaIss: Number(extrairTag(xml, 'pAliq')) || prestador.aliquotaPadraoIss || 2,
        valorIss: Number(extrairTag(xml, 'vISSQN')) || 0,
        issRetido: false,
        totalRetencoesFederais: 0,
        valorLiquido: valorLiq || valorServ
      }
    };
  }

  async sincronizarComNacional(desdeInicio = false) {
    const prestador = this.prestadorRepo.get();
    if (!prestador.certificadoPath) {
      throw new Error('Configure o Certificado Digital A1 antes de sincronizar com o Portal Nacional.');
    }

    let nsuAtual = desdeInicio ? 0 : (prestador.ultimoNsu || 0);
    let importadas = 0;

    // Calcula maior número apenas das notas EMITIDAS por este CNPJ no ambiente atual
    const notasExistentes = this.notaRepo
      .list(prestador.ambiente)
      .filter((n) => (n.direcao || 'emitida') === 'emitida');
    let maiorNotaEmitida = notasExistentes.reduce((m, n) => Math.max(m, Number(n.numero) || 0), 0);
    let maiorDpsEmitida = notasExistentes.reduce((m, n) => Math.max(m, Number(n.dpsNumero) || 0), 0);

    for (let i = 0; i < 20; i++) {
      const lote = await this.sefinClient.consultarDfePorNsu(nsuAtual, prestador);
      const docs = Array.isArray(lote.LoteDFe) ? lote.LoteDFe : [];
      if (!docs.length) break;

      for (const item of docs) {
        const nsuItem = Number(item.NSU) || nsuAtual;
        if (nsuItem > nsuAtual) nsuAtual = nsuItem;

        const chave = item.ChaveAcesso || null;
        if (chave && this.notaRepo.findByChaveAcesso(chave, prestador.ambiente)) continue;
        if (!item.ArquivoXml) continue;

        const xml = zlib.gunzipSync(Buffer.from(item.ArquivoXml, 'base64')).toString('utf8');
        const nota = this.parseXmlNfse(xml, prestador, chave);

        if (nota.direcao === 'emitida') {
          if (nota.numero && nota.numero > maiorNotaEmitida) maiorNotaEmitida = nota.numero;
          if (nota.dpsNumero && nota.dpsNumero > maiorDpsEmitida) maiorDpsEmitida = nota.dpsNumero;
        }

        if (nota.numero) {
          fs.writeFileSync(path.join(this.xmlDir, `nfse-${nota.numero}.xml`), xml, { encoding: 'utf8', mode: 0o600 });
        }
        this.notaRepo.save(nota);
        importadas += 1;
      }

      if (lote.StatusProcessamento === 'NENHUM_DOCUMENTO_LOCALIZADO') break;
    }

    const prestadorAtualizado = this.prestadorRepo.updateSyncState({
      ultimoNsu: nsuAtual,
      proximoNumeroNota: maiorNotaEmitida + 1,
      proximoNumeroDps: maiorDpsEmitida + 1
    });

    return { importadas, ultimoNsu: nsuAtual, prestador: prestadorAtualizado };
  }
}

module.exports = { NfseService };
