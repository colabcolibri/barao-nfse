export const common = {
  brand: {
    title: 'Barão NFS-e',
    subtitle: 'Padrão Nacional',
    groupLabel: 'Emissor Fiscal',
    loading: 'Carregando Barão NFS-e...'
  },
  nav: {
    home: 'Início',
    emitir: 'Emitir NFS-e',
    notas: 'Notas Emitidas',
    templates: 'Templates',
    tomadores: 'Tomadores',
    prestador: 'Prestador & A1'
  },
  pages: {
    home: { title: 'Início', subtitle: 'Visão geral, resumo fiscal e guia rápido do Barão NFS-e' },
    emitir: { title: 'Emitir NFS-e', subtitle: 'Padrão Nacional (Sefin Nacional / ADN)' },
    notas: { title: 'Notas Emitidas', subtitle: 'Histórico local em SQLite, XMLs assinados e DANFSE em PDF' },
    templates: { title: 'Templates de Serviço', subtitle: 'Textos fixos, dados bancários/PIX e valores padrão' },
    tomadores: { title: 'Tomadores', subtitle: 'Base de clientes recorrentes para emissão rápida' },
    prestador: { title: 'Prestador & Certificado A1', subtitle: 'Dados cadastrais, regime tributário e assinatura digital' }
  },
  environment: {
    producao: 'Produção Oficial',
    homologacao: 'Homologação',
    homologacaoTestes: 'Homologação (Testes)',
    certConfigured: 'A1 Configurado',
    certPending: 'A1 Pendente',
    companyNotConfigured: 'Empresa não configurada',
    configureAlertTitle: 'Configure seu CNPJ e Razão Social',
    configureAlertBody: 'antes de emitir sua primeira NFS-e.',
    configureNow: 'Configurar agora'
  },
  status: {
    emitida_nacional: 'Nacional',
    emitida_local: 'Local',
    rascunho: 'Rascunho',
    cancelada: 'Cancelada',
    emitida_nacional_full: 'Emitida (Nacional)',
    emitida_local_full: 'Emitida (Local)'
  },
  actions: {
    syncPortal: 'Sincronizar Portal Nacional',
    syncAdn: 'Sincronizar ADN',
    syncing: 'Sincronizando...',
    save: 'Salvar',
    cancel: 'Cancelar',
    close: 'Fechar',
    edit: 'Editar',
    delete: 'Excluir',
    confirm: 'Confirmar',
    applyTemplate: 'Aplicar template...',
    repeatLast: 'Repetir última nota',
    selectPlaceholder: 'Selecione...'
  },
  toasts: {
    syncLoading: 'Sincronizando notas com o Portal Nacional (ADN)...',
    syncImported: '{{count}} nova(s) NFS-e importada(s) do Portal Nacional.',
    syncUpToDate: 'Base já atualizada — nenhuma nova nota encontrada no ADN.',
    syncError: 'Falha ao sincronizar com o Portal Nacional: {{message}}',
    requestError: 'Erro na requisição'
  }
};
