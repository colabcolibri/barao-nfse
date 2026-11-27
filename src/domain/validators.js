'use strict';

function apenasDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

/**
 * Valida CPF (11 dígitos) ou CNPJ (14 dígitos) pelos dígitos verificadores.
 */
function validarCpfCnpj(valor) {
  const d = apenasDigitos(valor);

  if (d.length === 11) {
    if (/^(\d)\1{10}$/.test(d)) return false;
    const calcDigito = (len) => {
      let soma = 0;
      for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };
    return calcDigito(9) === Number(d[9]) && calcDigito(10) === Number(d[10]);
  }

  if (d.length === 14) {
    if (/^(\d)\1{13}$/.test(d)) return false;
    const calcDigito = (pesos) => {
      let soma = 0;
      for (let i = 0; i < pesos.length; i++) soma += Number(d[i]) * pesos[i];
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    return calcDigito(p1) === Number(d[12]) && calcDigito(p2) === Number(d[13]);
  }

  return false;
}

function formatarCpfCnpj(valor) {
  const d = apenasDigitos(valor);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return String(valor || '');
}

module.exports = {
  apenasDigitos,
  validarCpfCnpj,
  formatarCpfCnpj
};
