import React, { useMemo } from 'react';
import {
  FileText,
  ShieldCheck,
  RefreshCw,
  Building2,
  QrCode,
  FileCode2,
  ArrowRight,
  Eye,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';
import { moeda } from '@/lib/utils';

export function HomePage({
  prestador,
  notas = [],
  tomadores = [],
  templates = [],
  syncing = false,
  onNavigate,
  onSync,
  onVerDanfse
}) {
  const { t, messages } = useI18n();
  const h = messages.home;
  const c = messages.common;

  const emitidas = useMemo(() => notas.filter((n) => (n.direcao || 'emitida') === 'emitida'), [notas]);
  const recebidas = useMemo(() => notas.filter((n) => n.direcao === 'recebida'), [notas]);

  const totalEmitido = useMemo(
    () => emitidas.filter((n) => n.status !== 'cancelada').reduce((acc, n) => acc + (Number(n.tributos?.valorLiquido) || 0), 0),
    [emitidas]
  );
  const totalRecebido = useMemo(
    () => recebidas.filter((n) => n.status !== 'cancelada').reduce((acc, n) => acc + (Number(n.tributos?.valorLiquido) || 0), 0),
    [recebidas]
  );

  const ultimasEmitidas = useMemo(() => emitidas.slice(0, 5), [emitidas]);
  const isProducao = prestador?.ambiente === 'producao';

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <img
              src="/barao-logo.jpg"
              alt={c.brand.title}
              className="hidden size-14 shrink-0 rounded-xl object-cover ring-1 ring-border sm:block"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {prestador?.nomeFantasia || prestador?.razaoSocial || c.brand.title}
                </h2>
                <Badge variant={isProducao ? 'default' : 'secondary'}>
                  {isProducao ? c.environment.producao : c.environment.homologacaoTestes}
                </Badge>
                {prestador?.certificadoPath ? (
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                    {h.banner.certActive}
                  </Badge>
                ) : (
                  <Badge variant="destructive">{h.banner.certPending}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{h.banner.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button onClick={() => onNavigate('emitir')}>
              <FileText /> {c.nav.emitir}
            </Button>
            <Button variant="outline" disabled={syncing} onClick={onSync}>
              <RefreshCw className={syncing ? 'animate-spin' : ''} />
              {syncing ? c.actions.syncing : c.actions.syncAdn}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => onNavigate('notas')}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">{h.kpis.emitidas}</p>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-num">{emitidas.length}</span>
              <span className="text-xs font-semibold text-emerald-700 font-mono-num">{moeda(totalEmitido)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => onNavigate('notas')}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">{h.kpis.recebidas}</p>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-num">{recebidas.length}</span>
              <span className="text-xs font-medium text-muted-foreground font-mono-num">{moeda(totalRecebido)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => onNavigate('tomadores')}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">{h.kpis.tomadoresTemplates}</p>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-num">{tomadores.length}</span>
              <span className="text-xs text-muted-foreground">{t('home.kpis.templatesCount', { count: templates.length })}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => onNavigate('prestador')}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">{h.kpis.identidade}</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-sm font-semibold">{prestador?.temLogo ? h.kpis.logoOk : h.kpis.logoEmpty}</span>
              <Building2 className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4 text-emerald-600" />
              {h.guides.privacyTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-muted-foreground">
            {h.guides.privacyBody}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileCode2 className="size-4 text-primary" />
              {h.guides.legalTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-muted-foreground">
            {h.guides.legalBody}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <QrCode className="size-4 text-primary" />
              {h.guides.authTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-muted-foreground">
            {h.guides.authBody}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">{h.recent.title}</CardTitle>
            <CardDescription>{h.recent.subtitle}</CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onNavigate('notas')}>
            {h.recent.viewAll} <ArrowRight />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {ultimasEmitidas.length === 0 ? (
            <div className="px-6 py-8 text-center text-xs text-muted-foreground">
              {h.recent.empty}
            </div>
          ) : (
            <div className="divide-y">
              {ultimasEmitidas.map((n) => (
                <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm hover:bg-muted/20">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num text-xs font-semibold">#{n.numero || messages.notas.table.rascunho}</span>
                      <span className="truncate font-medium">{n.tomador?.nome || '-'}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {(n.dataEmissao || '').slice(0, 10)} • {n.servico?.discriminacao}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num text-xs font-semibold">{moeda(n.tributos?.valorLiquido)}</span>
                    <Button size="icon-sm" variant="ghost" title={h.recent.viewDanfse} onClick={() => onVerDanfse(n)}>
                      <Eye />
                    </Button>
                    {n.chaveAcesso && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title={h.recent.portalGov}
                        nativeButton={false}
                        render={
                          <a
                            href={`https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${encodeURIComponent(n.chaveAcesso)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        <ExternalLink className="text-emerald-700" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
