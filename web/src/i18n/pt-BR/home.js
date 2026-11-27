export const home = {
  banner: {
    certActive: 'Certificado A1 Ativo',
    certPending: 'Certificado A1 Pendente',
    description: 'Emissor local de NFS-e no Padrão Nacional (Sefin Nacional / ADN) com assinatura A1, XML oficial e DANFSe v2.0 em PDF.'
  },
  kpis: {
    emitidas: 'Emitidas por mim',
    recebidas: 'Recebidas (contra CNPJ)',
    tomadoresTemplates: 'Tomadores & Templates',
    templatesCount: '{{count}} template(s)',
    identidade: 'Identidade & Segurança',
    logoOk: 'Logo configurada',
    logoEmpty: 'Sem logo'
  },
  guides: {
    privacyTitle: '1. Privacidade & Certificado A1',
    privacyBody: 'Tudo roda 100% local em 127.0.0.1 com banco SQLite próprio. A senha do seu certificado .p12/.pfx é criptografada em repouso (AES-256-GCM) e a comunicação com a SEFIN Nacional usa mTLS direto da sua máquina.',
    legalTitle: '2. Validade Legal (XML + PDF)',
    legalBody: 'Pela NT 008/2026, o XML assinado é o único documento com validade jurídica e fiscal. Para cobrar o cliente, envie o PDF DANFSe v2.0 (gerado localmente com sua logo) junto com o XML oficial.',
    authTitle: '3. Autenticidade via Consulta Pública',
    authBody: 'Cada PDF traz a Chave de Acesso de 50 dígitos e o QR Code oficial apontando para a Consulta Pública do nfse.gov.br, permitindo que qualquer cliente confirme a autenticidade direto no governo.'
  },
  recent: {
    title: 'Últimas Notas Emitidas',
    subtitle: 'Acesso rápido ao DANFSE em PDF, XML e Consulta Pública.',
    viewAll: 'Ver todas',
    empty: 'Nenhuma nota emitida neste ambiente ainda.',
    viewDanfse: 'Ver DANFSE',
    portalGov: 'Portal Gov (Consulta Pública)'
  }
};
