'use strict';

const { apenasDigitos } = require('../domain/validators');

function escXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tag(name, value) {
  if (value === undefined || value === null || value === '') return '';
  return `<${name}>${escXml(value)}</${name}>`;
}

function tagNum(name, value, decimals = 2) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  return `<${name}>${n.toFixed(decimals)}</${name}>`;
}

/**
 * Monta o Id único da DPS no padrão nacional ("DPS" + 42 dígitos).
 */
function montarIdDps({ codigoMunicipioIbge, documentoPrestador, serie, numeroDps }) {
  const cMun = apenasDigitos(codigoMunicipioIbge || '3549904').padStart(7, '0').slice(0, 7);
  const doc = apenasDigitos(documentoPrestador);
  const tpInsc = doc.length === 14 ? '2' : '1';
  const inscFed = doc.padStart(14, '0').slice(0, 14);
  const serieNum = (apenasDigitos(serie) || '1').padStart(5, '0').slice(-5);
  const nDps = String(numeroDps || 1).padStart(15, '0').slice(-15);
  return `DPS${cMun}${tpInsc}${inscFed}${serieNum}${nDps}`;
}

function formatarDataHoraBrasilia(date = new Date()) {
  const br = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return br.toISOString().slice(0, 19) + '-03:00';
}

function buildEnderecoXml(pessoa) {
  const cMun = apenasDigitos(pessoa.codigoMunicipioIbge);
  const cep = apenasDigitos(pessoa.cep);
  const temEndereco = pessoa.logradouro || cep || cMun;
  if (!temEndereco) return '';

  const endNac = (cMun || cep)
    ? `<endNac>${tag('cMun', cMun.padStart(7, '0'))}${tag('CEP', cep.padStart(8, '0'))}</endNac>`
    : '';

  return `<end>${endNac}${tag('xLgr', pessoa.logradouro)}${tag('nro', pessoa.numero || 'S/N')}${tag('xCpl', pessoa.complemento)}${tag('xBairro', pessoa.bairro || 'Centro')}</end>`;
}

/**
 * Gera o XML completo da DPS (Declaração de Prestação de Serviços) conforme leiaute nacional (Sefin Nacional).
 */
function gerarXmlDps(nota, prestador) {
  const tpAmb = prestador.ambiente === 'producao' ? '1' : '2';
  const cLocEmi = apenasDigitos(prestador.codigoMunicipioIbge || '3549904').padStart(7, '0');
  const docPrest = apenasDigitos(prestador.cnpj);
  const serieNum = apenasDigitos(nota.dpsSerie) || '1';
  const nDPS = String(nota.dpsNumero || nota.numero || 1);

  const idDps = montarIdDps({
    codigoMunicipioIbge: cLocEmi,
    documentoPrestador: docPrest,
    serie: serieNum,
    numeroDps: nDPS
  });

  // Prestador
  const prestDocTag = docPrest.length === 14 ? tag('CNPJ', docPrest) : tag('CPF', docPrest);
  const opSimpNac = prestador.opSimpNac || '3';
  const regApTribSNTag = opSimpNac === '3' ? tag('regApTribSN', '1') : '';
  const prestXml =
    '<prest>' +
      prestDocTag +
      tag('IM', apenasDigitos(prestador.inscricaoMunicipal)) +
      tag('fone', apenasDigitos(prestador.telefone)) +
      tag('email', prestador.email) +
      `<regTrib>${tag('opSimpNac', opSimpNac)}${regApTribSNTag}${tag('regEspTrib', prestador.regEspTrib || '0')}</regTrib>` +
    '</prest>';

  // Tomador (Brasil ou Exterior)
  const t = nota.tomador;
  const docToma = apenasDigitos(t.documento);
  let tomaDocTag = '';
  if (t.tipoPessoa === 'EXT') {
    tomaDocTag = t.documento ? tag('NIF', t.documento) : '<cNaoNIF>1</cNaoNIF>';
  } else {
    tomaDocTag = docToma.length === 14 ? tag('CNPJ', docToma) : tag('CPF', docToma);
  }
  const tomaXml =
    '<toma>' +
      tomaDocTag +
      tag('IM', apenasDigitos(t.inscricaoMunicipal)) +
      tag('xNome', t.nome) +
      buildEnderecoXml(t) +
      tag('fone', apenasDigitos(t.telefone)) +
      tag('email', t.email) +
    '</toma>';

  // Serviço e Local da Prestação
  const s = nota.servico;
  const cLocPrest = apenasDigitos(s.codigoMunicipioPrestacao || cLocEmi).padStart(7, '0');
  const rawTrib = apenasDigitos(s.cTribNac || '010101');
  const cTribNac = rawTrib.length === 4 ? `${rawTrib}01` : rawTrib.padEnd(6, '0').slice(0, 6);
  const cNBS = apenasDigitos(s.cNBS);

  const servXml =
    '<serv>' +
      `<locPrest><cLocPrestacao>${cLocPrest}</cLocPrestacao></locPrest>` +
      '<cServ>' +
        tag('cTribNac', cTribNac) +
        tag('xDescServ', s.discriminacao) +
      '</cServ>' +
      (s.infoComplementar ? `<infoCompl>${tag('xInfComp', s.infoComplementar)}</infoCompl>` : '') +
    '</serv>';

  // Valores e Tributos
  const tr = nota.tributos;
  const descGroup = (tr.descontoIncondicionado > 0 || tr.descontoCondicionado > 0)
    ? `<vDescCondIncond>${tagNum('vDescIncond', tr.descontoIncondicionado)}${tagNum('vDescCond', tr.descontoCondicionado)}</vDescCondIncond>`
    : '';
  const dedGroup = tr.valorDeducoes > 0
    ? `<vDedRed>${tagNum('vDR', tr.valorDeducoes)}</vDedRed>`
    : '';

  const incluirPAliq = opSimpNac !== '3' || tr.tpRetISSQN === '2' || tr.tpRetISSQN === '3';
  const tribMunXml =
    '<tribMun>' +
      tag('tribISSQN', tr.tribISSQN || '1') +
      tag('tpRetISSQN', tr.tpRetISSQN || '1') +
      (incluirPAliq && tr.aliquotaIss > 0 ? `<pAliq>${tr.aliquotaIss.toFixed(2)}</pAliq>` : '') +
    '</tribMun>';

  const temFed = tr.retencaoPis > 0 || tr.retencaoCofins > 0 || tr.retencaoCsll > 0 || tr.retencaoIrrf > 0 || tr.retencaoCp > 0;
  let tribFedXml = '';
  if (temFed) {
    const pisCofins = (tr.retencaoPis > 0 || tr.retencaoCofins > 0)
      ? `<piscofins><CST>01</CST>${tagNum('vPis', tr.retencaoPis)}${tagNum('vCofins', tr.retencaoCofins)}</piscofins>`
      : '';
    tribFedXml =
      '<tribFed>' +
        pisCofins +
        tagNum('vRetCP', tr.retencaoCp) +
        tagNum('vRetIRRF', tr.retencaoIrrf) +
        tagNum('vRetCSLL', tr.retencaoCsll) +
      '</tribFed>';
  }

  let totTribXml = '<totTrib><indTotTrib>0</indTotTrib></totTrib>';
  if (prestador.opSimpNac === '3' && tr.pTotTribSN > 0) {
    totTribXml = `<totTrib><pTotTribSN>${tr.pTotTribSN.toFixed(2)}</pTotTribSN></totTrib>`;
  } else if (tr.pTotTribFed > 0 || tr.pTotTribEst > 0 || tr.pTotTribMun > 0) {
    totTribXml =
      '<totTrib><pTotTrib>' +
        `<pTotTribFed>${tr.pTotTribFed.toFixed(2)}</pTotTribFed>` +
        `<pTotTribEst>${tr.pTotTribEst.toFixed(2)}</pTotTribEst>` +
        `<pTotTribMun>${tr.pTotTribMun.toFixed(2)}</pTotTribMun>` +
      '</pTotTrib></totTrib>';
  }

  const valoresXml =
    '<valores>' +
      `<vServPrest><vServ>${tr.valorServicos.toFixed(2)}</vServ></vServPrest>` +
      descGroup +
      dedGroup +
      `<trib>${tribMunXml}${tribFedXml}${totTribXml}</trib>` +
    '</valores>';

  const dhEmi = formatarDataHoraBrasilia();
  const dataBrasiliaHoje = dhEmi.slice(0, 10);
  const dCompet = nota.competencia && nota.competencia <= dataBrasiliaHoje ? nota.competencia : dataBrasiliaHoje;
  const isHomologacao = prestador.ambiente !== 'producao';
  const finNFSeTag = isHomologacao ? '<finNFSe>0</finNFSe>' : '';
  const indDestTag = isHomologacao ? '<indDest>0</indDest>' : '';

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">' +
      `<infDPS Id="${idDps}">` +
        `<tpAmb>${tpAmb}</tpAmb>` +
        `<dhEmi>${dhEmi}</dhEmi>` +
        '<verAplic>BaraoNFSe_2.0</verAplic>' +
        `<serie>${serieNum}</serie>` +
        `<nDPS>${nDPS}</nDPS>` +
        `<dCompet>${escXml(dCompet)}</dCompet>` +
        '<tpEmit>1</tpEmit>' +
        finNFSeTag +
        `<cLocEmi>${cLocEmi}</cLocEmi>` +
        prestXml +
        tomaXml +
        indDestTag +
        servXml +
        valoresXml +
      '</infDPS>' +
    '</DPS>';

  return { idDps, xml };
}

module.exports = {
  montarIdDps,
  gerarXmlDps
};
