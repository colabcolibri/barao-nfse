'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { z } = require('zod');
const {
  CODIGOS_SERVICO_NACIONAL,
  REGIMES_SIMPLES_NACIONAL,
  REGIMES_ESPECIAIS,
  TRIBUTACAO_ISSQN,
  TIPO_RETENCAO_ISSQN
} = require('../config/constants');
const { validarCpfCnpj } = require('../domain/validators');
const { lerCertificadoA1 } = require('../infra/certificateService');
const { consultarCnpjBrasilApi } = require('../infra/brasilApiClient');

const prestadorSchema = z.object({
  cnpj: z.string().trim(),
  razaoSocial: z.string().trim(),
  nomeFantasia: z.string().trim().optional().default(''),
  inscricaoMunicipal: z.string().trim().optional().default(''),
  cep: z.string().trim().optional().default(''),
  logradouro: z.string().trim().optional().default(''),
  numero: z.string().trim().optional().default(''),
  complemento: z.string().trim().optional().default(''),
  bairro: z.string().trim().optional().default(''),
  municipio: z.string().trim().default('São José dos Campos'),
  uf: z.string().trim().max(2).default('SP'),
  codigoMunicipioIbge: z.string().trim().default('3549904'),
  telefone: z.string().trim().optional().default(''),
  email: z.string().trim().optional().default(''),
  opSimpNac: z.enum(['1', '2', '3']).default('3'),
  regEspTrib: z.string().trim().default('0'),
  aliquotaPadraoIss: z.coerce.number().min(0).max(5).default(2.0),
  pTotTribSN: z.coerce.number().min(0).max(100).default(6.0),
  rpsSerie: z.string().trim().default('1'),
  ambiente: z.enum(['homologacao', 'producao']).default('homologacao'),
  certificadoPath: z.string().trim().optional().default(''),
  certificadoSenha: z.string().optional().default('')
});

const tomadorSchema = z.object({
  tipoPessoa: z.enum(['BR', 'EXT']).optional().default('BR'),
  documento: z.string().trim().min(1),
  nome: z.string().trim().min(1),
  inscricaoMunicipal: z.string().trim().optional().default(''),
  email: z.string().trim().optional().default(''),
  telefone: z.string().trim().optional().default(''),
  cep: z.string().trim().optional().default(''),
  logradouro: z.string().trim().optional().default(''),
  numero: z.string().trim().optional().default(''),
  complemento: z.string().trim().optional().default(''),
  bairro: z.string().trim().optional().default(''),
  municipio: z.string().trim().optional().default(''),
  uf: z.string().trim().max(2).optional().default(''),
  codigoMunicipioIbge: z.string().trim().optional().default(''),
  pais: z.string().trim().optional().default('BR')
});

const templateSchema = z.object({
  nome: z.string().trim().min(1),
  tomadorId: z.string().trim().optional().default(''),
  cTribNac: z.string().trim().optional().default('010101'),
  cNBS: z.string().trim().optional().default(''),
  codigoInterno: z.string().trim().optional().default(''),
  discriminacao: z.string().trim().min(1),
  infoComplementar: z.string().trim().optional().default(''),
  valorPadrao: z.coerce.number().min(0).optional().default(0),
  aliquotaIss: z.coerce.number().min(0).max(5).optional().default(2.0)
});

const uuidSchema = z.string().uuid();

function sanitizePrestador(prestador) {
  return {
    ...prestador,
    temSenhaCertificado: Boolean(prestador.certificadoSenha),
    temLogo: Boolean(prestador.logoPath && fs.existsSync(prestador.logoPath)),
    certificadoSenha: ''
  };
}

function registerApiRoutes(fastify, { prestadorRepo, tomadorRepo, notaRepo, templateRepo, nfseService, certDir, logoDir }) {
  fastify.get('/api/bootstrap', async () => {
    const prestador = prestadorRepo.get();
    return {
      prestador: sanitizePrestador(prestador),
      tomadores: tomadorRepo.list(),
      notas: notaRepo.list(prestador.ambiente),
      templates: templateRepo.list(),
      tabelas: {
        codigosServico: CODIGOS_SERVICO_NACIONAL,
        regimesSimples: REGIMES_SIMPLES_NACIONAL,
        regimesEspeciais: REGIMES_ESPECIAIS,
        tributacaoIssqn: TRIBUTACAO_ISSQN,
        tipoRetencaoIssqn: TIPO_RETENCAO_ISSQN
      }
    };
  });

  fastify.put('/api/prestador', async (request, reply) => {
    const parsed = prestadorSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Dados do prestador inválidos.' });
    }
    const data = parsed.data;
    if (data.cnpj && !validarCpfCnpj(data.cnpj)) {
      return reply.code(400).send({ error: 'CNPJ do prestador inválido.' });
    }
    const atual = prestadorRepo.get();
    const salvo = prestadorRepo.save({
      ...data,
      uf: data.uf.toUpperCase(),
      certificadoSenha: data.certificadoSenha || atual.certificadoSenha
    });
    return {
      ...sanitizePrestador(salvo),
      notas: notaRepo.list(salvo.ambiente)
    };
  });

  fastify.get('/api/prestador/logo', async (_request, reply) => {
    const atual = prestadorRepo.get();
    if (!atual.logoPath || !fs.existsSync(atual.logoPath)) {
      return reply.code(404).send({ error: 'Logo não configurada.' });
    }
    const ext = path.extname(atual.logoPath).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    return reply.header('Content-Type', mime).header('Cache-Control', 'no-store').send(fs.readFileSync(atual.logoPath));
  });

  fastify.post('/api/prestador/logo', async (request, reply) => {
    const body = request.body || {};
    if (!body.contentBase64) {
      return reply.code(400).send({ error: 'Imagem vazia.' });
    }
    const buffer = Buffer.from(String(body.contentBase64), 'base64');
    if (buffer.length === 0 || buffer.length > 1500 * 1024) {
      return reply.code(400).send({ error: 'A logo deve ter no máximo 1,5 MB.' });
    }
    const isPng = buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const isJpg = buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    if (!isPng && !isJpg) {
      return reply.code(400).send({ error: 'Formato inválido. Envie PNG ou JPG.' });
    }

    const dir = logoDir || path.resolve(__dirname, '../../data/logos');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const ext = isPng ? 'png' : 'jpg';
    const destPath = path.join(dir, `logo-prestador.${ext}`);

    const atual = prestadorRepo.get();
    if (atual.logoPath && atual.logoPath !== destPath && fs.existsSync(atual.logoPath)) {
      fs.rmSync(atual.logoPath, { force: true });
    }

    fs.writeFileSync(destPath, buffer, { mode: 0o600 });
    const salvo = prestadorRepo.save({ ...atual, logoPath: destPath });
    return { ok: true, prestador: sanitizePrestador(salvo) };
  });

  fastify.delete('/api/prestador/logo', async () => {
    const atual = prestadorRepo.get();
    if (atual.logoPath && fs.existsSync(atual.logoPath)) {
      fs.rmSync(atual.logoPath, { force: true });
    }
    const salvo = prestadorRepo.save({ ...atual, logoPath: '' });
    return { ok: true, prestador: sanitizePrestador(salvo) };
  });

  fastify.post('/api/certificado/testar', async (request, reply) => {
    const body = request.body || {};
    const atual = prestadorRepo.get();
    const pfxPath = String(body.certificadoPath || atual.certificadoPath || '').trim();
    const senha = body.certificadoSenha ? String(body.certificadoSenha) : atual.certificadoSenha;
    try {
      const info = lerCertificadoA1(pfxPath, senha);
      return { ok: true, subject: info.subject, validoAte: info.validoAte };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/certificado/upload', async (request, reply) => {
    const body = request.body || {};
    const filename = String(body.filename || 'certificado.pfx').replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!/\.(pfx|p12)$/i.test(filename)) {
      return reply.code(400).send({ error: 'Selecione um arquivo .pfx ou .p12 válido.' });
    }
    if (!body.contentBase64) {
      return reply.code(400).send({ error: 'Arquivo vazio.' });
    }

    const dir = certDir || path.resolve(__dirname, '../../data/certificados');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const destPath = path.join(dir, filename);
    const buffer = Buffer.from(String(body.contentBase64), 'base64');
    fs.writeFileSync(destPath, buffer, { mode: 0o600 });

    const atual = prestadorRepo.get();
    const senha = body.senha !== undefined && body.senha !== '' ? String(body.senha) : atual.certificadoSenha;
    try {
      const info = lerCertificadoA1(destPath, senha);
      prestadorRepo.save({ ...atual, certificadoPath: destPath, certificadoSenha: senha });
      return { ok: true, path: destPath, subject: info.subject, validoAte: info.validoAte };
    } catch (err) {
      fs.rmSync(destPath, { force: true });
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.get('/api/lookup/cnpj/:cnpj', async (request, reply) => {
    try {
      return await consultarCnpjBrasilApi(request.params.cnpj);
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/tomadores', async (request, reply) => {
    const parsed = tomadorSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Nome e documento do tomador são obrigatórios.' });
    }
    const b = parsed.data;
    if (b.tipoPessoa !== 'EXT' && !validarCpfCnpj(b.documento)) {
      return reply.code(400).send({ error: 'CPF/CNPJ do tomador inválido.' });
    }
    const tomador = tomadorRepo.create({
      id: crypto.randomUUID(),
      ...b,
      uf: b.uf.toUpperCase(),
      criadoEm: new Date().toISOString()
    });
    return reply.code(201).send(tomador);
  });

  fastify.put('/api/tomadores/:id', async (request, reply) => {
    if (!uuidSchema.safeParse(request.params.id).success) {
      return reply.code(400).send({ error: 'ID inválido.' });
    }
    const parsed = tomadorSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Nome e documento do tomador são obrigatórios.' });
    }
    const b = parsed.data;
    if (b.tipoPessoa !== 'EXT' && !validarCpfCnpj(b.documento)) {
      return reply.code(400).send({ error: 'CPF/CNPJ do tomador inválido.' });
    }
    const atualizado = tomadorRepo.update(request.params.id, { ...b, uf: b.uf.toUpperCase() });
    if (!atualizado) return reply.code(404).send({ error: 'Tomador não encontrado.' });
    return atualizado;
  });

  fastify.delete('/api/tomadores/:id', async (request, reply) => {
    if (!uuidSchema.safeParse(request.params.id).success) {
      return reply.code(400).send({ error: 'ID inválido.' });
    }
    tomadorRepo.remove(request.params.id);
    return { ok: true };
  });

  fastify.post('/api/notas', async (request, reply) => {
    try {
      const res = await nfseService.emitirOuSalvarRascunho(request.body || {});
      return reply.code(201).send({
        nota: res.nota,
        prestador: { ...res.prestador, certificadoSenha: '' }
      });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/notas/sincronizar', async (request, reply) => {
    try {
      const desdeInicio = Boolean(request.body && request.body.desdeInicio);
      const res = await nfseService.sincronizarComNacional(desdeInicio);
      return {
        importadas: res.importadas,
        ultimoNsu: res.ultimoNsu,
        prestador: { ...res.prestador, certificadoSenha: '' },
        notas: notaRepo.list(res.prestador.ambiente)
      };
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  fastify.post('/api/templates', async (request, reply) => {
    const parsed = templateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Informe o nome do template e o texto da discriminação.' });
    }
    const criado = templateRepo.create({
      id: crypto.randomUUID(),
      ...parsed.data,
      criadoEm: new Date().toISOString()
    });
    return reply.code(201).send(criado);
  });

  fastify.put('/api/templates/:id', async (request, reply) => {
    if (!uuidSchema.safeParse(request.params.id).success) {
      return reply.code(400).send({ error: 'ID inválido.' });
    }
    const parsed = templateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Informe o nome do template e o texto da discriminação.' });
    }
    const atualizado = templateRepo.update(request.params.id, parsed.data);
    if (!atualizado) return reply.code(404).send({ error: 'Template não encontrado.' });
    return atualizado;
  });

  fastify.delete('/api/templates/:id', async (request, reply) => {
    if (!uuidSchema.safeParse(request.params.id).success) {
      return reply.code(400).send({ error: 'ID inválido.' });
    }
    templateRepo.remove(request.params.id);
    return { ok: true };
  });

  fastify.post('/api/notas/:id/cancelar', async (request, reply) => {
    const motivo = String((request.body && request.body.motivo) || 'Cancelamento solicitado pelo prestador').trim();
    const atualizada = notaRepo.markCanceled(request.params.id, motivo, new Date().toISOString());
    if (!atualizada) return reply.code(404).send({ error: 'Nota não encontrada.' });
    return atualizada;
  });

  fastify.get('/api/notas/:id/xml', async (request, reply) => {
    const arq = nfseService.obterXml(request.params.id);
    if (!arq) return reply.code(404).send({ error: 'XML disponível apenas para notas emitidas.' });
    return reply
      .header('Content-Type', 'application/xml; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${arq.filename}"`)
      .send(arq.xml);
  });

  fastify.get('/api/notas/:id/danfse-pdf', async (request, reply) => {
    try {
      const pdf = await nfseService.obterDanfsePdf(request.params.id);
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="danfse-${request.params.id}.pdf"`)
        .send(pdf);
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });
}

module.exports = { registerApiRoutes };
