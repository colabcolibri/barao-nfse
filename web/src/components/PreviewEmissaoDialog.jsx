import React from 'react';
import { Send, ShieldCheck } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/i18n';
import { moeda } from '@/lib/utils';
import { expandirTemplateData } from '@/lib/dateTemplate';

/**
 * Modal de conferência obrigatória antes de transmitir ou emitir a NFS-e.
 */
export function PreviewEmissaoDialog({
  open,
  onOpenChange,
  notaForm,
  prestador,
  resumo,
  submitting,
  errorMessage,
  onConfirm
}) {
  if (!notaForm) return null;

  const isNacional = notaForm.modo === 'nacional';
  const isProducao = prestador?.ambiente === 'producao';
  const discriminacaoFinal = expandirTemplateData(notaForm.servico.discriminacao, notaForm.competencia);
  const infoFinal = expandirTemplateData(notaForm.servico.infoComplementar, notaForm.competencia);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2.5">
            <DialogTitle>Conferência antes de Emitir</DialogTitle>
            {isNacional ? (
              <Badge variant={isProducao ? 'default' : 'secondary'}>
                {isProducao ? 'Produção Oficial' : 'Homologação (Teste)'}
              </Badge>
            ) : (
              <Badge variant="outline">Simulação Local</Badge>
            )}
          </div>
          <DialogDescription>
            Revise os dados abaixo. A nota só será transmitida após sua confirmação.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 overflow-hidden [&_[data-slot=scroll-area-viewport]]:!overflow-x-hidden [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!min-w-0">
          <div className="space-y-4 px-6 py-5 text-sm">
          {errorMessage && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              <strong>Erro ao emitir:</strong> {errorMessage}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prestador</p>
              <p className="mt-1 font-semibold">{prestador?.razaoSocial || '-'}</p>
              <p className="font-mono-num text-xs text-muted-foreground">CNPJ: {prestador?.cnpj || '-'}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tomador</p>
              <p className="mt-1 font-semibold">{notaForm.tomador.nome || '-'}</p>
              <p className="font-mono-num text-xs text-muted-foreground">Doc: {notaForm.tomador.documento || '-'}</p>
            </div>
          </div>

          <div className="rounded-lg border p-3.5 space-y-2">
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground font-mono-num">
              <span>cTribNac: <strong className="text-foreground">{notaForm.servico.cTribNac}</strong></span>
              <span>NBS: <strong className="text-foreground">{notaForm.servico.cNBS || '-'}</strong></span>
              <span>Competência: <strong className="text-foreground">{notaForm.competencia}</strong></span>
            </div>
            <Separator />
            <p className="whitespace-pre-wrap text-xs leading-relaxed">{discriminacaoFinal}</p>
            {infoFinal && (
              <p className="border-t pt-2 text-xs text-muted-foreground">{infoFinal}</p>
            )}
          </div>

          <div className="rounded-lg border bg-emerald-50/60 border-emerald-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 font-mono-num text-xs">
              <div>
                <span className="font-sans text-muted-foreground">Bruto: </span>
                <strong>{moeda(resumo.bruto)}</strong>
                <span className="mx-2 text-muted-foreground">•</span>
                <span className="font-sans text-muted-foreground">ISS ({resumo.aliq.toFixed(2)}%): </span>
                <strong>{moeda(resumo.iss)}</strong>
              </div>
              <div className="text-right">
                <span className="font-sans text-xs text-emerald-800">Valor Líquido: </span>
                <strong className="text-base text-emerald-700">{moeda(resumo.liquido)}</strong>
              </div>
            </div>
          </div>
        </div>
        </ScrollArea>

        <DialogFooter className="mx-0 mb-0 shrink-0 border-t bg-muted/40 px-6 py-4 sm:justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>{isNacional ? 'Assinatura A1 + mTLS' : 'Gravação apenas local'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Voltar e Editar
            </Button>
            <Button type="button" disabled={submitting} onClick={onConfirm}>
              <Send />
              {submitting ? 'Transmitindo...' : 'Confirmar e Emitir'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
