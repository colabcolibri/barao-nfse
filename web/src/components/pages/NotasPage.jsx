import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Download, FileText, Ban, Receipt, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FieldSelect } from '@/components/shell/FieldSelect';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useI18n } from '@/i18n';
import { moeda } from '@/lib/utils';

const PAGE_SIZE = 20;

export function NotasPage({ notas, onVerDanfse, onCancelar, onIrEmitir }) {
  const { t, messages } = useI18n();
  const nm = messages.notas;
  const cm = messages.common;

  const STATUS_BADGE = {
    emitida_nacional: <Badge variant="default">{cm.status.emitida_nacional}</Badge>,
    emitida_local: <Badge variant="secondary">{cm.status.emitida_local}</Badge>,
    rascunho: <Badge variant="outline">{cm.status.rascunho}</Badge>,
    cancelada: <Badge variant="destructive">{cm.status.cancelada}</Badge>
  };
  const [direcao, setDirecao] = useState(() => {
    try {
      const saved = localStorage.getItem('barao_notas_direcao');
      return saved === 'recebida' ? 'recebida' : 'emitida';
    } catch {
      return 'emitida';
    }
  });
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    try {
      localStorage.setItem('barao_notas_direcao', direcao);
    } catch {
      // ignora erro de storage
    }
  }, [direcao]);

  const emitidas = useMemo(() => notas.filter((n) => (n.direcao || 'emitida') === 'emitida'), [notas]);
  const recebidas = useMemo(() => notas.filter((n) => n.direcao === 'recebida'), [notas]);

  const totalEmitido = useMemo(
    () => emitidas.reduce((acc, n) => acc + (Number(n.tributos?.valorLiquido) || 0), 0),
    [emitidas]
  );
  const totalRecebido = useMemo(
    () => recebidas.reduce((acc, n) => acc + (Number(n.tributos?.valorLiquido) || 0), 0),
    [recebidas]
  );

  const filtradas = useMemo(() => {
    const base = direcao === 'emitida' ? emitidas : recebidas;
    const q = busca.trim().toLowerCase();
    return base.filter((n) => {
      if (filtroStatus !== 'todos' && n.status !== filtroStatus) return false;
      if (!q) return true;
      const contraparte = direcao === 'emitida' ? n.tomador?.nome : n.prestadorSnapshot?.razaoSocial;
      const doc = direcao === 'emitida' ? n.tomador?.documento : n.prestadorSnapshot?.cnpj;
      const renderPagination = (position) => {
    if (totalPaginas <= 1) return null;
    return (
      <div className={`flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground ${position === 'top' ? 'border-b bg-muted/15' : 'border-t'}`}>
        <span>
          {t('notas.pagination.showing', {
            from: (paginaSegura - 1) * PAGE_SIZE + 1,
            to: Math.min(paginaSegura * PAGE_SIZE, filtradas.length),
            total: filtradas.length,
            current: paginaSegura,
            pages: totalPaginas
          })}
        </span>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" disabled={paginaSegura <= 1} onClick={() => setPagina((p) => p - 1)}>
            <ChevronLeft /> {nm.pagination.prev}
          </Button>
          <Button size="sm" variant="outline" disabled={paginaSegura >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
            {nm.pagination.next} <ChevronRight />
          </Button>
        </div>
      </div>
    );
  };

  return (
        String(n.numero || '').includes(q) ||
        (contraparte || '').toLowerCase().includes(q) ||
        (doc || '').toLowerCase().includes(q) ||
        (n.servico?.discriminacao || '').toLowerCase().includes(q)
      );
    });
  }, [direcao, emitidas, recebidas, busca, filtroStatus]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const paginadas = filtradas.slice((paginaSegura - 1) * PAGE_SIZE, paginaSegura * PAGE_SIZE);

  const renderPagination = (position) => {
    if (totalPaginas <= 1) return null;
    return (
      <div className={`flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground ${position === 'top' ? 'border-b bg-muted/15' : 'border-t'}`}>
        <span>
          {t('notas.pagination.showing', {
            from: (paginaSegura - 1) * PAGE_SIZE + 1,
            to: Math.min(paginaSegura * PAGE_SIZE, filtradas.length),
            total: filtradas.length,
            current: paginaSegura,
            pages: totalPaginas
          })}
        </span>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" disabled={paginaSegura <= 1} onClick={() => setPagina((p) => p - 1)}>
            <ChevronLeft /> {nm.pagination.prev}
          </Button>
          <Button size="sm" variant="outline" disabled={paginaSegura >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
            {nm.pagination.next} <ChevronRight />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Emitidas por mim</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-num">{emitidas.length}</span>
              <span className="text-xs font-medium text-emerald-700 font-mono-num">{moeda(totalEmitido)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Recebidas (contra meu CNPJ)</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-num">{recebidas.length}</span>
              <span className="text-xs font-medium text-muted-foreground font-mono-num">{moeda(totalRecebido)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Exibindo nesta lista</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-num">{filtradas.length}</span>
              <span className="text-xs text-muted-foreground">Página {paginaSegura} de {totalPaginas}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={direcao}
            onValueChange={(v) => {
              setDirecao(v);
              setPagina(1);
            }}
          >
            <TabsList>
              <TabsTrigger value="emitida">Emitidas por mim ({emitidas.length})</TabsTrigger>
              <TabsTrigger value="recebida">Recebidas ({recebidas.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="w-56"
              placeholder={direcao === 'emitida' ? 'Buscar cliente, nº ou serviço...' : 'Buscar fornecedor, nº ou serviço...'}
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
            />
            <div className="w-40">
              <FieldSelect
                value={filtroStatus}
                options={[
                  { value: 'todos', label: 'Todos os status' },
                  { value: 'emitida_nacional', label: 'Nacional' },
                  { value: 'emitida_local', label: 'Local' },
                  { value: 'rascunho', label: 'Rascunho' },
                  { value: 'cancelada', label: 'Cancelada' }
                ]}
                onValueChange={(v) => {
                  setFiltroStatus(v);
                  setPagina(1);
                }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {paginadas.length > 0 && renderPagination('top')}
          {paginadas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Receipt className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">
                {direcao === 'emitida' ? 'Nenhuma nota emitida encontrada' : 'Nenhuma nota recebida encontrada'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {direcao === 'emitida'
                  ? 'Emita uma nova NFS-e ou clique em Sincronizar Portal Nacional.'
                  : 'Clique em Sincronizar Portal Nacional para importar notas emitidas contra seu CNPJ.'}
              </p>
              {direcao === 'emitida' && (
                <Button size="sm" className="mt-4" onClick={onIrEmitir}>Emitir NFS-e</Button>
              )}
            </div>
          ) : (
            <ScrollArea className="w-full">
              <table className="w-full table-auto text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-3 whitespace-nowrap">Nº</th>
                    <th className="px-3 py-3 whitespace-nowrap">Data</th>
                    <th className="px-3 py-3">{direcao === 'emitida' ? 'Tomador (Cliente)' : 'Prestador (Fornecedor)'}</th>
                    <th className="px-3 py-3">Serviço</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Valor</th>
                    <th className="px-3 py-3 whitespace-nowrap">Status</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginadas.map((n) => {
                    const contraparteNome = direcao === 'emitida'
                      ? (n.tomador?.nome || '-')
                      : (n.prestadorSnapshot?.razaoSocial || 'Fornecedor');
                    const contraparteDoc = direcao === 'emitida'
                      ? (n.tomador?.documento || '')
                      : (n.prestadorSnapshot?.cnpj || '');

                    const renderPagination = (position) => {
    if (totalPaginas <= 1) return null;
    return (
      <div className={`flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground ${position === 'top' ? 'border-b bg-muted/15' : 'border-t'}`}>
        <span>
          {t('notas.pagination.showing', {
            from: (paginaSegura - 1) * PAGE_SIZE + 1,
            to: Math.min(paginaSegura * PAGE_SIZE, filtradas.length),
            total: filtradas.length,
            current: paginaSegura,
            pages: totalPaginas
          })}
        </span>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" disabled={paginaSegura <= 1} onClick={() => setPagina((p) => p - 1)}>
            <ChevronLeft /> {nm.pagination.prev}
          </Button>
          <Button size="sm" variant="outline" disabled={paginaSegura >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
            {nm.pagination.next} <ChevronRight />
          </Button>
        </div>
      </div>
    );
  };

  return (
                      <tr key={n.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-3 py-3 whitespace-nowrap font-mono-num text-xs font-semibold">
                          {n.numero ? `#${n.numero}` : <span className="font-sans font-normal text-muted-foreground">Rascunho</span>}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap font-mono-num text-xs text-muted-foreground">
                          {(n.dataEmissao || '').slice(0, 10)}
                        </td>
                        <td className="px-3 py-3 max-w-[175px]">
                          <div className="truncate font-medium text-foreground" title={contraparteNome}>{contraparteNome}</div>
                          <div className="truncate font-mono-num text-[11px] text-muted-foreground">{contraparteDoc}</div>
                        </td>
                        <td className="px-3 py-3 max-w-[185px]">
                          <div className="truncate text-xs text-muted-foreground" title={n.servico?.discriminacao}>
                            <span className="font-mono-num text-foreground/80">{n.servico?.cTribNac}</span> — {n.servico?.discriminacao}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap font-mono-num text-xs font-semibold">
                          {moeda(n.tributos?.valorLiquido || n.tributos?.valorServicos)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {STATUS_BADGE[n.status]}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <Button size="icon-sm" variant="ghost" title="Ver DANFSE" onClick={() => onVerDanfse(n)}>
                              <Eye />
                            </Button>
                            {n.numero && (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                title="Baixar XML"
                                nativeButton={false}
                                render={<a href={`/api/notas/${n.id}/xml`} download />}
                              >
                                <Download />
                              </Button>
                            )}
                            {n.numero && (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                title="Baixar PDF (DANFSE)"
                                nativeButton={false}
                                render={<a href={`/api/notas/${n.id}/danfse-pdf`} download={`danfse-${n.numero}.pdf`} />}
                              >
                                <FileText />
                              </Button>
                            )}
                            {n.chaveAcesso && (
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                title="Abrir na Consulta Pública (Portal Gov)"
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
                            {direcao === 'emitida' && (n.status === 'emitida_local' || n.status === 'emitida_nacional') && (
                              <Button size="icon-sm" variant="ghost" title="Cancelar NFS-e" onClick={() => onCancelar(n)}>
                                <Ban className="text-destructive" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {paginadas.length > 0 && renderPagination('bottom')}
        </CardContent>
      </Card>
    </div>
  );
}
