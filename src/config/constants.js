'use strict';

/**
 * Constantes oficiais do Padrão Nacional da NFS-e (Sefin Nacional / ADN).
 */
const ENDPOINTS_NACIONAL = {
  homologacao: {
    sefin: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
    adn: 'https://adn.producaorestrita.nfse.gov.br'
  },
  producao: {
    sefin: 'https://sefin.nfse.gov.br/SefinNacional',
    adn: 'https://adn.nfse.gov.br'
  }
};

/**
 * Códigos de Tributação Nacional (cTribNac - 6 dígitos) + NBS sugerido (9 dígitos).
 */
const CODIGOS_SERVICO_NACIONAL = [
  { cTribNac: '010101', cNBS: '115021000', descricao: '01.01.01 - Análise e desenvolvimento de sistemas' },
  { cTribNac: '010201', cNBS: '115022000', descricao: '01.02.01 - Programação' },
  { cTribNac: '010301', cNBS: '115023000', descricao: '01.03.01 - Processamento, armazenamento ou hospedagem de dados' },
  { cTribNac: '010401', cNBS: '115021000', descricao: '01.04.01 - Elaboração de programas de computadores' },
  { cTribNac: '010601', cNBS: '115011000', descricao: '01.06.01 - Assessoria e consultoria em informática' },
  { cTribNac: '010701', cNBS: '115024000', descricao: '01.07.01 - Suporte técnico em informática' },
  { cTribNac: '010801', cNBS: '115029000', descricao: '01.08.01 - Planejamento, confecção e manutenção de páginas eletrônicas' },
  { cTribNac: '080201', cNBS: '122051000', descricao: '08.02.01 - Instrução, treinamento e ensino' },
  { cTribNac: '170101', cNBS: '114011100', descricao: '17.01.01 - Assessoria ou consultoria de qualquer natureza' },
  { cTribNac: '170201', cNBS: '114099000', descricao: '17.02.01 - Datilografia, digitação, expediente e secretaria' },
  { cTribNac: '170601', cNBS: '114031000', descricao: '17.06.01 - Propaganda e publicidade' },
  { cTribNac: '230101', cNBS: '114041000', descricao: '23.01.01 - Programação e comunicação visual / design' }
];

const REGIMES_SIMPLES_NACIONAL = [
  { codigo: '1', label: '1 - Não Optante (Lucro Presumido / Real)' },
  { codigo: '2', label: '2 - Optante - Microempreendedor Individual (MEI)' },
  { codigo: '3', label: '3 - Optante - Microempresa ou EPP (Simples Nacional)' }
];

const REGIMES_ESPECIAIS = [
  { codigo: '0', label: '0 - Nenhum' },
  { codigo: '1', label: '1 - Ato Cooperado (Cooperativa)' },
  { codigo: '2', label: '2 - Estimativa' },
  { codigo: '3', label: '3 - Microempresa Municipal' },
  { codigo: '4', label: '4 - Notário ou Registrador' },
  { codigo: '5', label: '5 - Profissional Autônomo' },
  { codigo: '6', label: '6 - Sociedade de Profissionais' }
];

const TRIBUTACAO_ISSQN = [
  { codigo: '1', label: '1 - Operação tributável' },
  { codigo: '2', label: '2 - Imunidade' },
  { codigo: '3', label: '3 - Exportação de serviço' },
  { codigo: '4', label: '4 - Não Incidência' }
];

const TIPO_RETENCAO_ISSQN = [
  { codigo: '1', label: '1 - Não Retido' },
  { codigo: '2', label: '2 - Retido pelo Tomador' },
  { codigo: '3', label: '3 - Retido pelo Intermediário' }
];

module.exports = {
  ENDPOINTS_NACIONAL,
  CODIGOS_SERVICO_NACIONAL,
  REGIMES_SIMPLES_NACIONAL,
  REGIMES_ESPECIAIS,
  TRIBUTACAO_ISSQN,
  TIPO_RETENCAO_ISSQN
};
