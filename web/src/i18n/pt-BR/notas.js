export const notas = {
  kpis: {
    emitidas: 'Emitidas por mim',
    recebidas: 'Recebidas (contra meu CNPJ)',
    exibindo: 'Exibindo nesta lista',
    paginaDe: 'Página {{current}} de {{total}}'
  },
  tabs: {
    emitidas: 'Emitidas por mim ({{count}})',
    recebidas: 'Recebidas ({{count}})'
  },
  filters: {
    searchEmitida: 'Buscar cliente, nº ou serviço...',
    searchRecebida: 'Buscar fornecedor, nº ou serviço...',
    allStatuses: 'Todos os status'
  },
  table: {
    numero: 'Nº',
    data: 'Data',
    tomador: 'Tomador (Cliente)',
    prestador: 'Prestador (Fornecedor)',
    servico: 'Serviço',
    valor: 'Valor',
    status: 'Status',
    acoes: 'Ações',
    rascunho: 'Rascunho',
    fornecedorFallback: 'Fornecedor'
  },
  empty: {
    emitidaTitle: 'Nenhuma nota emitida encontrada',
    recebidaTitle: 'Nenhuma nota recebida encontrada',
    emitidaBody: 'Emita uma nova NFS-e ou clique em Sincronizar Portal Nacional.',
    recebidaBody: 'Clique em Sincronizar Portal Nacional para importar notas emitidas contra seu CNPJ.',
    ctaEmitir: 'Emitir NFS-e'
  },
  actions: {
    verDanfse: 'Ver DANFSE',
    baixarXml: 'Baixar XML',
    baixarPdf: 'Baixar PDF (DANFSE)',
    portalGov: 'Abrir na Consulta Pública (Portal Gov)',
    cancelar: 'Cancelar NFS-e'
  },
  pagination: {
    showing: 'Mostrando {{from}}–{{to}} de {{total}} • Página {{current}} de {{pages}}',
    prev: 'Anterior',
    next: 'Próxima'
  },
  danfseModal: {
    titleNumber: 'NFS-e #{{numero}}',
    titleDraft: 'Rascunho de NFS-e',
    badgeLocal: 'Local',
    badgeNacional: 'Portal Nacional',
    chaveLabel: 'Chave:',
    verifLabel: 'Código de Verificação:',
    consultaPublica: 'Consulta Pública',
    portalGov: 'Portal Gov',
    baixarXml: 'XML',
    baixarPdf: 'Baixar PDF',
    imprimir: 'Imprimir / Salvar PDF',
    canceledBanner: 'NOTA FISCAL CANCELADA',
    motivo: 'Motivo:'
  },
  cancelDialog: {
    title: 'Cancelar NFS-e #{{numero}}',
    description: 'Informe o motivo do cancelamento. Esta ação marcará a nota como cancelada no histórico local.',
    motivoLabel: 'Motivo do cancelamento',
    defaultMotivo: 'Erro no preenchimento dos dados',
    confirmButton: 'Confirmar Cancelamento',
    successToast: 'Nota cancelada no registro local.'
  }
};
