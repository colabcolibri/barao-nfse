'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const https = require('node:https');
const zlib = require('node:zlib');
const { ENDPOINTS_NACIONAL } = require('../config/constants');
const { apenasDigitos } = require('../domain/validators');
const { lerCertificadoA1 } = require('./certificateService');
const { assinarXmlNacional } = require('./xmlSigner');
const { gerarXmlDps } = require('./dpsXmlBuilder');

function gravarLogTransmissao(evento, xmlAssinado) {
  try {
    const logDir = path.resolve(__dirname, '../../data/logs');
    fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
    fs.appendFileSync(
      path.join(logDir, 'sefin-transmissoes.jsonl'),
      JSON.stringify({ timestamp: new Date().toISOString(), ...evento }) + '\n',
      { encoding: 'utf8', mode: 0o600 }
    );
    if (xmlAssinado) {
      fs.writeFileSync(path.join(logDir, 'ultima-dps.xml'), xmlAssinado, { encoding: 'utf8', mode: 0o600 });
    }
  } catch { /* não bloqueia emissão se falhar log */ }
}

function mTlsRequest({ url, method = 'GET', certPem, keyPem, bodyJson }) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = bodyJson ? JSON.stringify(bodyJson) : null;

    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname + parsed.search,
        method,
        agent: false,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.2',
        cert: certPem,
        key: keyPem,
        headers: {
          Connection: 'close',
          'User-Agent': 'BaraoNFSe/2.1',
          Accept: method === 'GET' ? 'application/pdf, application/json' : 'application/json',
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {})
        },
        timeout: 30000
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({ status: res.statusCode, headers: res.headers, buffer });
        });
      }
    );

    req.on('timeout', () => req.destroy(new Error('Tempo limite excedido ao comunicar com a Sefin Nacional.')));
    req.on('error', (err) => reject(new Error(`Falha de rede/TLS com Sefin Nacional: ${err.message}`)));
    if (payload) req.write(payload);
    req.end();
  });
}

function parseErroSefin(buffer, status) {
  const raw = buffer.toString('utf8');
  try {
    const json = JSON.parse(raw);
    if (Array.isArray(json.erros) && json.erros.length) {
      return json.erros
        .map((e) => `${e.Codigo || e.codigo || ''}: ${e.Descricao || e.descricao || JSON.stringify(e)}${e.Complemento ? ` (${e.Complemento})` : ''}`)
        .join(' | ');
    }
    return json.mensagem || json.message || raw;
  } catch {
    return raw || `HTTP ${status}`;
  }
}

/**
 * Cliente para emissão e consulta de NFS-e na Sefin Nacional / ADN.
 */
class SefinNacionalClient {
  constructor({ logRepo } = {}) {
    this.logRepo = logRepo || null;
  }

  _registrarLog(evento, xmlAssinado) {
    gravarLogTransmissao(evento, xmlAssinado);
    if (this.logRepo) {
      try {
        this.logRepo.save({
          id: crypto.randomUUID(),
          criadoEm: new Date().toISOString(),
          tipo: evento.tipo || 'emitir',
          ambiente: evento.ambiente || 'homologacao',
          idDps: evento.idDps || null,
          statusHttp: evento.status || null,
          chaveAcesso: evento.chaveAcesso || null,
          resposta: evento.resposta || '',
          xmlEnviado: xmlAssinado || null
        });
      } catch { /* não bloqueia fluxo */ }
    }
  }

  async emitir(nota, prestador) {
    const cert = lerCertificadoA1(prestador.certificadoPath, prestador.certificadoSenha);
    const { idDps, xml } = gerarXmlDps(nota, prestador);
    const xmlAssinado = assinarXmlNacional(xml, 'infDPS', cert.keyPem, cert.certBase64);
    const dpsXmlGZipB64 = zlib.gzipSync(Buffer.from(xmlAssinado, 'utf8')).toString('base64');

    const base = ENDPOINTS_NACIONAL[prestador.ambiente === 'producao' ? 'producao' : 'homologacao'].sefin;
    const res = await mTlsRequest({
      url: `${base}/nfse`,
      method: 'POST',
      certPem: cert.certPem,
      keyPem: cert.keyPem,
      bodyJson: { dpsXmlGZipB64 }
    });

    const respText = res.buffer.toString('utf8');
    let parsedJson = null;
    try { parsedJson = JSON.parse(respText); } catch { /* ignore */ }

    this._registrarLog({
      tipo: 'emitir',
      ambiente: prestador.ambiente,
      idDps,
      status: res.status,
      chaveAcesso: parsedJson?.chaveAcesso || null,
      resposta: respText
    }, xmlAssinado);

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Sefin Nacional rejeitou a DPS: ${parseErroSefin(res.buffer, res.status)}`);
    }

    const json = parsedJson || JSON.parse(respText);
    const nfseXml = json.nfseXmlGZipB64
      ? zlib.gunzipSync(Buffer.from(json.nfseXmlGZipB64, 'base64')).toString('utf8')
      : null;

    return {
      idDps: json.idDps || idDps,
      chaveAcesso: json.chaveAcesso,
      nfseXml,
      dpsXmlAssinado: xmlAssinado
    };
  }

  async baixarDanfsePdf(chaveAcesso, prestador) {
    const cert = lerCertificadoA1(prestador.certificadoPath, prestador.certificadoSenha);
    const base = ENDPOINTS_NACIONAL[prestador.ambiente === 'producao' ? 'producao' : 'homologacao'].adn;
    const url = `${base}/danfse/${encodeURIComponent(chaveAcesso)}`;

    let lastRes;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      if (tentativa > 0) {
        await new Promise((r) => setTimeout(r, 1500));
      }
      lastRes = await mTlsRequest({
        url,
        method: 'GET',
        certPem: cert.certPem,
        keyPem: cert.keyPem
      });
      if (lastRes.status >= 200 && lastRes.status < 300) {
        return lastRes.buffer;
      }
      if (lastRes.status !== 503 && lastRes.status !== 404) {
        break;
      }
    }

    if (lastRes.status === 503) {
      throw new Error('O servidor do Portal Nacional (ADN) retornou 503 (indisponível no momento). Suas notas já estão emitidas e podem ser baixadas no portal nfse.gov.br ou impressas pelo resumo local.');
    }
    throw new Error(`Não foi possível baixar o DANFSE oficial (${lastRes.status}).`);
  }

  async consultarDfePorNsu(nsu, prestador) {
    const cert = lerCertificadoA1(prestador.certificadoPath, prestador.certificadoSenha);
    const base = ENDPOINTS_NACIONAL[prestador.ambiente === 'producao' ? 'producao' : 'homologacao'].adn;
    const cnpj = apenasDigitos(prestador.cnpj);
    const qs = new URLSearchParams({ lote: 'true' });
    if (cnpj.length === 14) qs.set('cnpjConsulta', cnpj);

    const res = await mTlsRequest({
      url: `${base}/contribuintes/DFe/${Number(nsu) || 0}?${qs.toString()}`,
      method: 'GET',
      certPem: cert.certPem,
      keyPem: cert.keyPem
    });
    if (res.status === 404) {
      return { StatusProcessamento: 'NENHUM_DOCUMENTO_LOCALIZADO', LoteDFe: [] };
    }
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Erro ao consultar ADN/DFe (${res.status}): ${parseErroSefin(res.buffer, res.status)}`);
    }
    return JSON.parse(res.buffer.toString('utf8'));
  }
}

module.exports = { SefinNacionalClient };
