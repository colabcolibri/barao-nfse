'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PREFIX = 'enc:v1:';

function getOrCreateMasterKey(keyPath) {
  if (process.env.BARAO_MASTER_KEY) {
    return crypto.createHash('sha256').update(process.env.BARAO_MASTER_KEY, 'utf8').digest();
  }
  fs.mkdirSync(path.dirname(keyPath), { recursive: true, mode: 0o700 });
  if (fs.existsSync(keyPath)) {
    const hex = fs.readFileSync(keyPath, 'utf8').trim();
    return Buffer.from(hex, 'hex');
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(keyPath, key.toString('hex'), { mode: 0o600 });
  return key;
}

function encryptSecret(plaintext, keyPath) {
  if (!plaintext) return '';
  if (String(plaintext).startsWith(PREFIX)) return String(plaintext);
  const key = getOrCreateMasterKey(keyPath);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(ciphertext, keyPath) {
  if (!ciphertext) return '';
  const raw = String(ciphertext);
  if (!raw.startsWith(PREFIX)) return raw; // compatibilidade com valor legado em texto
  const parts = raw.slice(PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('Segredo criptografado inválido.');
  const [ivB64, tagB64, dataB64] = parts;
  const key = getOrCreateMasterKey(keyPath);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { encryptSecret, decryptSecret };
