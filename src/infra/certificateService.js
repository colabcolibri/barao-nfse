'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

function runOpenSslPkcs12(args, stdinPass) {
  try {
    return execFileSync('openssl', ['pkcs12', ...args], {
      input: stdinPass,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err) {
    const stderr = err.stderr ? String(err.stderr) : err.message;
    if (/unsupported|RC2-40-CBC|legacy/i.test(stderr)) {
      return execFileSync('openssl', ['pkcs12', '-legacy', ...args], {
        input: stdinPass,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }
    throw err;
  }
}

/**
 * Lê um certificado digital A1 (.pfx / .p12) usando OpenSSL 3 (com suporte automático a -legacy para ICP-Brasil RC2-40-CBC).
 * A senha é enviada via stdin (-passin stdin) para nunca aparecer na linha de comando (ps).
 */
function lerCertificadoA1(pfxPath, senha = '') {
  if (!pfxPath || !fs.existsSync(pfxPath)) {
    throw new Error('Arquivo de certificado (.pfx/.p12) não encontrado.');
  }

  const pfxBuffer = fs.readFileSync(pfxPath);
  const stdinPass = `${senha || ''}\n`;
  let certPem;
  let keyPem;
  let certBase64;
  let infoSourcePem;

  try {
    const leafPem = runOpenSslPkcs12(['-in', pfxPath, '-passin', 'stdin', '-clcerts', '-nokeys'], stdinPass);
    const caPem = runOpenSslPkcs12(['-in', pfxPath, '-passin', 'stdin', '-cacerts', '-nokeys'], stdinPass);
    certPem = caPem.trim() ? `${leafPem}\n${caPem}` : leafPem;
    keyPem = runOpenSslPkcs12(['-in', pfxPath, '-passin', 'stdin', '-nocerts', '-nodes'], stdinPass);

    const certMatch = leafPem.match(/-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/);
    if (!certMatch) {
      throw new Error('Não foi possível extrair o certificado X.509 do arquivo.');
    }
    certBase64 = certMatch[1].replace(/\s+/g, '');
    infoSourcePem = leafPem;
  } catch (err) {
    const stderr = err.stderr ? String(err.stderr) : err.message;
    if (/mac verify error|invalid password/i.test(stderr)) {
      throw new Error('Senha do certificado A1 incorreta.');
    }
    throw new Error(`Erro ao abrir certificado A1: ${stderr.trim()}`);
  }

  const infoText = execFileSync(
    'openssl',
    ['x509', '-noout', '-subject', '-enddate'],
    { input: infoSourcePem, encoding: 'utf8' }
  );

  const cnMatch = infoText.match(/CN\s*=\s*([^,\n/]+)/);
  const subjectMatch = infoText.match(/subject=(.+)/);
  const notAfterMatch = infoText.match(/notAfter=(.+)/);
  const validoAte = notAfterMatch ? new Date(notAfterMatch[1].trim()).toISOString().slice(0, 10) : '';

  return {
    pfxBuffer,
    certPem,
    keyPem,
    certBase64,
    subject: cnMatch ? cnMatch[1].trim() : (subjectMatch ? subjectMatch[1].trim() : ''),
    validoAte
  };
}

module.exports = { lerCertificadoA1 };
