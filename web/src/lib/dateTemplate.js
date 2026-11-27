/**
 * Expande placeholders de mês/ano em templates com base na data de competência (AAAA-MM-DD).
 * Suporta: {{MMMM/AAAA}}, {{MMMM/AA}}, {{MM/AAAA}}, {{MM/AA}}, {{MES}}, {{ANO}}, {{MES_ANO}}
 * e também padrões diretos como MMMM/AAAA ou MMMM/AA.
 */
export function expandirTemplateData(texto, competenciaIso) {
  if (!texto) return '';
  const base = competenciaIso && /^\d{4}-\d{2}-\d{2}$/.test(competenciaIso)
    ? new Date(`${competenciaIso}T12:00:00`)
    : new Date();

  const mesExtenso = base
    .toLocaleDateString('pt-BR', { month: 'long' })
    .replace(/^./, (c) => c.toUpperCase());
  const mesAbrev = base
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '')
    .replace(/^./, (c) => c.toUpperCase());
  const mm = String(base.getMonth() + 1).padStart(2, '0');
  const aaaa = String(base.getFullYear());
  const aa = aaaa.slice(-2);

  const formatToken = (expr) =>
    expr
      .replace(/MMMM/gi, mesExtenso)
      .replace(/MMM/gi, mesAbrev)
      .replace(/MM/gi, mm)
      .replace(/AAAA|YYYY/gi, aaaa)
      .replace(/AA|YY/gi, aa);

  return String(texto)
    .replace(/\{\{MES_ANO\}\}/gi, `${mesExtenso}/${aaaa}`)
    .replace(/\{\{MES\}\}/gi, mesExtenso)
    .replace(/\{\{ANO\}\}/gi, aaaa)
    .replace(/\{\{([^}]+)\}\}/g, (_, inner) => formatToken(inner))
    .replace(/\bMMMM\/AAAA\b/g, `${mesExtenso}/${aaaa}`)
    .replace(/\bMMMM\/AA\b/g, `${mesExtenso}/${aa}`)
    .replace(/\bMM\/AAAA\b/g, `${mm}/${aaaa}`)
    .replace(/\bMM\/AA\b/g, `${mm}/${aa}`);
}
