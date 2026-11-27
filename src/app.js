'use strict';

const path = require('node:path');
const Fastify = require('fastify');
const fastifyStatic = require('@fastify/static');
const {
  initDatabase,
  PrestadorRepository,
  TomadorRepository,
  NotaRepository,
  TemplateRepository,
  LogRepository
} = require('./db/database');
const { SefinNacionalClient } = require('./infra/sefinClient');
const { NfseService } = require('./services/nfseService');
const { registerApiRoutes } = require('./routes/apiRoutes');

function isLocalHostHeader(value) {
  if (!value) return false;
  return /^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(String(value).trim());
}

function isLocalOriginHeader(value) {
  if (!value) return true;
  try {
    const u = new URL(String(value));
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  } catch {
    return false;
  }
}

function buildApp(options = {}) {
  const rootDir = path.resolve(__dirname, '..');
  const dbPath = options.dbPath || path.join(rootDir, 'data', 'barao-nfse.sqlite');
  const xmlDir = options.xmlDir || path.join(rootDir, 'data', 'xml');
  const keyPath = options.keyPath || path.join(path.dirname(dbPath), '.master.key');

  const fastify = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 2 * 1024 * 1024
  });

  // Proteção contra CSRF / DNS rebinding e cabeçalhos de segurança HTTP
  fastify.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cross-Origin-Resource-Policy', 'same-origin');

    if (!isLocalHostHeader(request.headers.host)) {
      return reply.code(403).send({ error: 'Host não autorizado.' });
    }
    if (!isLocalOriginHeader(request.headers.origin)) {
      return reply.code(403).send({ error: 'Origem externa bloqueada (proteção CSRF).' });
    }
  });

  const db = initDatabase(dbPath);

  const prestadorRepo = new PrestadorRepository(db, keyPath);
  const tomadorRepo = new TomadorRepository(db);
  const notaRepo = new NotaRepository(db);
  const templateRepo = new TemplateRepository(db);
  const logRepo = new LogRepository(db);
  const sefinClient = options.sefinClient || new SefinNacionalClient({ logRepo });
  const nfseService = new NfseService({
    prestadorRepo,
    tomadorRepo,
    notaRepo,
    sefinClient,
    xmlDir
  });

  fastify.register(fastifyStatic, {
    root: path.join(rootDir, 'public'),
    prefix: '/'
  });

  registerApiRoutes(fastify, {
    prestadorRepo,
    tomadorRepo,
    notaRepo,
    templateRepo,
    nfseService
  });

  fastify.addHook('onClose', async () => {
    db.close();
  });

  return fastify;
}

module.exports = { buildApp };
