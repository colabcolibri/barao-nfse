'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { gerarDanfsePdfBuffer } = require('../src/infra/danfsePdfGenerator');

// PNG 1x1 válido mínimo para testar incorporação de logo no PDF
const PNG_1X1_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('gerarDanfsePdfBuffer gera PDF válido com QR Code e com ou sem logo', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'barao-pdf-'));
  const logoPath = path.join(tmpDir, 'logo.png');
  fs.writeFileSync(logoPath, Buffer.from(PNG_1X1_BASE64, 'base64'));

  try {
    const nota = {
      numero: 4,
      dpsNumero: 4,
      dpsSerie: '1',
      ambiente: 'producao',
      dataEmissao: '2026-11-27T02:29:06.000Z',
      competencia: '2026-11-26',
      chaveAcesso: '35499042211222333000181000000000000426110000000001',
      prestadorSnapshot: {
        cnpj: '11222333000181',
        razaoSocial: 'BARÃO TECNOLOGIA LTDA',
        nomeFantasia: 'BARÃO TECH',
        municipio: 'São José dos Campos',
        uf: 'SP'
      },
      tomador: { documento: '52998224725', nome: 'CLIENTE EXEMPLO LTDA', municipio: 'São Paulo', uf: 'SP' },
      servico: { cTribNac: '170101', cNBS: '114011100', discriminacao: 'Assessoria mensal' },
      tributos: { valorServicos: 5058, descontoIncondicionado: 0, baseCalculo: 5058, aliquotaIss: 2, valorIss: 0, totalRetencoesFederais: 0, valorLiquido: 5058 }
    };

    const pdfSemLogo = await gerarDanfsePdfBuffer(nota, {});
    assert.ok(Buffer.isBuffer(pdfSemLogo));
    assert.ok(pdfSemLogo.length > 2000);
    assert.equal(pdfSemLogo.subarray(0, 5).toString('utf8'), '%PDF-');
    assert.equal((pdfSemLogo.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 1);

    const pdfComLogo = await gerarDanfsePdfBuffer(nota, { logoPath });
    assert.ok(Buffer.isBuffer(pdfComLogo));
    assert.ok(pdfComLogo.length > pdfSemLogo.length);
    assert.equal(pdfComLogo.subarray(0, 5).toString('utf8'), '%PDF-');
    assert.equal((pdfComLogo.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 1);

    const pdfCanceladaHom = await gerarDanfsePdfBuffer(
      {
        ...nota,
        ambiente: 'homologacao',
        status: 'cancelada',
        motivoCancelamento: 'Teste de cancelamento',
        tributos: {
          ...nota.tributos,
          retencaoIrrf: 75.87,
          retencaoPis: 32.88,
          retencaoCofins: 151.74,
          retencaoCsll: 50.58,
          retencaoCp: 0,
          totalRetencoesFederais: 311.07,
          valorLiquido: 4746.93
        }
      },
      { logoPath }
    );
    assert.equal(pdfCanceladaHom.subarray(0, 5).toString('utf8'), '%PDF-');
    assert.equal((pdfCanceladaHom.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
