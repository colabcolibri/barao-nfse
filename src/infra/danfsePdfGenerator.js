'use strict';

const fs = require('node:fs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { formatarCpfCnpj } = require('../domain/validators');
const { CODIGOS_SERVICO_NACIONAL, TRIBUTACAO_ISSQN } = require('../config/constants');

const COLORS = {
  ink: '#0f172a',
  inkSoft: '#334155',
  muted: '#64748b',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  surface: '#f8fafc',
  surfaceAlt: '#f1f5f9',
  emerald: '#047857',
  emeraldBg: '#ecfdf5',
  emeraldBorder: '#a7f3d0',
  danger: '#b91c1c',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  white: '#ffffff'
};

function moeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataHora(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 19).replace('T', ' ');
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatarDataCurta(str) {
  if (!str) return '-';
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return String(str);
}

function formatarCep(cep) {
  const d = String(cep || '').replace(/\D/g, '');
  if (d.length === 8) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return cep || '';
}

function formatarCTribNac(code) {
  const d = String(code || '').replace(/\D/g, '');
  if (d.length === 6) return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}`;
  return code || '-';
}

function obterDescricaoCTribNac(code) {
  const d = String(code || '').replace(/\D/g, '');
  const item = CODIGOS_SERVICO_NACIONAL.find((c) => c.cTribNac === d);
  if (!item) return null;
  return item.descricao.replace(/^\d{2}\.\d{2}\.\d{2}\s*-\s*/, '');
}

function obterLabelTributacaoIssqn(codigo) {
  const item = TRIBUTACAO_ISSQN.find((t) => t.codigo === String(codigo || '1'));
  if (!item) return 'Operação Tributável';
  return item.label.replace(/^\d+\s*-\s*/, '');
}

function carregarLogoBuffer(prestadorAtual, nota) {
  const candidates = [prestadorAtual?.logoPath, nota?.prestadorSnapshot?.logoPath].filter(Boolean);
  for (const logoPath of candidates) {
    try {
      if (fs.existsSync(logoPath)) {
        return fs.readFileSync(logoPath);
      }
    } catch {
      // ignora erro de leitura de logo
    }
  }
  return null;
}

function desenharMonograma(doc, x, y, size, nome) {
  const iniciais = String(nome || 'NF')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase() || 'NF';

  doc.roundedRect(x, y, size, size, 7).fillAndStroke(COLORS.ink, COLORS.ink);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.white)
    .text(iniciais, x, y + size / 2 - 8, { width: size, align: 'center', lineBreak: false });
}

function montarLinhasEndereco(entidade) {
  const linha1 = [
    entidade?.logradouro,
    entidade?.numero ? `nº ${entidade.numero}` : '',
    entidade?.complemento,
    entidade?.bairro
  ].filter(Boolean).join(', ');

  const linha2 = [
    entidade?.municipio && entidade?.uf ? `${entidade.municipio} - ${entidade.uf}` : (entidade?.municipio || ''),
    entidade?.cep ? `CEP ${formatarCep(entidade.cep)}` : '',
    entidade?.codigoMunicipioIbge ? `IBGE ${entidade.codigoMunicipioIbge}` : ''
  ].filter(Boolean).join(' • ');

  return [linha1, linha2].filter(Boolean);
}

function desenharMarcaDagua(doc, texto) {
  const cx = doc.page.width / 2;
  const cy = doc.page.height / 2;
  doc.save();
  doc.translate(cx, cy);
  doc.rotate(-34);
  doc.opacity(0.11);
  doc.font('Helvetica-Bold').fontSize(68).fillColor(COLORS.danger)
    .text(texto, -260, -34, { width: 520, align: 'center', lineBreak: false });
  doc.restore();
  doc.opacity(1);
}

/**
 * Gera PDF A4 em página única seguindo as diretrizes da NT 008 (DANFSe v2.0)
 * com visual limpo e executivo, sem campos vazios desnecessários.
 */
async function gerarDanfsePdfBuffer(nota, prestadorAtual) {
  const p = { ...(prestadorAtual || {}), ...(nota.prestadorSnapshot || {}) };
  const t = nota.tributos || {};
  const isProd = nota.ambiente === 'producao';
  const logoBuffer = carregarLogoBuffer(prestadorAtual, nota);

  const urlConsulta = nota.chaveAcesso
    ? `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${encodeURIComponent(nota.chaveAcesso)}`
    : 'https://www.nfse.gov.br/ConsultaPublica';

  let qrBuffer = null;
  if (nota.chaveAcesso) {
    qrBuffer = await QRCode.toBuffer(urlConsulta, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' }
    });
  }

  const situacaoTexto = nota.status === 'cancelada'
    ? 'Cancelada'
    : (nota.status === 'rascunho' ? 'Rascunho' : 'NFS-e Gerada');

  const localPrestacao = p.municipio && p.uf ? `${p.municipio}/${p.uf}` : (p.municipio || 'São José dos Campos/SP');
  const tipoTributacao = obterLabelTributacaoIssqn(t.tribISSQN);
  const descCodigoServico = obterDescricaoCTribNac(nota.servico?.cTribNac);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 20, bottom: 18, left: 32, right: 32 }
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = 32;
    const width = doc.page.width - 64; // 531.28pt

    // Barra superior de identidade fiscal
    doc.rect(0, 0, doc.page.width, 4).fill(isProd ? COLORS.ink : COLORS.danger);

    let y = 18;

    // ================= CABEÇALHO DANFSe v2.0 =================
    const headerH = 92;
    doc.roundedRect(left, y, width, headerH, 8).fillAndStroke(COLORS.white, COLORS.borderStrong);

    // 1. Logo à esquerda
    const logoSize = 54;
    const logoX = left + 12;
    const logoY = y + 19;
    let logoRendered = false;
    if (logoBuffer) {
      try {
        doc.roundedRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4, 6).fillAndStroke(COLORS.surface, COLORS.border);
        doc.image(logoBuffer, logoX, logoY, { fit: [logoSize, logoSize], align: 'center', valign: 'center' });
        logoRendered = true;
      } catch {
        logoRendered = false;
      }
    }
    if (!logoRendered) {
      desenharMonograma(doc, logoX, logoY, logoSize, p.nomeFantasia || p.razaoSocial);
    }

    // 3. QR Code no canto superior direito
    const qrBoxSize = 74;
    const qrBoxX = left + width - qrBoxSize - 9;
    const qrBoxY = y + 9;
    if (qrBuffer) {
      doc.roundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 6).fillAndStroke(COLORS.surface, COLORS.border);
      doc.image(qrBuffer, qrBoxX + 4, qrBoxY + 4, { width: qrBoxSize - 8, height: qrBoxSize - 8 });
    }

    // 2. Box Número / Série / Emissão à esquerda do QR Code
    const numBoxW = 132;
    const numBoxX = (qrBuffer ? qrBoxX : left + width - 9) - numBoxW - 8;
    const numBoxY = y + 9;
    const numBoxH = headerH - 18;
    doc.roundedRect(numBoxX, numBoxY, numBoxW, numBoxH, 6).fillAndStroke(COLORS.surface, COLORS.border);

    doc.font('Helvetica-Bold').fontSize(6.6).fillColor(COLORS.muted)
      .text('NÚMERO DA NFS-e', numBoxX + 8, numBoxY + 7, { width: numBoxW - 16, align: 'right', lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(16.5).fillColor(COLORS.ink)
      .text(String(nota.numero || 'RASCUNHO'), numBoxX + 8, numBoxY + 16, { width: numBoxW - 16, align: 'right', lineBreak: false });

    const serieInfo = `Série ${nota.dpsSerie || '1'}${nota.dpsNumero ? ` • DPS ${nota.dpsNumero}` : ''}`;
    doc.font('Helvetica-Bold').fontSize(7.4).fillColor(COLORS.inkSoft)
      .text(serieInfo, numBoxX + 8, numBoxY + 37, { width: numBoxW - 16, align: 'right', lineBreak: false });

    doc.font('Helvetica').fontSize(6.8).fillColor(COLORS.muted)
      .text(`Emissão: ${formatarDataHora(nota.dataEmissao)}`, numBoxX + 8, numBoxY + 49, { width: numBoxW - 16, align: 'right', lineBreak: false });

    doc.font('Helvetica').fontSize(6.8).fillColor(COLORS.muted)
      .text(`Comp.: ${formatarDataCurta(nota.competencia)}`, numBoxX + 8, numBoxY + 59, { width: numBoxW - 16, align: 'right', lineBreak: false });

    // Identificação da empresa e título DANFSe v2.0
    const titleX = logoX + logoSize + 12;
    const titleW = numBoxX - titleX - 10;
    const nomeEmpresa = p.nomeFantasia || p.razaoSocial || 'Prestador de Serviços';

    doc.font('Helvetica-Bold').fontSize(7.1).fillColor(COLORS.muted)
      .text('DANFSe v2.0  •  DOCUMENTO AUXILIAR DA NFS-e', titleX, y + 13, { width: titleW, lineBreak: false, ellipsis: true });

    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(COLORS.ink)
      .text(nomeEmpresa, titleX, y + 26, { width: titleW, height: 17, ellipsis: true });

    doc.font('Helvetica').fontSize(7.7).fillColor(COLORS.inkSoft)
      .text(
        `CNPJ ${formatarCpfCnpj(p.cnpj) || '-'}${p.inscricaoMunicipal ? `  •  IM ${p.inscricaoMunicipal}` : ''}`,
        titleX, y + 48, { width: titleW, lineBreak: false, ellipsis: true }
      );

    doc.font('Helvetica').fontSize(7.4).fillColor(COLORS.muted)
      .text(
        `Município Emissor: ${localPrestacao}  •  Situação: ${situacaoTexto}`,
        titleX, y + 61, { width: titleW, lineBreak: false, ellipsis: true }
      );

    y += headerH + 8;

    // ================= CHAVE DE ACESSO E AUTENTICIDADE =================
    const keyH = 42;
    doc.roundedRect(left, y, width, keyH, 6).fillAndStroke(COLORS.surface, COLORS.border);

    doc.font('Helvetica-Bold').fontSize(6.8).fillColor(COLORS.muted)
      .text('CHAVE DE ACESSO DA NFS-e (50 DÍGITOS)', left + 12, y + 7, { lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(COLORS.emerald)
      .text('Consultar em nfse.gov.br/ConsultaPublica', left + 12, y + 7, {
        width: width - 24,
        align: 'right',
        link: urlConsulta,
        underline: true,
        lineBreak: false
      });

    doc.font('Courier-Bold').fontSize(9.2).fillColor(COLORS.ink)
      .text(nota.chaveAcesso || nota.codigoVerificacao || '-', left + 12, y + 18, { width: width - 24, lineBreak: false, ellipsis: true });

    doc.font('Helvetica').fontSize(6.6).fillColor(COLORS.muted)
      .text(
        'A autenticidade desta NFS-e pode ser verificada pela leitura do QR Code ou pela consulta da chave de acesso no Portal Nacional da NFS-e.',
        left + 12, y + 30, { width: width - 24, lineBreak: false, ellipsis: true }
      );

    y += keyH + 8;

    // ================= AVISOS OBRIGATÓRIOS (HOMOLOGAÇÃO / CANCELAMENTO) =================
    if (!isProd) {
      doc.roundedRect(left, y, width, 22, 5).fillAndStroke(COLORS.dangerBg, COLORS.dangerBorder);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.danger)
        .text('NFS-e SEM VALIDADE JURÍDICA — AMBIENTE DE HOMOLOGAÇÃO', left + 12, y + 6.5, { width: width - 24, align: 'center', lineBreak: false });
      y += 28;
    }

    if (nota.status === 'cancelada') {
      doc.roundedRect(left, y, width, 24, 5).fillAndStroke(COLORS.dangerBg, COLORS.dangerBorder);
      doc.font('Helvetica-Bold').fontSize(7.8).fillColor(COLORS.danger)
        .text(`NOTA FISCAL CANCELADA — Motivo: ${nota.motivoCancelamento || 'Cancelada pelo emitente'}`, left + 12, y + 7.5, { width: width - 24, lineBreak: false, ellipsis: true });
      y += 30;
    }

    // ================= PRESTADOR E TOMADOR =================
    const colGap = 10;
    const colW = (width - colGap) / 2;
    const padX = 11;
    const innerW = colW - padX * 2;

    const prestEnderecos = montarLinhasEndereco(p);
    const prestContato = [p.telefone ? `Tel: ${p.telefone}` : '', p.email].filter(Boolean).join(' • ');
    const prestLines = [
      `CNPJ: ${formatarCpfCnpj(p.cnpj) || '-'}${p.inscricaoMunicipal ? `  •  IM: ${p.inscricaoMunicipal}` : ''}`,
      ...prestEnderecos,
      prestContato
    ].filter(Boolean);

    const tomaEnderecos = montarLinhasEndereco(nota.tomador);
    const tomaContato = [nota.tomador?.telefone ? `Tel: ${nota.tomador.telefone}` : '', nota.tomador?.email].filter(Boolean).join(' • ');
    const tomaLines = [
      `${nota.tomador?.tipoPessoa === 'EXT' ? 'Doc/NIF' : 'CPF/CNPJ'}: ${formatarCpfCnpj(nota.tomador?.documento) || '-'}${nota.tomador?.inscricaoMunicipal ? `  •  IM: ${nota.tomador.inscricaoMunicipal}` : ''}`,
      ...tomaEnderecos,
      tomaContato
    ].filter(Boolean);

    const calcCardH = (nome, lines) => {
      doc.font('Helvetica-Bold').fontSize(8.8);
      const nameH = doc.heightOfString(nome || '-', { width: innerW });
      doc.font('Helvetica').fontSize(7.5);
      const bodyH = lines.reduce((acc, line) => acc + doc.heightOfString(line, { width: innerW }) + 1.5, 0);
      return Math.max(80, 28 + nameH + bodyH + 8);
    };

    const cardH = Math.max(
      calcCardH(p.razaoSocial, prestLines),
      calcCardH(nota.tomador?.nome, tomaLines)
    );

    const desenharEntidadeCard = (x, titulo, nome, lines) => {
      doc.roundedRect(x, y, colW, cardH, 7).fillAndStroke(COLORS.white, COLORS.borderStrong);
      doc.rect(x + 1, y + 1, colW - 2, 18).fill(COLORS.surfaceAlt);
      doc.moveTo(x, y + 19).lineTo(x + colW, y + 19).stroke(COLORS.border);
      doc.font('Helvetica-Bold').fontSize(6.8).fillColor(COLORS.muted)
        .text(titulo, x + padX, y + 6, { width: innerW, lineBreak: false });

      let cy = y + 25;
      doc.font('Helvetica-Bold').fontSize(8.8).fillColor(COLORS.ink)
        .text(nome || '-', x + padX, cy, { width: innerW });
      cy += doc.heightOfString(nome || '-', { width: innerW }) + 3;

      doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.inkSoft);
      for (const line of lines) {
        doc.text(line, x + padX, cy, { width: innerW });
        cy += doc.heightOfString(line, { width: innerW }) + 1.5;
      }
    };

    desenharEntidadeCard(left, 'PRESTADOR / FORNECEDOR', p.razaoSocial || p.nomeFantasia, prestLines);
    desenharEntidadeCard(left + colW + colGap, 'TOMADOR / ADQUIRENTE', nota.tomador?.nome, tomaLines);

    y += cardH + 8;

    // ================= SERVIÇO PRESTADO =================
    const descText = String(nota.servico?.discriminacao || '-');
    const infoText = nota.servico?.infoComplementar ? String(nota.servico.infoComplementar).trim() : '';
    const codigoFormatado = formatarCTribNac(nota.servico?.cTribNac);
    const linhaClassificacao = descCodigoServico
      ? `${codigoFormatado} — ${descCodigoServico}`
      : `Código de Tributação Nacional: ${codigoFormatado}`;

    doc.font('Helvetica-Bold').fontSize(7.6);
    const classH = doc.heightOfString(linhaClassificacao, { width: width - 22 });

    doc.font('Helvetica').fontSize(8.4);
    const descBodyH = doc.heightOfString(descText, { width: width - 22, lineGap: 2 });

    let infoBodyH = 0;
    if (infoText) {
      doc.font('Helvetica').fontSize(7.5);
      infoBodyH = doc.heightOfString(`Observações: ${infoText}`, { width: width - 22, lineGap: 1.5 }) + 10;
    }

    const servCardH = Math.min(265, Math.max(96, 36 + classH + 6 + descBodyH + infoBodyH + 12));
    doc.roundedRect(left, y, width, servCardH, 7).fillAndStroke(COLORS.white, COLORS.borderStrong);
    doc.rect(left + 1, y + 1, width - 2, 19).fill(COLORS.surfaceAlt);
    doc.moveTo(left, y + 20).lineTo(left + width, y + 20).stroke(COLORS.border);

    doc.font('Helvetica-Bold').fontSize(6.8).fillColor(COLORS.muted)
      .text('SERVIÇO PRESTADO', left + 11, y + 6.5, { lineBreak: false });

    const metaServico = [
      `Local da Prestação: ${localPrestacao}`,
      nota.servico?.cNBS ? `NBS: ${nota.servico.cNBS}` : '',
      nota.servico?.codigoInterno ? `Cód. Interno: ${nota.servico.codigoInterno}` : ''
    ].filter(Boolean).join('  •  ');

    doc.font('Helvetica').fontSize(6.9).fillColor(COLORS.inkSoft)
      .text(metaServico, left + 11, y + 6.5, { width: width - 22, align: 'right', lineBreak: false });

    let sy = y + 27;
    doc.font('Helvetica-Bold').fontSize(7.6).fillColor(COLORS.inkSoft)
      .text(linhaClassificacao, left + 11, sy, { width: width - 22 });
    sy += classH + 5;

    const maxTextH = servCardH - (sy - y) - infoBodyH - 10;
    doc.font('Helvetica').fontSize(8.4).fillColor(COLORS.ink)
      .text(descText, left + 11, sy, { width: width - 22, height: maxTextH, lineGap: 2, ellipsis: true });

    if (infoText) {
      const infoY = sy + Math.min(descBodyH, maxTextH) + 6;
      doc.moveTo(left + 11, infoY).lineTo(left + width - 11, infoY).stroke(COLORS.border);
      doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.inkSoft)
        .text(`Observações: ${infoText}`, left + 11, infoY + 5, { width: width - 22, lineGap: 1.5 });
    }

    y += servCardH + 8;

    // ================= TRIBUTAÇÃO MUNICIPAL, RETENÇÕES FEDERAIS E VALOR LÍQUIDO =================
    const tribBoxH = 120;
    doc.roundedRect(left, y, width, tribBoxH, 7).fillAndStroke(COLORS.white, COLORS.borderStrong);

    // Linha 1: ISSQN e Base de Cálculo (5 colunas)
    const totalDescontos = Number(t.descontoIncondicionado || 0) + Number(t.descontoCondicionado || 0) + Number(t.valorDeducoes || 0);
    const row1Cols = [
      { label: 'VALOR DO SERVIÇO', val: moeda(t.valorServicos) },
      { label: 'DESCONTOS / DEDUÇÕES', val: moeda(totalDescontos) },
      { label: 'BASE DE CÁLCULO', val: moeda(t.baseCalculo) },
      { label: 'ALÍQUOTA ISSQN', val: `${Number(t.aliquotaIss || 0).toFixed(2)}%` },
      { label: t.issRetido ? 'ISSQN (RETIDO)' : 'ISSQN APURADO', val: moeda(t.valorIss) }
    ];
    const r1H = 40;
    const r1W = width / row1Cols.length;
    doc.rect(left + 1, y + 1, width - 2, 16).fill(COLORS.surfaceAlt);
    doc.moveTo(left, y + 17).lineTo(left + width, y + 17).stroke(COLORS.border);
    row1Cols.forEach((c, idx) => {
      const cx = left + idx * r1W;
      if (idx > 0) doc.moveTo(cx, y).lineTo(cx, y + r1H).stroke(COLORS.border);
      doc.font('Helvetica-Bold').fontSize(6.2).fillColor(COLORS.muted)
        .text(c.label, cx + 6, y + 5.5, { width: r1W - 12, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8.4).fillColor(COLORS.ink)
        .text(c.val, cx + 6, y + 23, { width: r1W - 12, lineBreak: false });
    });

    // Linha 2: Retenções Federais (6 colunas limpas, sem poluição de IBS/CBS zerado)
    const r2Y = y + r1H;
    const r2H = 40;
    doc.moveTo(left, r2Y).lineTo(left + width, r2Y).stroke(COLORS.borderStrong);
    doc.rect(left + 1, r2Y + 1, width - 2, 16).fill(COLORS.surfaceAlt);
    doc.moveTo(left, r2Y + 17).lineTo(left + width, r2Y + 17).stroke(COLORS.border);

    const row2Cols = [
      { label: 'IRRF RETIDO', val: moeda(t.retencaoIrrf) },
      { label: 'PIS RETIDO', val: moeda(t.retencaoPis) },
      { label: 'COFINS RETIDO', val: moeda(t.retencaoCofins) },
      { label: 'CSLL RETIDA', val: moeda(t.retencaoCsll) },
      { label: 'INSS / CP RETIDO', val: moeda(t.retencaoCp) },
      { label: 'TOTAL RETENÇÕES', val: moeda(t.totalRetencoesFederais) }
    ];
    const r2W = width / row2Cols.length;
    row2Cols.forEach((c, idx) => {
      const cx = left + idx * r2W;
      if (idx > 0) doc.moveTo(cx, r2Y).lineTo(cx, r2Y + r2H).stroke(COLORS.border);
      doc.font('Helvetica-Bold').fontSize(6.2).fillColor(COLORS.muted)
        .text(c.label, cx + 6, r2Y + 5.5, { width: r2W - 12, lineBreak: false });
      doc.font('Helvetica').fontSize(8.1).fillColor(COLORS.inkSoft)
        .text(c.val, cx + 6, r2Y + 23, { width: r2W - 12, lineBreak: false });
    });

    // Linha 3: Barra de Regime / Tributação + Valor Líquido em destaque
    const r3Y = r2Y + r2H;
    const r3H = tribBoxH - r1H - r2H;
    doc.moveTo(left, r3Y).lineTo(left + width, r3Y).stroke(COLORS.borderStrong);
    doc.rect(left + width - 170, r3Y + 1, 169, r3H - 2).fill(COLORS.emeraldBg);
    doc.moveTo(left + width - 170, r3Y).lineTo(left + width - 170, y + tribBoxH).stroke(COLORS.emeraldBorder);

    const regimePartes = [
      p.opSimpNac === '3' ? 'Simples Nacional (ME/EPP)' : (p.opSimpNac === '2' ? 'Simples Nacional (MEI)' : 'Regime Normal'),
      tipoTributacao,
      `Incidência: ${localPrestacao}`,
      Number(t.pTotTribSN || 0) > 0 ? `Trib. Aprox. Lei 12.741/12: ${Number(t.pTotTribSN).toFixed(2)}%` : null
    ].filter(Boolean).join('  •  ');

    doc.font('Helvetica').fontSize(6.9).fillColor(COLORS.inkSoft)
      .text(regimePartes, left + 10, r3Y + 14.5, { width: width - 188, lineBreak: false, ellipsis: true });

    doc.font('Helvetica-Bold').fontSize(6.8).fillColor(COLORS.emerald)
      .text('VALOR LÍQUIDO DA NFS-e', left + width - 162, r3Y + 6, { width: 150, align: 'right', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(12.5).fillColor(COLORS.emerald)
      .text(moeda(t.valorLiquido), left + width - 162, r3Y + 17, { width: 150, align: 'right', lineBreak: false });

    // Marca d'água diagonal obrigatória em notas canceladas
    if (nota.status === 'cancelada') {
      desenharMarcaDagua(doc, 'CANCELADA');
    }

    // ================= RODAPÉ INSTITUCIONAL (SEMPRE PÁGINA 1) =================
    const footerY = doc.page.height - 38;
    doc.moveTo(left, footerY).lineTo(left + width, footerY).stroke(COLORS.border);
    doc.font('Helvetica').fontSize(6.7).fillColor(COLORS.muted)
      .text(
        'Documento Auxiliar da NFS-e (Padrão Nacional). Validade jurídica garantida pelo XML assinado e verificável em nfse.gov.br/ConsultaPublica.',
        left, footerY + 7, { width: width - 110, lineBreak: false, ellipsis: true }
      );
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.inkSoft)
      .text('DANFSe v2.0 • Barão NFS-e', left + width - 105, footerY + 7, { width: 105, align: 'right', lineBreak: false });

    doc.end();
  });
}

module.exports = { gerarDanfsePdfBuffer };
