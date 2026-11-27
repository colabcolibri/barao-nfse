import React from 'react';
import { Printer, Download, FileText, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/i18n';
import { moeda } from '@/lib/utils';

function DanfseSheet({ nota, prestador }) {
  if (!nota) return null;
  const p = nota.prestadorSnapshot || prestador || {};
  const t = nota.tributos || {};

  return (
    <div className="space-y-4 text-xs text-zinc-900">
      {/* Cabeçalho estilo DANFSE Oficial */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-zinc-900 pb-3">
        <div className="flex items-start gap-3">
          {prestador?.temLogo && (
            <img
              src="/api/prestador/logo"
              alt="Logo"
              className="size-12 shrink-0 rounded-md border border-zinc-200 bg-white object-contain p-1"
            />
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Documento Auxiliar da Nota Fiscal de Serviço Eletrônica
            </p>
            <h2 className="mt-0.5 text-base font-bold tracking-tight text-zinc-950">
              DANFSE — Padrão Nacional
            </h2>
            <p className="mt-0.5 text-xs text-zinc-600">
              Município Emissor: {p.municipio || 'São José dos Campos'} - {p.uf || 'SP'}
            </p>
          </div>
        </div>
        <div className="rounded-md border border-zinc-300 bg-zinc-50 px-3.5 py-2 text-right font-mono-num">
          <p className="text-[10px] uppercase text-zinc-500">Número NFS-e</p>
          <p className="text-base font-bold text-zinc-950">{nota.numero || 'RASCUNHO'}</p>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            Emissão: {(nota.dataEmissao || '').slice(0, 19).replace('T', ' ')}
          </p>
        </div>
      </div>

      {nota.chaveAcesso && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-300 bg-zinc-50/70 px-3 py-2 font-mono-num text-[11px]">
          <div className="min-w-0">
            <span className="font-sans text-[10px] font-semibold uppercase text-zinc-500">Chave de Acesso: </span>
            <span className="break-all font-medium text-zinc-900">{nota.chaveAcesso}</span>
          </div>
          <a
            href={`https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${encodeURIComponent(nota.chaveAcesso)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 font-sans text-[11px] font-semibold text-emerald-700 hover:underline"
          >
            Consulta Pública <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      {nota.status === 'cancelada' && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
          <strong>NOTA FISCAL CANCELADA</strong> — Motivo: {nota.motivoCancelamento}
        </div>
      )}

      {/* Prestador e Tomador */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-zinc-300 p-3.5">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Prestador de Serviços
          </p>
          <p className="text-sm font-semibold text-zinc-950">{p.razaoSocial || '-'}</p>
          <p className="mt-1 font-mono-num text-[11px] text-zinc-700">
            CNPJ: {p.cnpj || '-'} {p.inscricaoMunicipal ? `• IM: ${p.inscricaoMunicipal}` : ''}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            {[p.logradouro, p.numero, p.bairro].filter(Boolean).join(', ')}
            {p.municipio ? ` — ${p.municipio}/${p.uf}` : ''}
          </p>
        </div>

        <div className="rounded-md border border-zinc-300 p-3.5">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Tomador de Serviços
          </p>
          <p className="text-sm font-semibold text-zinc-950">{nota.tomador?.nome || '-'}</p>
          <p className="mt-1 font-mono-num text-[11px] text-zinc-700">
            CPF/CNPJ: {nota.tomador?.documento || '-'}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            {[nota.tomador?.municipio, nota.tomador?.uf].filter(Boolean).join('/') || nota.tomador?.email || '-'}
          </p>
        </div>
      </div>

      {/* Serviço */}
      <div className="rounded-md border border-zinc-300 p-3.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Discriminação dos Serviços
          </p>
          <p className="font-mono-num text-[11px] text-zinc-600">
            cTribNac: <strong className="text-zinc-900">{nota.servico?.cTribNac}</strong>
            {nota.servico?.cNBS ? ` • NBS: ${nota.servico.cNBS}` : ''}
            {` • Comp.: ${nota.competencia}`}
          </p>
        </div>
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-900">
          {nota.servico?.discriminacao}
        </p>
        {nota.servico?.infoComplementar && (
          <p className="border-t border-zinc-200 pt-2 text-[11px] text-zinc-600">
            <strong>Obs.:</strong> {nota.servico.infoComplementar}
          </p>
        )}
      </div>

      {/* Tabela de Valores */}
      <div className="overflow-hidden rounded-md border border-zinc-300">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            <tr>
              <th className="px-3 py-2">Valor Bruto</th>
              <th className="px-3 py-2">Descontos</th>
              <th className="px-3 py-2">Base Cálculo</th>
              <th className="px-3 py-2">ISS ({Number(t.aliquotaIss || 0).toFixed(2)}%)</th>
              <th className="px-3 py-2">Ret. Federais</th>
              <th className="px-3 py-2 text-right">Valor Líquido</th>
            </tr>
          </thead>
          <tbody className="font-mono-num">
            <tr className="border-t border-zinc-200">
              <td className="px-3 py-2.5 font-medium">{moeda(t.valorServicos)}</td>
              <td className="px-3 py-2.5 font-medium">{moeda(t.descontoIncondicionado)}</td>
              <td className="px-3 py-2.5 font-medium">{moeda(t.baseCalculo)}</td>
              <td className="px-3 py-2.5 font-medium">{moeda(t.valorIss)}</td>
              <td className="px-3 py-2.5 font-medium">{moeda(t.totalRetencoesFederais)}</td>
              <td className="px-3 py-2.5 text-right text-sm font-bold text-emerald-700">
                {moeda(t.valorLiquido)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DanfseModal({ nota, prestador, onClose }) {
  const { t, messages } = useI18n();
  const dm = messages.notas.danfseModal;
  const sheetRef = React.useRef(null);

  function handlePrintClean() {
    if (!sheetRef.current) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8">${styles}<style>@page{size:A4;margin:12mm;}body{background:#fff;padding:0;margin:0;}</style></head><body>${sheetRef.current.outerHTML}</body></html>`);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  }

  return (
    <Dialog open={Boolean(nota)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2.5">
            <DialogTitle className="text-base">
              {nota?.numero ? t('notas.danfseModal.titleNumber', { numero: nota.numero }) : dm.titleDraft}
            </DialogTitle>
            {nota?.status === 'cancelada' ? (
              <Badge variant="destructive">{messages.common.status.cancelada}</Badge>
            ) : nota?.status === 'emitida_nacional' ? (
              <Badge variant="default">{dm.badgeNacional}</Badge>
            ) : (
              <Badge variant="secondary">{dm.badgeLocal}</Badge>
            )}
          </div>
          <DialogDescription className="font-mono-num text-xs">
            {nota?.chaveAcesso
              ? `${dm.chaveLabel} ${nota.chaveAcesso}`
              : `${dm.verifLabel} ${nota?.codigoVerificacao || '-'}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 overflow-hidden [&_[data-slot=scroll-area-viewport]]:!overflow-x-hidden [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!min-w-0">
          <div ref={sheetRef} className="px-6 py-5">
            <DanfseSheet nota={nota} prestador={prestador} />
          </div>
        </ScrollArea>

        <DialogFooter className="mx-0 mb-0 shrink-0 border-t bg-muted/40 px-6 py-4 sm:justify-between">
          <div className="flex items-center gap-2">
            {nota?.numero && (
              <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/api/notas/${nota.id}/xml`} download />}>
                <Download /> XML
              </Button>
            )}
            {nota?.numero && (
              <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/api/notas/${nota.id}/danfse-pdf`} download={`danfse-${nota.numero}.pdf`} />}>
                <FileText /> Baixar PDF
              </Button>
            )}
            {nota?.chaveAcesso && (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={
                  <a
                    href={`https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${encodeURIComponent(nota.chaveAcesso)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ExternalLink /> Portal Gov
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>Fechar</Button>
            <Button size="sm" onClick={handlePrintClean}>
              <Printer /> Imprimir Resumo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
