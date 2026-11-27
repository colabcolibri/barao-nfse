'use strict';

const { buildApp } = require('./app');

const PORT = Number(process.env.PORT) || 3333;
const HOST = process.env.HOST || '127.0.0.1';

async function start() {
  const isDev = process.env.NODE_ENV === 'development';
  const app = buildApp({ logger: isDev });

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await app.listen({ port: PORT, host: HOST });
  console.log(`Barão • Emissor NFS-e rodando em http://${HOST}:${PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
