'use strict';

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function nonNeg(n) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Calcula todos os valores, descontos, base de cálculo, ISSQN, retenções federais,
 * tributos aproximados (Lei 12.741/2012) e valor líquido da NFS-e no Padrão Nacional.
 */
function calcularTributos(input = {}) {
  const valorServicos = round2(nonNeg(input.valorServicos));
  const descontoIncondicionado = round2(Math.min(valorServicos, nonNeg(input.descontoIncondicionado)));
  const descontoCondicionado = round2(nonNeg(input.descontoCondicionado));
  const valorDeducoes = round2(Math.min(valorServicos - descontoIncondicionado, nonNeg(input.valorDeducoes)));

  const baseCalculo = round2(Math.max(0, valorServicos - descontoIncondicionado - valorDeducoes));

  const tribISSQN = String(input.tribISSQN || '1');
  const tpRetISSQN = String(input.tpRetISSQN || '1');
  const aliquotaIss = round2(Math.min(5, nonNeg(input.aliquotaIss)));
  const issRetido = tpRetISSQN === '2' || tpRetISSQN === '3';
  const valorIss = tribISSQN === '1' ? round2(baseCalculo * (aliquotaIss / 100)) : 0;

  const retencaoPis = round2(nonNeg(input.retencaoPis));
  const retencaoCofins = round2(nonNeg(input.retencaoCofins));
  const retencaoCsll = round2(nonNeg(input.retencaoCsll));
  const retencaoIrrf = round2(nonNeg(input.retencaoIrrf));
  const retencaoCp = round2(nonNeg(input.retencaoCp)); // INSS / Contribuição Previdenciária

  const totalRetencoesFederais = round2(
    retencaoPis + retencaoCofins + retencaoCsll + retencaoIrrf + retencaoCp
  );

  const issDescontado = issRetido ? valorIss : 0;
  const valorLiquido = round2(
    Math.max(0, valorServicos - descontoIncondicionado - descontoCondicionado - issDescontado - totalRetencoesFederais)
  );

  // Lei da Transparência (12.741/2012)
  const pTotTribSN = round2(nonNeg(input.pTotTribSN));
  const pTotTribFed = round2(nonNeg(input.pTotTribFed));
  const pTotTribEst = round2(nonNeg(input.pTotTribEst));
  const pTotTribMun = round2(nonNeg(input.pTotTribMun));

  return {
    valorServicos,
    descontoIncondicionado,
    descontoCondicionado,
    valorDeducoes,
    baseCalculo,
    tribISSQN,
    tpRetISSQN,
    issRetido,
    aliquotaIss,
    valorIss,
    retencaoPis,
    retencaoCofins,
    retencaoCsll,
    retencaoIrrf,
    retencaoCp,
    totalRetencoesFederais,
    valorLiquido,
    pTotTribSN,
    pTotTribFed,
    pTotTribEst,
    pTotTribMun
  };
}

module.exports = { calcularTributos, round2 };
