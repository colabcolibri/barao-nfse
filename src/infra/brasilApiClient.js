'use strict';

const { apenasDigitos, validarCpfCnpj } = require('../domain/validators');

const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'BaraoNFSe/2.1 (+http://127.0.0.1)'
};

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function fromBrasilApi(cnpj) {
  const d = await fetchJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  return {
    documento: cnpj,
    nome: d.razao_social || '',
    nomeFantasia: d.nome_fantasia || d.razao_social || '',
    email: d.email || '',
    telefone: apenasDigitos(d.ddd_telefone_1 || ''),
    cep: apenasDigitos(d.cep || ''),
    logradouro: [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(' ').trim(),
    numero: d.numero || '',
    complemento: d.complemento || '',
    bairro: d.bairro || '',
    municipio: d.municipio || '',
    uf: d.uf || '',
    codigoMunicipioIbge: d.codigo_municipio_ibge ? String(d.codigo_municipio_ibge) : ''
  };
}

async function fromCnpjWs(cnpj) {
  const d = await fetchJson(`https://publica.cnpj.ws/cnpj/${cnpj}`);
  const est = d.estabelecimento || {};
  return {
    documento: cnpj,
    nome: d.razao_social || '',
    nomeFantasia: est.nome_fantasia || d.razao_social || '',
    email: est.email || '',
    telefone: apenasDigitos(`${est.ddd1 || ''}${est.telefone1 || ''}`),
    cep: apenasDigitos(est.cep || ''),
    logradouro: [est.tipo_logradouro, est.logradouro].filter(Boolean).join(' ').trim(),
    numero: est.numero || '',
    complemento: est.complemento || '',
    bairro: est.bairro || '',
    municipio: est.cidade?.nome || '',
    uf: est.estado?.sigla || '',
    codigoMunicipioIbge: est.cidade?.ibge_id ? String(est.cidade.ibge_id) : ''
  };
}

async function fromReceitaWs(cnpj) {
  const d = await fetchJson(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
  if (d.status === 'ERROR') {
    throw new Error(d.message || 'CNPJ não encontrado.');
  }
  return {
    documento: cnpj,
    nome: d.nome || '',
    nomeFantasia: d.fantasia || d.nome || '',
    email: d.email || '',
    telefone: apenasDigitos(d.telefone || ''),
    cep: apenasDigitos(d.cep || ''),
    logradouro: d.logradouro || '',
    numero: d.numero || '',
    complemento: d.complemento || '',
    bairro: d.bairro || '',
    municipio: d.municipio || '',
    uf: d.uf || '',
    codigoMunicipioIbge: ''
  };
}

/**
 * Consulta CNPJ com fallback automático entre provedores públicos (BrasilAPI -> CNPJ.ws -> ReceitaWS).
 */
async function consultarCnpjBrasilApi(cnpjInput) {
  const cnpj = apenasDigitos(cnpjInput);
  if (cnpj.length !== 14 || !validarCpfCnpj(cnpj)) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }

  const providers = [fromBrasilApi, fromCnpjWs, fromReceitaWs];
  let lastErr;

  for (const fn of providers) {
    try {
      return await fn(cnpj);
    } catch (err) {
      lastErr = err;
      if (err.status === 404) {
        throw new Error('CNPJ não encontrado na Receita Federal.');
      }
    }
  }

  throw new Error(`Não foi possível consultar o CNPJ (${lastErr?.message || 'erro de rede'}).`);
}

module.exports = { consultarCnpjBrasilApi };
