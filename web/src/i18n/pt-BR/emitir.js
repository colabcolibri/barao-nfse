export const emitir = {
  sections: {
    tomador: '1. Tomador do Serviço (Cliente)',
    servico: '2. Serviço Prestado & Local',
    valores: '3. Valores, ISSQN e Retenções'
  },
  fields: {
    clienteSalvo: 'Cliente salvo (opcional)',
    selecionarTomador: 'Selecionar tomador...',
    tipoPessoa: 'Tipo de Pessoa',
    cpfCnpj: 'CPF / CNPJ',
    nifDocumento: 'NIF / Documento Exterior',
    nomeRazao: 'Nome / Razão Social *',
    email: 'E-mail',
    municipio: 'Município',
    uf: 'UF',
    salvarTomador: 'Salvar/atualizar este tomador para próximas notas',
    modoEmissao: 'Modo de Emissão',
    competencia: 'Competência *',
    cTribNac: 'Código de Tributação Nacional *',
    cNbs: 'Código NBS (Opcional)',
    discriminacao: 'Discriminação do Serviço *',
    placeholdersHint: 'Placeholders:',
    infoComplementar: 'Informações Complementares / Dados Bancários / PIX',
    valorBruto: 'Valor Bruto do Serviço (R$) *',
    aliquotaIss: 'Alíquota ISS (%)',
    retencaoIss: 'Retenção ISSQN',
    pTotTribSn: '% Trib. Aprox. SN (Lei 12.741)',
    descontosToggle: 'Descontos, Deduções e Retenções Federais (IRRF / PIS / COFINS / INSS)',
    descontoIncond: 'Desconto Incond. (R$)',
    descontoCond: 'Desconto Cond. (R$)',
    deducoes: 'Deduções (R$)',
    irrf: 'IRRF (R$)',
    pis: 'PIS (R$)',
    cofins: 'COFINS (R$)',
    csll: 'CSLL (R$)',
    inssCp: 'INSS / CP (R$)'
  },
  options: {
    pessoaBr: 'Pessoa no Brasil (CPF/CNPJ)',
    pessoaExt: 'Exterior (NIF)',
    modoNacional: 'Portal Nacional (Sefin Nacional — A1)',
    modoLocal: 'Simulação Local (Offline)'
  },
  placeholders: {
    discriminacao: 'Descreva o serviço prestado. Ex: Consultoria referente a {{MMMM/AAAA}}.',
    infoComplementar: 'Ex: Banco / Agência / Conta ou Chave PIX'
  },
  buttons: {
    lookupCnpj: 'Buscar CNPJ na Receita',
    saveDraft: 'Salvar Rascunho',
    previewEmit: 'Revisar e Emitir NFS-e'
  },
  summary: {
    baseCalculo: 'Base Cálculo:',
    iss: 'ISS ({{aliq}}%):',
    valorLiquido: 'Valor Líquido:'
  },
  preview: {
    title: 'Conferência antes de Emitir',
    badgeLocal: 'Simulação Local',
    description: 'Revise os dados abaixo. A nota só será transmitida após sua confirmação.',
    errorPrefix: 'Erro ao emitir:',
    prestador: 'Prestador',
    tomador: 'Tomador',
    servico: 'Serviço',
    competencia: 'Competência:',
    discriminacao: 'Discriminação:',
    infoComplementar: 'Informações Complementares:',
    valorServicos: 'Valor dos Serviços:',
    footerNacional: 'Assinatura A1 + mTLS',
    footerLocal: 'Gravação apenas local',
    backEdit: 'Voltar e Editar',
    confirmEmit: 'Confirmar e Emitir',
    transmitting: 'Transmitindo...'
  },
  toasts: {
    cnpjLoaded: 'Dados do CNPJ preenchidos!',
    templateApplied: 'Template "{{nome}}" aplicado!',
    lastRepeated: 'Dados da última nota preenchidos!',
    draftSaved: 'Rascunho salvo com sucesso.',
    emittedLocal: 'NFS-e emitida localmente!',
    emittedNacional: 'NFS-e transmitida e autorizada pelo Portal Nacional!'
  }
};
