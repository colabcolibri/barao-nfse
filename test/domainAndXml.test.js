'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validarCpfCnpj, formatarCpfCnpj } = require('../src/domain/validators');
const { calcularTributos } = require('../src/domain/taxCalculator');
const { montarIdDps, gerarXmlDps } = require('../src/infra/dpsXmlBuilder');

test('validarCpfCnpj e formatarCpfCnpj funcionam para CPF e CNPJ', () => {
  assert.equal(validarCpfCnpj('52998224725'), true);
  assert.equal(validarCpfCnpj('11.222.333/0001-81'), true);
  assert.equal(validarCpfCnpj('111.111.111-11'), false);
  assert.equal(formatarCpfCnpj('52998224725'), '529.982.247-25');
  assert.equal(formatarCpfCnpj('11222333000181'), '11.222.333/0001-81');
});

test('calcularTributos considera descontos, deduções, ISS retido e retenções federais', () => {
  const res = calcularTributos({
    valorServicos: 5000,
    descontoIncondicionado: 500,
    descontoCondicionado: 100,
    valorDeducoes: 200,
    tribISSQN: '1',
    tpRetISSQN: '2',
    aliquotaIss: 2,
    retencaoPis: 32.5,
    retencaoCofins: 150,
    retencaoCsll: 50,
    retencaoIrrf: 75,
    retencaoCp: 0,
    pTotTribSN: 6
  });

  assert.equal(res.baseCalculo, 4300);
  assert.equal(res.valorIss, 86);
  assert.equal(res.issRetido, true);
  assert.equal(res.totalRetencoesFederais, 307.5);
  assert.equal(res.valorLiquido, 4006.5);
});

test('gerarXmlDps gera XML completo do Padrão Nacional (NBS, descontos, endereço, pTotTribSN)', () => {
  const id = montarIdDps({
    codigoMunicipioIbge: '3549904',
    documentoPrestador: '11.222.333/0001-81',
    serie: '1',
    numeroDps: 7
  });
  assert.equal(id.length, 45);

  const prestador = {
    cnpj: '11.222.333/0001-81',
    inscricaoMunicipal: '12345',
    codigoMunicipioIbge: '3549904',
    opSimpNac: '3',
    regEspTrib: '0',
    ambiente: 'homologacao'
  };

  const nota = {
    numero: 7,
    dpsNumero: 7,
    dpsSerie: '1',
    competencia: '2026-11-27',
    tomador: {
      tipoPessoa: 'BR',
      documento: '52998224725',
      nome: 'Cliente SJC Ltda',
      email: 'contato@sjc.com.br',
      cep: '12200000',
      logradouro: 'Av. Nove de Julho',
      numero: '100',
      bairro: 'Centro',
      codigoMunicipioIbge: '3549904'
    },
    servico: {
      cTribNac: '010101',
      cNBS: '115021000',
      codigoInterno: 'TI-01',
      codigoMunicipioPrestacao: '3549904',
      discriminacao: 'Desenvolvimento de software',
      infoComplementar: 'Simples Nacional'
    },
    tributos: calcularTributos({
      valorServicos: 3000,
      descontoIncondicionado: 200,
      aliquotaIss: 2,
      tpRetISSQN: '1',
      pTotTribSN: 6
    })
  };

  const { xml } = gerarXmlDps(nota, prestador);
  assert.match(xml, /<cLocEmi>3549904<\/cLocEmi>/);
  assert.match(xml, /<cTribNac>010101<\/cTribNac>/);
  assert.match(xml, /<vDescIncond>200\.00<\/vDescIncond>/);
  assert.match(xml, /<pTotTribSN>6\.00<\/pTotTribSN>/);
  assert.match(xml, /<CEP>12200000<\/CEP>/);
});
