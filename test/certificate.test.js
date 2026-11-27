'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { lerCertificadoA1 } = require('../src/infra/certificateService');

test('lerCertificadoA1 lê .p12 moderno (OpenSSL 3 / AES-256) via fallback', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'barao-cert-'));
  const keyPath = path.join(tmpDir, 'key.pem');
  const certPath = path.join(tmpDir, 'cert.pem');
  const p12Path = path.join(tmpDir, 'modern.p12');

  try {
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048',
      '-keyout', keyPath, '-out', certPath,
      '-days', '30', '-nodes', '-subj', '/CN=Teste Barao A1'
    ], { stdio: 'ignore' });

    execFileSync('openssl', [
      'pkcs12', '-export',
      '-out', p12Path, '-inkey', keyPath, '-in', certPath,
      '-passout', 'pass:123456'
    ], { stdio: 'ignore' });

    const info = lerCertificadoA1(p12Path, '123456');
    assert.equal(info.subject, 'Teste Barao A1');
    assert.match(info.validoAte, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(info.certBase64.length > 100);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
