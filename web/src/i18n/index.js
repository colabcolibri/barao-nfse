import { common } from './pt-BR/common';
import { home } from './pt-BR/home';
import { emitir } from './pt-BR/emitir';
import { notas } from './pt-BR/notas';
import { cadastros } from './pt-BR/cadastros';

export const locales = {
  'pt-BR': {
    common,
    home,
    emitir,
    notas,
    cadastros
  }
};

const DEFAULT_LOCALE = 'pt-BR';

/**
 * Resolve chave aninhada (ex: "notas.kpis.paginaDe") e interpola {{variaveis}}.
 */
export function translate(locale, key, vars = {}) {
  const dict = locales[locale] || locales[DEFAULT_LOCALE];
  const value = String(key)
    .split('.')
    .reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), dict);

  if (typeof value !== 'string') return key;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name) => (vars[name] !== undefined ? String(vars[name]) : ''));
}

export function t(key, vars) {
  return translate(DEFAULT_LOCALE, key, vars);
}

export function useI18n(locale = DEFAULT_LOCALE) {
  const messages = locales[locale] || locales[DEFAULT_LOCALE];
  return {
    locale,
    messages,
    t: (key, vars) => translate(locale, key, vars)
  };
}
