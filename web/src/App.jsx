import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Receipt,
  Users,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  Download,
  Eye,
  Ban,
  CheckCircle2,
  Search,
  Copy,
  Upload,
  Sparkles,
  RefreshCw,
  LayoutTemplate,
  X,
  Pencil,
  Home
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { BaraoShell } from '@/components/shell/BaraoShell';
import { FieldSelect } from '@/components/shell/FieldSelect';
import { FormField } from '@/components/shell/FormField';
import { ConfirmDangerDialog } from '@/components/shell/ConfirmDangerDialog';
import { NotasPage } from '@/components/pages/NotasPage';
import { HomePage } from '@/components/pages/HomePage';
import { DanfseModal } from '@/components/DanfseModal';
import { PreviewEmissaoDialog } from '@/components/PreviewEmissaoDialog';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { expandirTemplateData } from '@/lib/dateTemplate';
import { cn, moeda } from '@/lib/utils';

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

function hojeBrasilia() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const EMPTY_NOTA = (prestador) => ({
  modo: 'nacional',
  competencia: hojeBrasilia(),
  salvarTomador: false,
  tomador: {
    tipoPessoa: 'BR',
    documento: '',
    nome: '',
    inscricaoMunicipal: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
    codigoMunicipioIbge: ''
  },
  servico: {
    cTribNac: '010101',
    cNBS: '115021000',
    codigoInterno: '',
    codigoMunicipioPrestacao: prestador?.codigoMunicipioIbge || '3549904',
    discriminacao: '',
    infoComplementar: ''
  },
  tributos: {
    valorServicos: '',
    descontoIncondicionado: '0',
    descontoCondicionado: '0',
    valorDeducoes: '0',
    tribISSQN: '1',
    tpRetISSQN: '1',
    aliquotaIss: String(prestador?.aliquotaPadraoIss ?? 2.0),
    pTotTribSN: String(prestador?.pTotTribSN ?? 6.0),
    retencaoPis: '0',
    retencaoCofins: '0',
    retencaoCsll: '0',
    retencaoIrrf: '0',
    retencaoCp: '0'
  }
});

const PAGE_META = {
  home: { title: 'Início', subtitle: 'Visão geral, resumo fiscal e guia rápido do Barão NFS-e' },
  emitir: { title: 'Emitir NFS-e', subtitle: 'Padrão Nacional (Sefin Nacional / ADN)' },
  notas: { title: 'Notas Emitidas', subtitle: 'Histórico local em SQLite, XMLs assinados e DANFSE em PDF' },
  templates: { title: 'Templates de Serviço', subtitle: 'Textos fixos, dados bancários/PIX e valores padrão' },
  tomadores: { title: 'Tomadores', subtitle: 'Base de clientes recorrentes para emissão rápida' },
  prestador: { title: 'Prestador & Certificado A1', subtitle: 'Dados cadastrais, regime tributário e assinatura digital' }
};

function expandirVariaveisTemplate(texto) {
  const agora = new Date();
  const mes = agora.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^./, (c) => c.toUpperCase());
  const ano = String(agora.getFullYear());
  return String(texto || '')
    .replace(/\{\{MES\}\}/gi, mes)
    .replace(/\{\{ANO\}\}/gi, ano)
    .replace(/\{\{MES_ANO\}\}/gi, `${mes}/${ano}`);
}

export default function App() {
  const { t, messages } = useI18n();
  const [tab, setTab] = useState(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash && PAGE_META[hash]) return hash;
    try {
      const saved = localStorage.getItem('barao_active_tab');
      if (saved && PAGE_META[saved]) return saved;
    } catch {
      // ignora erro de storage
    }
    return 'home';
  });

  useEffect(() => {
    try {
      localStorage.setItem('barao_active_tab', tab);
    } catch {
      // ignora erro de storage
    }
    if (window.location.hash !== `#${tab}`) {
      window.history.replaceState(null, '', `#${tab}`);
    }
  }, [tab]);
  const [loading, setLoading] = useState(true);
  const [prestador, setPrestador] = useState(null);
  const [tomadores, setTomadores] = useState([]);
  const [notas, setNotas] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [tabelas, setTabelas] = useState(null);
  const [notaForm, setNotaForm] = useState(EMPTY_NOTA(null));
  const [prestForm, setPrestForm] = useState({});
  const [tomForm, setTomForm] = useState({
    documento: '', nome: '', inscricaoMunicipal: '', email: '', telefone: '',
    cep: '', logradouro: '', numero: '', bairro: '', municipio: '', uf: '', codigoMunicipioIbge: ''
  });
  const [editingTomadorId, setEditingTomadorId] = useState(null);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [tplForm, setTplForm] = useState({
    nome: '',
    tomadorId: '',
    cTribNac: '010101',
    cNBS: '115021000',
    codigoInterno: '',
    discriminacao: '',
    infoComplementar: '',
    valorPadrao: '',
    aliquotaIss: '2'
  });
  const [certStatus, setCertStatus] = useState(null);
  const [logoVersion, setLogoVersion] = useState(0);
  const [danfseNota, setDanfseNota] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelMotivo, setCancelMotivo] = useState('Erro no preenchimento dos dados');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mostrarDescontos, setMostrarDescontos] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [emitError, setEmitError] = useState('');

  const notify = (message, error = false) => {
    if (error) {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  useEffect(() => {
    api('/api/bootstrap')
      .then((data) => {
        setPrestador(data.prestador);
        setPrestForm({ ...data.prestador, certificadoSenha: '' });
        setTomadores(data.tomadores);
        setNotas(data.notas);
        setTemplates(data.templates || []);
        setTabelas(data.tabelas);
        setNotaForm(EMPTY_NOTA(data.prestador));
      })
      .catch((err) => notify(err.message, true))
      .finally(() => setLoading(false));
  }, []);

  const resumo = useMemo(() => {
    const t = notaForm.tributos;
    const bruto = Math.max(0, Number(t.valorServicos) || 0);
    const descInc = Math.max(0, Math.min(bruto, Number(t.descontoIncondicionado) || 0));
    const descCond = Math.max(0, Number(t.descontoCondicionado) || 0);
    const ded = Math.max(0, Math.min(bruto - descInc, Number(t.valorDeducoes) || 0));
    const base = Math.max(0, bruto - descInc - ded);
    const aliq = Math.max(0, Number(t.aliquotaIss) || 0);
    const retido = t.tpRetISSQN === '2' || t.tpRetISSQN === '3';
    const iss = t.tribISSQN === '1' ? base * (aliq / 100) : 0;
    const fed =
      (Number(t.retencaoPis) || 0) +
      (Number(t.retencaoCofins) || 0) +
      (Number(t.retencaoCsll) || 0) +
      (Number(t.retencaoIrrf) || 0) +
      (Number(t.retencaoCp) || 0);
    const liquido = Math.max(0, bruto - descInc - descCond - (retido ? iss : 0) - fed);
    return { bruto, base, aliq, iss, retido, fed, liquido };
  }, [notaForm.tributos]);

  const notasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return notas.filter((n) => {
      if (filtroStatus !== 'todos' && n.status !== filtroStatus) return false;
      if (!q) return true;
      return (
        String(n.numero || '').includes(q) ||
        (n.tomador?.nome || '').toLowerCase().includes(q) ||
        (n.tomador?.documento || '').toLowerCase().includes(q) ||
        (n.servico?.discriminacao || '').toLowerCase().includes(q)
      );
    });
  }, [notas, busca, filtroStatus]);

  const updateTomador = (k, v) => setNotaForm((f) => ({ ...f, tomador: { ...f.tomador, [k]: v } }));
  const updateServico = (k, v) => setNotaForm((f) => ({ ...f, servico: { ...f.servico, [k]: v } }));
  const updateTributo = (k, v) => setNotaForm((f) => ({ ...f, tributos: { ...f.tributos, [k]: v } }));

  async function handleEmitir(status) {
    setSubmitting(true);
    setEmitError('');
    try {
      const payload = {
        ...notaForm,
        status,
        servico: {
          ...notaForm.servico,
          discriminacao: expandirTemplateData(notaForm.servico.discriminacao, notaForm.competencia),
          infoComplementar: expandirTemplateData(notaForm.servico.infoComplementar, notaForm.competencia)
        }
      };
      const res = await api('/api/notas', { method: 'POST', body: JSON.stringify(payload) });
      setNotas((prev) => [res.nota, ...prev]);
      setPrestador(res.prestador);

      if (notaForm.salvarTomador && notaForm.tomador.documento && notaForm.tomador.nome) {
        try {
          const novoTom = await api('/api/tomadores', { method: 'POST', body: JSON.stringify(notaForm.tomador) });
          setTomadores((prev) => [novoTom, ...prev]);
        } catch { /* ignore */ }
      }

      setShowPreview(false);
      setNotaForm(EMPTY_NOTA(res.prestador));
      notify(status === 'rascunho' ? 'Rascunho salvo!' : `NFS-e #${res.nota.numero} emitida com sucesso!`);
      if (status !== 'rascunho') setDanfseNota(res.nota);
    } catch (err) {
      setEmitError(err.message);
      notify(err.message, true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSavePrestador(e) {
    e.preventDefault();
    try {
      const salvo = await api('/api/prestador', { method: 'PUT', body: JSON.stringify(prestForm) });
      setPrestador(salvo);
      setPrestForm({ ...salvo, certificadoSenha: '' });
      if (Array.isArray(salvo.notas)) setNotas(salvo.notas);
      notify('Dados do prestador salvos!');
    } catch (err) {
      notify(err.message, true);
    }
  }

  async function handleBuscarCnpj(alvo) {
    const doc = alvo === 'prestador' ? prestForm.cnpj : notaForm.tomador.documento;
    try {
      const dados = await api(`/api/lookup/cnpj/${encodeURIComponent(doc || '')}`);
      if (alvo === 'prestador') {
        setPrestForm((p) => ({
          ...p,
          cnpj: dados.documento,
          razaoSocial: dados.nome || p.razaoSocial,
          nomeFantasia: dados.nomeFantasia || p.nomeFantasia,
          email: dados.email || p.email,
          telefone: dados.telefone || p.telefone,
          cep: dados.cep || p.cep,
          logradouro: dados.logradouro || p.logradouro,
          numero: dados.numero || p.numero,
          bairro: dados.bairro || p.bairro,
          municipio: dados.municipio || p.municipio,
          uf: dados.uf || p.uf,
          codigoMunicipioIbge: dados.codigoMunicipioIbge || p.codigoMunicipioIbge
        }));
      } else {
        setNotaForm((f) => ({
          ...f,
          tomador: {
            ...f.tomador,
            tipoPessoa: 'BR',
            documento: dados.documento,
            nome: dados.nome || f.tomador.nome,
            email: dados.email || f.tomador.email,
            telefone: dados.telefone || f.tomador.telefone,
            cep: dados.cep || f.tomador.cep,
            logradouro: dados.logradouro || f.tomador.logradouro,
            numero: dados.numero || f.tomador.numero,
            bairro: dados.bairro || f.tomador.bairro,
            municipio: dados.municipio || f.tomador.municipio,
            uf: dados.uf || f.tomador.uf,
            codigoMunicipioIbge: dados.codigoMunicipioIbge || f.tomador.codigoMunicipioIbge
          }
        }));
      }
      notify('CNPJ encontrado e preenchido automaticamente!');
    } catch (err) {
      notify(err.message, true);
    }
  }

  function handleRepetirUltimaNota() {
    if (!notas.length) return;
    const ultima = notas[0];
    setNotaForm((f) => ({
      ...f,
      competencia: hojeBrasilia(),
      tomador: { ...f.tomador, ...ultima.tomador },
      servico: { ...f.servico, ...ultima.servico },
      tributos: {
        ...f.tributos,
        valorServicos: String(ultima.tributos?.valorServicos ?? ''),
        descontoIncondicionado: String(ultima.tributos?.descontoIncondicionado ?? 0),
        descontoCondicionado: String(ultima.tributos?.descontoCondicionado ?? 0),
        valorDeducoes: String(ultima.tributos?.valorDeducoes ?? 0),
        tribISSQN: ultima.tributos?.tribISSQN || '1',
        tpRetISSQN: ultima.tributos?.tpRetISSQN || '1',
        aliquotaIss: String(ultima.tributos?.aliquotaIss ?? 2),
        pTotTribSN: String(ultima.tributos?.pTotTribSN ?? 6),
        retencaoPis: String(ultima.tributos?.retencaoPis ?? 0),
        retencaoCofins: String(ultima.tributos?.retencaoCofins ?? 0),
        retencaoCsll: String(ultima.tributos?.retencaoCsll ?? 0),
        retencaoIrrf: String(ultima.tributos?.retencaoIrrf ?? 0),
        retencaoCp: String(ultima.tributos?.retencaoCp ?? 0)
      }
    }));
    notify('Última nota carregada!');
  }

  function aplicarTemplate(tpl) {
    if (!tpl) return;
    const tom = tomadores.find((t) => t.id === tpl.tomadorId);
    setNotaForm((f) => ({
      ...f,
      tomador: tom ? { ...f.tomador, ...tom } : f.tomador,
      servico: {
        ...f.servico,
        cTribNac: tpl.cTribNac || f.servico.cTribNac,
        cNBS: tpl.cNBS || f.servico.cNBS,
        codigoInterno: tpl.codigoInterno || '',
        discriminacao: expandirTemplateData(tpl.discriminacao, f.competencia),
        infoComplementar: expandirTemplateData(tpl.infoComplementar, f.competencia)
      },
      tributos: {
        ...f.tributos,
        valorServicos: tpl.valorPadrao > 0 ? String(tpl.valorPadrao) : f.tributos.valorServicos,
        aliquotaIss: String(tpl.aliquotaIss ?? f.tributos.aliquotaIss)
      }
    }));
    setTab('emitir');
    notify(`Template "${tpl.nome}" aplicado!`);
  }

  async function handleSaveTemplate(e) {
    e.preventDefault();
    try {
      if (editingTemplateId) {
        const atualizado = await api(`/api/templates/${editingTemplateId}`, { method: 'PUT', body: JSON.stringify(tplForm) });
        setTemplates((prev) => prev.map((t) => (t.id === atualizado.id ? atualizado : t)));
        setEditingTemplateId(null);
        notify('Template atualizado!');
      } else {
        const novo = await api('/api/templates', { method: 'POST', body: JSON.stringify(tplForm) });
        setTemplates((prev) => [novo, ...prev]);
        notify('Template salvo!');
      }
      setTplForm({
        nome: '', tomadorId: '', cTribNac: '010101', cNBS: '115021000',
        codigoInterno: '', discriminacao: '', infoComplementar: '', valorPadrao: '', aliquotaIss: '2'
      });
    } catch (err) {
      notify(err.message, true);
    }
  }

  async function handleDeleteTemplate(id) {
    await api(`/api/templates/${id}`, { method: 'DELETE' });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    notify('Template removido.');
  }

  async function handleSincronizarNacional() {
    setSyncing(true);
    const toastId = toast.loading(t('common.toasts.syncLoading'));
    try {
      const res = await api('/api/notas/sincronizar', { method: 'POST', body: JSON.stringify({ desdeInicio: false }) });
      setNotas(res.notas);
      setPrestador(res.prestador);
      if (res.importadas > 0) {
        toast.success(t('common.toasts.syncImported', { count: res.importadas }), { id: toastId });
      } else {
        toast.info(t('common.toasts.syncUpToDate'), { id: toastId });
      }
    } catch (err) {
      setEmitError(err.message);
      toast.error(t('common.toasts.syncError', { message: err.message }), { id: toastId });
    } finally {
      setSyncing(false);
    }
  }

  async function handleUploadCertificado(file) {
    if (!file) return;
    setCertStatus({ loading: true });
    try {
      const contentBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('Falha ao ler arquivo do computador.'));
        reader.readAsDataURL(file);
      });
      const res = await api('/api/certificado/upload', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, contentBase64, senha: prestForm.certificadoSenha || '' })
      });
      setPrestForm((p) => ({ ...p, certificadoPath: res.path }));
      setPrestador((p) => ({
        ...p,
        certificadoPath: res.path,
        temSenhaCertificado: Boolean(prestForm.certificadoSenha || p?.temSenhaCertificado)
      }));
      setCertStatus({ ok: true, text: `Válido até ${res.validoAte} • ${res.subject}` });
      notify('Certificado A1 salvo e validado!');
    } catch (err) {
      setCertStatus({ ok: false, text: err.message });
      notify(err.message, true);
    }
  }

  async function handleUploadLogo(file) {
    if (!file) return;
    try {
      const pngBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('Formato de imagem inválido.'));
          img.onload = () => {
            const maxDim = 480;
            const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
            const w = Math.max(1, Math.round((img.width || maxDim) * scale));
            const h = Math.max(1, Math.round((img.height || maxDim) * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl.split(',')[1] || '');
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });

      const res = await api('/api/prestador/logo', {
        method: 'POST',
        body: JSON.stringify({ filename: 'logo.png', contentBase64: pngBase64 })
      });
      setPrestador(res.prestador);
      setLogoVersion((v) => v + 1);
      notify('Logo da empresa atualizada! Ela já aparecerá nos próximos PDFs.');
    } catch (err) {
      notify(err.message, true);
    }
  }

  async function handleRemoverLogo() {
    try {
      const res = await api('/api/prestador/logo', { method: 'DELETE' });
      setPrestador(res.prestador);
      setLogoVersion((v) => v + 1);
      notify('Logo removida.');
    } catch (err) {
      notify(err.message, true);
    }
  }

  async function handleTestarCert() {
    setCertStatus({ loading: true });
    try {
      const res = await api('/api/certificado/testar', {
        method: 'POST',
        body: JSON.stringify({ certificadoPath: prestForm.certificadoPath, certificadoSenha: prestForm.certificadoSenha })
      });
      setCertStatus({ ok: true, text: `Válido até ${res.validoAte} • ${res.subject}` });
      notify('Certificado A1 validado com sucesso!');
    } catch (err) {
      setCertStatus({ ok: false, text: err.message });
      notify(err.message, true);
    }
  }

  async function handleUploadLogo(file) {
    if (!file) return;
    try {
      const pngBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('Formato de imagem inválido.'));
          img.onload = () => {
            const maxDim = 480;
            const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
            const w = Math.max(1, Math.round((img.width || maxDim) * scale));
            const h = Math.max(1, Math.round((img.height || maxDim) * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl.split(',')[1] || '');
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });

      const res = await api('/api/prestador/logo', {
        method: 'POST',
        body: JSON.stringify({ filename: 'logo.png', contentBase64: pngBase64 })
      });
      setPrestador(res.prestador);
      setLogoVersion((v) => v + 1);
      notify('Logo da empresa atualizada! Ela já aparecerá nos próximos PDFs.');
    } catch (err) {
      notify(err.message, true);
    }
  }

  async function handleRemoverLogo() {
    try {
      const res = await api('/api/prestador/logo', { method: 'DELETE' });
      setPrestador(res.prestador);
      setLogoVersion((v) => v + 1);
      notify('Logo removida.');
    } catch (err) {
      notify(err.message, true);
    }
  }

  const EMPTY_TOM = {
    documento: '', nome: '', inscricaoMunicipal: '', email: '', telefone: '',
    cep: '', logradouro: '', numero: '', bairro: '', municipio: '', uf: '', codigoMunicipioIbge: ''
  };

  async function handleBuscarCnpjCadastroTomador() {
    try {
      const dados = await api(`/api/lookup/cnpj/${encodeURIComponent(tomForm.documento || '')}`);
      setTomForm((t) => ({
        ...t,
        documento: dados.documento,
        nome: dados.nome || t.nome,
        email: dados.email || t.email,
        telefone: dados.telefone || t.telefone,
        cep: dados.cep || t.cep,
        logradouro: dados.logradouro || t.logradouro,
        numero: dados.numero || t.numero,
        bairro: dados.bairro || t.bairro,
        municipio: dados.municipio || t.municipio,
        uf: dados.uf || t.uf,
        codigoMunicipioIbge: dados.codigoMunicipioIbge || t.codigoMunicipioIbge
      }));
      notify('CNPJ encontrado!');
    } catch (err) {
      notify(err.message, true);
    }
  }

  async function handleSaveTomador(e) {
    e.preventDefault();
    try {
      if (editingTomadorId) {
        const atualizado = await api(`/api/tomadores/${editingTomadorId}`, { method: 'PUT', body: JSON.stringify(tomForm) });
        setTomadores((prev) => prev.map((t) => (t.id === atualizado.id ? atualizado : t)));
        setEditingTomadorId(null);
        notify('Tomador atualizado!');
      } else {
        const novo = await api('/api/tomadores', { method: 'POST', body: JSON.stringify(tomForm) });
        setTomadores((prev) => [novo, ...prev]);
        notify('Tomador adicionado!');
      }
      setTomForm(EMPTY_TOM);
    } catch (err) {
      notify(err.message, true);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'tomador') {
      await handleDeleteTomador(deleteConfirm.item.id);
      if (editingTomadorId === deleteConfirm.item.id) {
        setEditingTomadorId(null);
        setTomForm(EMPTY_TOM);
      }
    } else if (deleteConfirm.type === 'template') {
      await handleDeleteTemplate(deleteConfirm.item.id);
      if (editingTemplateId === deleteConfirm.item.id) {
        setEditingTemplateId(null);
      }
    }
    setDeleteConfirm(null);
  }

  async function handleDeleteTomador(id) {
    await api(`/api/tomadores/${id}`, { method: 'DELETE' });
    setTomadores((prev) => prev.filter((t) => t.id !== id));
    notify('Tomador removido.');
  }

  async function handleCancelarNota() {
    if (!cancelTarget) return;
    try {
      const atualizada = await api(`/api/notas/${cancelTarget.id}/cancelar`, {
        method: 'POST',
        body: JSON.stringify({ motivo: cancelMotivo })
      });
      setNotas((prev) => prev.map((n) => (n.id === atualizada.id ? atualizada : n)));
      setCancelTarget(null);
      notify(`NFS-e #${atualizada.numero} cancelada.`);
    } catch (err) {
      notify(err.message, true);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando Barão...</div>;
  }

  const navItems = [
    { id: 'home', label: messages.common.nav.home, icon: Home },
    { id: 'emitir', label: messages.common.nav.emitir, icon: FileText },
    { id: 'notas', label: messages.common.nav.notas, icon: Receipt, count: notas.length },
    { id: 'templates', label: messages.common.nav.templates, icon: LayoutTemplate, count: templates.length },
    { id: 'tomadores', label: messages.common.nav.tomadores, icon: Users },
    { id: 'prestador', label: messages.common.nav.prestador, icon: Building2 }
  ];

  const statusBadge = {
    emitida_nacional: <Badge variant="default">{messages.common.status.emitida_nacional_full}</Badge>,
    emitida_local: <Badge variant="secondary">{messages.common.status.emitida_local_full}</Badge>,
    rascunho: <Badge variant="outline">{messages.common.status.rascunho}</Badge>,
    cancelada: <Badge variant="destructive">{messages.common.status.cancelada}</Badge>
  };

  const page = messages.common.pages[tab] || PAGE_META[tab];

  const headerActions = (
    <>
      {tab === 'emitir' && templates.length > 0 && (
        <div className="w-48">
          <FieldSelect
            value=""
            placeholder="Aplicar template..."
            options={templates.map((t) => ({ value: t.id, label: t.nome }))}
            onValueChange={(id) => {
              const tpl = templates.find((t) => t.id === id);
              if (tpl) aplicarTemplate(tpl);
            }}
          />
        </div>
      )}
      {tab === 'emitir' && notas.length > 0 && (
        <Button type="button" size="sm" variant="outline" onClick={handleRepetirUltimaNota}>
          <Copy /> Repetir última nota
        </Button>
      )}
      {tab === 'notas' && (
        <Button type="button" size="sm" variant="outline" disabled={syncing} onClick={handleSincronizarNacional}>
          <RefreshCw className={cn(syncing && 'animate-spin')} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Portal Nacional'}
        </Button>
      )}
      {prestador?.certificadoPath && (
        <Badge variant="secondary">
          <ShieldCheck /> A1 Configurado
        </Badge>
      )}
    </>
  );

  const sidebarFooter = (
    <div className="rounded-lg border bg-card p-3 text-xs">
      <p className="truncate font-medium">{prestador?.razaoSocial || 'Empresa não configurada'}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {prestador?.municipio || 'São José dos Campos'} - {prestador?.uf || 'SP'}
      </p>
      <div className="mt-2.5 flex items-center gap-2 border-t pt-2">
        <span className={cn('size-2 rounded-full', prestador?.ambiente === 'producao' ? 'bg-emerald-500' : 'bg-amber-500')} />
        <span className="text-[11px] font-medium">
          {prestador?.ambiente === 'producao' ? 'Produção Oficial' : 'Homologação'}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <BaraoShell
        brandTitle="Barão NFS-e"
        brandSubtitle="Padrão Nacional"
        navItems={navItems}
        activeTab={tab}
        onTabChange={setTab}
        prestador={prestador}
        footer={sidebarFooter}
        headerTitle={page.title}
        headerSubtitle={page.subtitle}
        headerActions={headerActions}
      >
        {(!prestador?.cnpj || !prestador?.razaoSocial) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" />
              <span><strong>Configure seu CNPJ e Razão Social</strong> antes de emitir sua primeira NFS-e.</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => setTab('prestador')}>
              Configurar agora
            </Button>
          </div>
        )}

        {/* HOME */}
        {tab === 'home' && (
          <HomePage
            prestador={prestador}
            notas={notas}
            tomadores={tomadores}
            templates={templates}
            syncing={syncing}
            onNavigate={setTab}
            onSync={handleSincronizarNacional}
            onVerDanfse={setDanfseNota}
          />
        )}

        {/* EMITIR */}
        {tab === 'emitir' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setShowPreview(true);
            }}
            className="grid gap-6 lg:grid-cols-[1fr_340px]"
          >
            <Card>
              <CardContent className="space-y-8 p-6 sm:p-8">
                {/* 01. TOMADOR */}
                <section className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight">1. Tomador do Serviço</h2>
                    <p className="text-xs text-muted-foreground">Selecione um cliente salvo ou busque pelo CNPJ.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField label="Cliente salvo" className="sm:col-span-2">
                      <FieldSelect
                        value=""
                        placeholder="Selecionar cliente salvo..."
                        options={tomadores.map((t) => ({ value: t.id, label: `${t.nome} (${t.documento})` }))}
                        onValueChange={(id) => {
                          const tom = tomadores.find((x) => x.id === id);
                          if (tom) setNotaForm((f) => ({ ...f, tomador: { ...f.tomador, ...tom } }));
                        }}
                      />
                    </FormField>
                    <FormField label="País / Tipo">
                      <FieldSelect
                        value={notaForm.tomador.tipoPessoa}
                        options={[
                          { value: 'BR', label: 'Brasil (CPF / CNPJ)' },
                          { value: 'EXT', label: 'Exterior (NIF)' }
                        ]}
                        onValueChange={(v) => updateTomador('tipoPessoa', v)}
                      />
                    </FormField>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField label="CPF / CNPJ / NIF *">
                      <div className="flex gap-1.5">
                        <Input required className="font-mono-num" value={notaForm.tomador.documento} onChange={(e) => updateTomador('documento', e.target.value)} placeholder="00.000.000/0001-00" />
                        <Button type="button" variant="outline" size="icon" title="Buscar CNPJ na Receita" onClick={() => handleBuscarCnpj('tomador')}>
                          <Search />
                        </Button>
                      </div>
                    </FormField>
                    <FormField label="Nome / Razão Social *" className="sm:col-span-2">
                      <Input required value={notaForm.tomador.nome} onChange={(e) => updateTomador('nome', e.target.value)} placeholder="Empresa Cliente Ltda" />
                    </FormField>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3.5 py-2.5">
                    <span className="text-xs font-medium text-foreground">Salvar este tomador na lista de clientes</span>
                    <Switch
                      checked={notaForm.salvarTomador}
                      onCheckedChange={(checked) => setNotaForm((f) => ({ ...f, salvarTomador: checked }))}
                    />
                  </div>

                  <Accordion>
                    <AccordionItem value="tomador-extra" className="rounded-lg border px-3.5">
                      <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline">
                        Contato e endereço do tomador (opcional)
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <FormField label="Inscrição Municipal"><Input value={notaForm.tomador.inscricaoMunicipal} onChange={(e) => updateTomador('inscricaoMunicipal', e.target.value)} /></FormField>
                          <FormField label="E-mail"><Input type="email" value={notaForm.tomador.email} onChange={(e) => updateTomador('email', e.target.value)} placeholder="financeiro@cliente.com" /></FormField>
                          <FormField label="Telefone"><Input value={notaForm.tomador.telefone} onChange={(e) => updateTomador('telefone', e.target.value)} placeholder="12999999999" /></FormField>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <FormField label="CEP"><Input value={notaForm.tomador.cep} onChange={(e) => updateTomador('cep', e.target.value)} /></FormField>
                          <FormField label="Logradouro" className="sm:col-span-2"><Input value={notaForm.tomador.logradouro} onChange={(e) => updateTomador('logradouro', e.target.value)} /></FormField>
                          <FormField label="Número"><Input value={notaForm.tomador.numero} onChange={(e) => updateTomador('numero', e.target.value)} /></FormField>
                          <FormField label="Bairro"><Input value={notaForm.tomador.bairro} onChange={(e) => updateTomador('bairro', e.target.value)} /></FormField>
                          <FormField label="Município"><Input value={notaForm.tomador.municipio} onChange={(e) => updateTomador('municipio', e.target.value)} /></FormField>
                          <FormField label="UF"><Input maxLength={2} value={notaForm.tomador.uf} onChange={(e) => updateTomador('uf', e.target.value)} /></FormField>
                          <FormField label="Cód. IBGE"><Input className="font-mono-num" value={notaForm.tomador.codigoMunicipioIbge} onChange={(e) => updateTomador('codigoMunicipioIbge', e.target.value)} /></FormField>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </section>

                <Separator />

                {/* 02. SERVIÇO */}
                <section className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight">2. Serviço Prestado & Local</h2>
                    <p className="text-xs text-muted-foreground">Classificação nacional (cTribNac + NBS) e discriminação.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField label="Código de Tributação Nacional *" className="sm:col-span-2">
                      <FieldSelect
                        value={notaForm.servico.cTribNac}
                        options={tabelas.codigosServico.map((c) => ({ value: c.cTribNac, label: c.descricao }))}
                        onValueChange={(val) => {
                          const item = tabelas.codigosServico.find((c) => c.cTribNac === val);
                          setNotaForm((f) => ({
                            ...f,
                            servico: { ...f.servico, cTribNac: val, cNBS: item?.cNBS || f.servico.cNBS }
                          }));
                        }}
                      />
                    </FormField>
                    <FormField label="Código NBS (9 dígitos)">
                      <Input maxLength={9} className="font-mono-num" value={notaForm.servico.cNBS} onChange={(e) => updateServico('cNBS', e.target.value)} />
                    </FormField>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField label="Competência *"><Input type="date" required value={notaForm.competencia} onChange={(e) => setNotaForm((f) => ({ ...f, competencia: e.target.value }))} /></FormField>
                    <FormField label="Município Prestação (IBGE) *"><Input required className="font-mono-num" value={notaForm.servico.codigoMunicipioPrestacao} onChange={(e) => updateServico('codigoMunicipioPrestacao', e.target.value)} /></FormField>
                    <FormField label="Código Interno"><Input value={notaForm.servico.codigoInterno} onChange={(e) => updateServico('codigoInterno', e.target.value)} placeholder="Ex: MENSAL-TI" /></FormField>
                  </div>

                  <FormField label="Discriminação do Serviço *">
                    <Textarea required value={notaForm.servico.discriminacao} onChange={(e) => updateServico('discriminacao', e.target.value)} placeholder="Descreva o serviço prestado, período e referência de contrato..." />
                  </FormField>

                  <FormField label="Informações Complementares">
                    <Input value={notaForm.servico.infoComplementar} onChange={(e) => updateServico('infoComplementar', e.target.value)} placeholder="Opcional (ex: dados bancários / PIX)" />
                  </FormField>
                </section>

                <Separator />

                {/* 03. VALORES */}
                <section className="space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight">3. Valores & Tributação</h2>
                    <p className="text-xs text-muted-foreground">Cálculo automático de base, ISS e valor líquido.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Valor do Serviço (R$) *">
                      <Input type="number" step="0.01" min="0.01" required className="font-mono-num" value={notaForm.tributos.valorServicos} onChange={(e) => updateTributo('valorServicos', e.target.value)} placeholder="1500.00" />
                    </FormField>
                    <FormField label="Alíquota ISS (%)">
                      <Input type="number" step="0.01" min="0" max="5" className="font-mono-num" value={notaForm.tributos.aliquotaIss} onChange={(e) => updateTributo('aliquotaIss', e.target.value)} />
                    </FormField>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3.5 py-2.5">
                      <div>
                        <p className="text-xs font-medium">ISS Retido na Fonte</p>
                        <p className="text-[11px] text-muted-foreground">Tomador recolhe o ISS</p>
                      </div>
                      <Switch
                        checked={notaForm.tributos.tpRetISSQN === '2'}
                        onCheckedChange={(checked) => updateTributo('tpRetISSQN', checked ? '2' : '1')}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3.5 py-2.5">
                      <div>
                        <p className="text-xs font-medium">Descontos ou Deduções</p>
                        <p className="text-[11px] text-muted-foreground">Abatimentos sobre o valor</p>
                      </div>
                      <Switch
                        checked={mostrarDescontos}
                        onCheckedChange={setMostrarDescontos}
                      />
                    </div>
                  </div>

                  {mostrarDescontos && (
                    <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
                      <FormField label="Desconto Incondicionado"><Input type="number" step="0.01" min="0" className="font-mono-num" value={notaForm.tributos.descontoIncondicionado} onChange={(e) => updateTributo('descontoIncondicionado', e.target.value)} /></FormField>
                      <FormField label="Desconto Condicionado"><Input type="number" step="0.01" min="0" className="font-mono-num" value={notaForm.tributos.descontoCondicionado} onChange={(e) => updateTributo('descontoCondicionado', e.target.value)} /></FormField>
                      <FormField label="Deduções / Reduções"><Input type="number" step="0.01" min="0" className="font-mono-num" value={notaForm.tributos.valorDeducoes} onChange={(e) => updateTributo('valorDeducoes', e.target.value)} /></FormField>
                    </div>
                  )}

                  <Accordion>
                    <AccordionItem value="retencoes-avancado" className="rounded-lg border px-3.5">
                      <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline">
                        Retenções federais e tributação avançada (opcional)
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField label="Tributação do ISSQN">
                            <FieldSelect
                              value={notaForm.tributos.tribISSQN}
                              options={tabelas.tributacaoIssqn.map((t) => ({ value: t.codigo, label: t.label }))}
                              onValueChange={(v) => updateTributo('tribISSQN', v)}
                            />
                          </FormField>
                          <FormField label="% Tributos Aprox. SN (Lei 12.741)">
                            <Input type="number" step="0.01" min="0" max="100" className="font-mono-num" value={notaForm.tributos.pTotTribSN} onChange={(e) => updateTributo('pTotTribSN', e.target.value)} />
                          </FormField>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <FormField label="PIS (R$)"><Input type="number" step="0.01" min="0" className="font-mono-num" value={notaForm.tributos.retencaoPis} onChange={(e) => updateTributo('retencaoPis', e.target.value)} /></FormField>
                          <FormField label="COFINS (R$)"><Input type="number" step="0.01" min="0" className="font-mono-num" value={notaForm.tributos.retencaoCofins} onChange={(e) => updateTributo('retencaoCofins', e.target.value)} /></FormField>
                          <FormField label="CSLL (R$)"><Input type="number" step="0.01" min="0" className="font-mono-num" value={notaForm.tributos.retencaoCsll} onChange={(e) => updateTributo('retencaoCsll', e.target.value)} /></FormField>
                          <FormField label="IRRF (R$)"><Input type="number" step="0.01" min="0" className="font-mono-num" value={notaForm.tributos.retencaoIrrf} onChange={(e) => updateTributo('retencaoIrrf', e.target.value)} /></FormField>
                          <FormField label="INSS / CP (R$)"><Input type="number" step="0.01" min="0" className="font-mono-num" value={notaForm.tributos.retencaoCp} onChange={(e) => updateTributo('retencaoCp', e.target.value)} /></FormField>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </section>
              </CardContent>
            </Card>

            <aside className="lg:sticky lg:top-20 lg:self-start">
              <Card>
                <CardHeader className="border-b pb-4">
                  <CardTitle>Resumo da NFS-e</CardTitle>
                  <CardDescription>Conferência antes de transmitir.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="space-y-2 text-sm font-mono-num">
                    <div className="flex justify-between"><dt className="font-sans text-muted-foreground">Valor Bruto</dt><dd className="font-medium">{moeda(resumo.bruto)}</dd></div>
                    <div className="flex justify-between"><dt className="font-sans text-muted-foreground">Base de Cálculo</dt><dd className="font-medium">{moeda(resumo.base)}</dd></div>
                    <div className="flex justify-between"><dt className="font-sans text-muted-foreground">ISS ({resumo.aliq.toFixed(2)}%)</dt><dd className="font-medium">{moeda(resumo.iss)}</dd></div>
                    <div className="flex justify-between"><dt className="font-sans text-muted-foreground">ISS Retido</dt><dd className="font-sans font-medium">{resumo.retido ? 'Sim' : 'Não'}</dd></div>
                    <div className="flex justify-between"><dt className="font-sans text-muted-foreground">Retenções Federais</dt><dd className="font-medium">{moeda(resumo.fed)}</dd></div>
                  </dl>

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
                    <p className="text-xs font-medium text-emerald-800">Valor Líquido da Nota</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700 font-mono-num">
                      {moeda(resumo.liquido)}
                    </p>
                  </div>

                  <FormField label="Modo de Emissão">
                    <FieldSelect
                      value={notaForm.modo}
                      options={[
                        { value: 'nacional', label: 'Portal Nacional NFS-e (Certificado A1)' },
                        { value: 'local', label: 'Simulação Local (Offline)' }
                      ]}
                      onValueChange={(v) => setNotaForm((f) => ({ ...f, modo: v }))}
                    />
                  </FormField>

                  <div className="space-y-2">
                    <Button type="submit" className="w-full" disabled={submitting}>
                      <Sparkles />
                      {submitting ? 'Transmitindo...' : 'Emitir NFS-e'}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" disabled={submitting} onClick={() => handleEmitir('rascunho')}>
                      Salvar como Rascunho
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </form>
        )}

        {/* NOTAS */}
        {tab === 'notas' && (
          <NotasPage
            notas={notas}
            onVerDanfse={setDanfseNota}
            onCancelar={setCancelTarget}
            onIrEmitir={() => setTab('emitir')}
          />
        )}

        {/* TEMPLATES */}
        {tab === 'templates' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{editingTemplateId ? 'Editar Template de Serviço' : 'Novo Template de Serviço'}</CardTitle>
                <CardDescription>Suporta <code>{'{{MMMM/AAAA}}'}</code>, <code>{'{{MMMM/AA}}'}</code>, <code>{'{{MM/AAAA}}'}</code>, <code>{'{{MM/AA}}'}</code>.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveTemplate} className="space-y-4">
                  <FormField label="Nome do Template *"><Input required value={tplForm.nome} onChange={(e) => setTplForm({ ...tplForm, nome: e.target.value })} placeholder="Ex: Assessoria Mensal - Cliente X" /></FormField>
                  <FormField label="Tomador padrão">
                    <FieldSelect
                      value={tplForm.tomadorId}
                      placeholder="Nenhum"
                      options={tomadores.map((t) => ({ value: t.id, label: t.nome }))}
                      onValueChange={(v) => setTplForm({ ...tplForm, tomadorId: v })}
                    />
                  </FormField>
                  <FormField label="Código cTribNac">
                    <FieldSelect
                      value={tplForm.cTribNac}
                      options={tabelas.codigosServico.map((c) => ({ value: c.cTribNac, label: c.descricao }))}
                      onValueChange={(val) => {
                        const item = tabelas.codigosServico.find((c) => c.cTribNac === val);
                        setTplForm({ ...tplForm, cTribNac: val, cNBS: item?.cNBS || tplForm.cNBS });
                      }}
                    />
                  </FormField>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Valor padrão (R$)"><Input type="number" step="0.01" className="font-mono-num" value={tplForm.valorPadrao} onChange={(e) => setTplForm({ ...tplForm, valorPadrao: e.target.value })} /></FormField>
                    <FormField label="Alíquota ISS (%)"><Input type="number" step="0.01" className="font-mono-num" value={tplForm.aliquotaIss} onChange={(e) => setTplForm({ ...tplForm, aliquotaIss: e.target.value })} /></FormField>
                  </div>
                  <FormField label="Discriminação fixa *"><Textarea required value={tplForm.discriminacao} onChange={(e) => setTplForm({ ...tplForm, discriminacao: e.target.value })} placeholder="Prestação de serviços referente a {{MES_ANO}}." /></FormField>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Informações Complementares (PIX / Banco)</Label>
                      <button
                        type="button"
                        className="cursor-pointer text-[11px] font-medium text-emerald-700 hover:underline"
                        onClick={() => setTplForm({
                          ...tplForm,
                          infoComplementar: 'Dados bancários: Banco (000) | Ag: 0000 | CC: 00000-0 | PIX: sua-chave-pix'
                        })}
                      >
                        + Inserir modelo PIX / Banco
                      </button>
                    </div>
                    <Textarea value={tplForm.infoComplementar} onChange={(e) => setTplForm({ ...tplForm, infoComplementar: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1"><Plus /> {editingTemplateId ? 'Salvar Alterações' : 'Salvar Template'}</Button>
                    {editingTemplateId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingTemplateId(null);
                          setTplForm({ nome: '', tomadorId: '', cTribNac: '010101', cNBS: '115021000', codigoInterno: '', discriminacao: '', infoComplementar: '', valorPadrao: '', aliquotaIss: '2' });
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Templates Salvos</CardTitle>
                <CardDescription>{templates.length} modelo(s) pronto(s).</CardDescription>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <LayoutTemplate className="mb-2 size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Nenhum template salvo ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map((tpl) => (
                      <div key={tpl.id} className="rounded-lg border bg-muted/30 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{tpl.nome}</p>
                            <p className="mt-0.5 font-mono-num text-xs text-muted-foreground">
                              {tpl.cTribNac} {tpl.valorPadrao > 0 ? `• ${moeda(tpl.valorPadrao)}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" onClick={() => aplicarTemplate(tpl)}>Usar</Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="Editar template"
                              onClick={() => {
                                setEditingTemplateId(tpl.id);
                                setTplForm({
                                  nome: tpl.nome,
                                  tomadorId: tpl.tomadorId || '',
                                  cTribNac: tpl.cTribNac || '010101',
                                  cNBS: tpl.cNBS || '',
                                  codigoInterno: tpl.codigoInterno || '',
                                  discriminacao: tpl.discriminacao,
                                  infoComplementar: tpl.infoComplementar || '',
                                  valorPadrao: tpl.valorPadrao ? String(tpl.valorPadrao) : '',
                                  aliquotaIss: String(tpl.aliquotaIss ?? 2)
                                });
                              }}
                            >
                              <Pencil />
                            </Button>
                            <Button size="icon-sm" variant="ghost" title="Excluir template" onClick={() => setDeleteConfirm({ type: 'template', item: tpl })}>
                              <Trash2 className="text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{tpl.discriminacao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TOMADORES */}
        {tab === 'tomadores' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{editingTomadorId ? 'Editar Tomador' : 'Novo Tomador'}</CardTitle>
                <CardDescription>Cadastre ou atualize clientes recorrentes.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveTomador} className="space-y-4">
                  <FormField label="CPF ou CNPJ *">
                    <div className="flex gap-1.5">
                      <Input required className="font-mono-num" value={tomForm.documento} onChange={(e) => setTomForm({ ...tomForm, documento: e.target.value })} />
                      <Button type="button" variant="outline" size="icon" title="Buscar CNPJ na Receita" onClick={handleBuscarCnpjCadastroTomador}>
                        <Search />
                      </Button>
                    </div>
                  </FormField>
                  <FormField label="Nome / Razão Social *"><Input required value={tomForm.nome} onChange={(e) => setTomForm({ ...tomForm, nome: e.target.value })} /></FormField>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="E-mail"><Input type="email" value={tomForm.email} onChange={(e) => setTomForm({ ...tomForm, email: e.target.value })} /></FormField>
                    <FormField label="Telefone"><Input value={tomForm.telefone} onChange={(e) => setTomForm({ ...tomForm, telefone: e.target.value })} /></FormField>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FormField label="CEP"><Input className="font-mono-num" value={tomForm.cep} onChange={(e) => setTomForm({ ...tomForm, cep: e.target.value })} /></FormField>
                    <FormField label="Logradouro" className="sm:col-span-2"><Input value={tomForm.logradouro} onChange={(e) => setTomForm({ ...tomForm, logradouro: e.target.value })} /></FormField>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <FormField label="Número"><Input value={tomForm.numero} onChange={(e) => setTomForm({ ...tomForm, numero: e.target.value })} /></FormField>
                    <FormField label="Bairro"><Input value={tomForm.bairro} onChange={(e) => setTomForm({ ...tomForm, bairro: e.target.value })} /></FormField>
                    <FormField label="Município"><Input value={tomForm.municipio} onChange={(e) => setTomForm({ ...tomForm, municipio: e.target.value })} /></FormField>
                    <FormField label="UF"><Input maxLength={2} value={tomForm.uf} onChange={(e) => setTomForm({ ...tomForm, uf: e.target.value })} /></FormField>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1"><Plus /> {editingTomadorId ? 'Salvar Alterações' : 'Adicionar Tomador'}</Button>
                    {editingTomadorId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingTomadorId(null);
                          setTomForm(EMPTY_TOM);
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clientes Salvos</CardTitle>
                <CardDescription>{tomadores.length} cadastrado(s).</CardDescription>
              </CardHeader>
              <CardContent>
                {tomadores.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Users className="mb-2 size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Nenhum tomador salvo ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {tomadores.map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3.5">
                        <div className="min-w-0 pr-2">
                          <p className="truncate text-sm font-medium">{t.nome}</p>
                          <p className="truncate font-mono-num text-xs text-muted-foreground">
                            {t.documento}{t.municipio ? ` • ${t.municipio}/${t.uf}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Editar tomador"
                            onClick={() => {
                              setEditingTomadorId(t.id);
                              setTomForm({
                                documento: t.documento || '',
                                nome: t.nome || '',
                                inscricaoMunicipal: t.inscricaoMunicipal || '',
                                email: t.email || '',
                                telefone: t.telefone || '',
                                cep: t.cep || '',
                                logradouro: t.logradouro || '',
                                numero: t.numero || '',
                                bairro: t.bairro || '',
                                municipio: t.municipio || '',
                                uf: t.uf || '',
                                codigoMunicipioIbge: t.codigoMunicipioIbge || ''
                              });
                            }}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Excluir tomador"
                            onClick={() => setDeleteConfirm({ type: 'tomador', item: t })}
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* PRESTADOR & A1 */}
        {tab === 'prestador' && (
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Dados da Empresa & Certificado Digital</CardTitle>
              <CardDescription>Informações enviadas na DPS e credenciais de assinatura mTLS.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePrestador} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField label="CNPJ *">
                    <div className="flex gap-1.5">
                      <Input required className="font-mono-num" value={prestForm.cnpj || ''} onChange={(e) => setPrestForm({ ...prestForm, cnpj: e.target.value })} />
                      <Button type="button" variant="outline" size="icon" title="Buscar CNPJ na Receita" onClick={() => handleBuscarCnpj('prestador')}>
                        <Search />
                      </Button>
                    </div>
                  </FormField>
                  <FormField label="Inscrição Municipal"><Input className="font-mono-num" value={prestForm.inscricaoMunicipal || ''} onChange={(e) => setPrestForm({ ...prestForm, inscricaoMunicipal: e.target.value })} /></FormField>
                  <FormField label="Telefone"><Input value={prestForm.telefone || ''} onChange={(e) => setPrestForm({ ...prestForm, telefone: e.target.value })} /></FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Razão Social *"><Input required value={prestForm.razaoSocial || ''} onChange={(e) => setPrestForm({ ...prestForm, razaoSocial: e.target.value })} /></FormField>
                  <FormField label="Nome Fantasia"><Input value={prestForm.nomeFantasia || ''} onChange={(e) => setPrestForm({ ...prestForm, nomeFantasia: e.target.value })} /></FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <FormField label="CEP"><Input className="font-mono-num" value={prestForm.cep || ''} onChange={(e) => setPrestForm({ ...prestForm, cep: e.target.value })} /></FormField>
                  <FormField label="Logradouro" className="sm:col-span-2"><Input value={prestForm.logradouro || ''} onChange={(e) => setPrestForm({ ...prestForm, logradouro: e.target.value })} /></FormField>
                  <FormField label="Número"><Input value={prestForm.numero || ''} onChange={(e) => setPrestForm({ ...prestForm, numero: e.target.value })} /></FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <FormField label="Bairro"><Input value={prestForm.bairro || ''} onChange={(e) => setPrestForm({ ...prestForm, bairro: e.target.value })} /></FormField>
                  <FormField label="Município *"><Input required value={prestForm.municipio || ''} onChange={(e) => setPrestForm({ ...prestForm, municipio: e.target.value })} /></FormField>
                  <FormField label="UF *"><Input required maxLength={2} value={prestForm.uf || ''} onChange={(e) => setPrestForm({ ...prestForm, uf: e.target.value })} /></FormField>
                  <FormField label="Cód. IBGE"><Input className="font-mono-num" value={prestForm.codigoMunicipioIbge || ''} onChange={(e) => setPrestForm({ ...prestForm, codigoMunicipioIbge: e.target.value })} /></FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Regime Simples Nacional">
                    <FieldSelect
                      value={prestForm.opSimpNac || '3'}
                      options={tabelas.regimesSimples.map((r) => ({ value: r.codigo, label: r.label }))}
                      onValueChange={(v) => setPrestForm({ ...prestForm, opSimpNac: v })}
                    />
                  </FormField>
                  <FormField label="Regime Especial">
                    <FieldSelect
                      value={prestForm.regEspTrib || '0'}
                      options={tabelas.regimesEspeciais.map((r) => ({ value: r.codigo, label: r.label }))}
                      onValueChange={(v) => setPrestForm({ ...prestForm, regEspTrib: v })}
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <FormField label="Alíquota ISS (%)"><Input type="number" step="0.01" className="font-mono-num" value={prestForm.aliquotaPadraoIss ?? 2} onChange={(e) => setPrestForm({ ...prestForm, aliquotaPadraoIss: e.target.value })} /></FormField>
                  <FormField label="% Trib. Aprox. SN"><Input type="number" step="0.01" className="font-mono-num" value={prestForm.pTotTribSN ?? 6} onChange={(e) => setPrestForm({ ...prestForm, pTotTribSN: e.target.value })} /></FormField>
                  <FormField label="Série DPS"><Input className="font-mono-num" value={prestForm.rpsSerie || '1'} onChange={(e) => setPrestForm({ ...prestForm, rpsSerie: e.target.value })} /></FormField>
                  <FormField label="Ambiente">
                    <FieldSelect
                      value={prestForm.ambiente || 'homologacao'}
                      options={[
                        { value: 'homologacao', label: 'Homologação' },
                        { value: 'producao', label: 'Produção' }
                      ]}
                      onValueChange={(v) => setPrestForm({ ...prestForm, ambiente: v })}
                    />
                  </FormField>
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    Certificado Digital A1 (.pfx / .p12)
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Caminho completo do .pfx / .p12"><Input value={prestForm.certificadoPath || ''} onChange={(e) => setPrestForm({ ...prestForm, certificadoPath: e.target.value })} /></FormField>
                    <FormField label="Senha (deixe vazio para manter)"><Input type="password" value={prestForm.certificadoSenha || ''} onChange={(e) => setPrestForm({ ...prestForm, certificadoSenha: e.target.value })} placeholder={prestador?.temSenhaCertificado ? 'Senha já salva' : '••••••'} /></FormField>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      nativeButton={false}
                      render={<label className="cursor-pointer" />}
                    >
                      <Upload /> Escolher .pfx / .p12 no Finder
                      <input type="file" accept=".pfx,.p12" className="hidden" onChange={(e) => handleUploadCertificado(e.target.files?.[0])} />
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={handleTestarCert}>Testar Certificado A1</Button>
                    {certStatus && (
                      <span className={cn('text-xs font-medium', certStatus.ok ? 'text-emerald-700' : 'text-destructive')}>
                        {certStatus.loading ? 'Validando...' : certStatus.text}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Building2 className="size-4 text-primary" />
                      Identidade Visual (Logo no PDF do DANFSE)
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border bg-background p-1.5">
                      {prestador?.temLogo ? (
                        <img
                          src={`/api/prestador/logo?v=${logoVersion}`}
                          alt="Logo da empresa"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">Sem logo</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<label className="cursor-pointer" />}
                      >
                        <Upload /> {prestador?.temLogo ? 'Trocar Logo' : 'Escolher Logo (PNG, JPG, SVG)'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            handleUploadLogo(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </Button>
                      {prestador?.temLogo && (
                        <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={handleRemoverLogo}>
                          <Trash2 className="size-3.5" /> Remover Logo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Button type="submit">Salvar Dados do Prestador</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </BaraoShell>

      <DanfseModal nota={danfseNota} prestador={prestador} onClose={() => setDanfseNota(null)} />

      <PreviewEmissaoDialog
        open={showPreview}
        onOpenChange={(open) => {
          setShowPreview(open);
          if (!open) setEmitError('');
        }}
        notaForm={notaForm}
        prestador={prestador}
        resumo={resumo}
        submitting={submitting}
        errorMessage={emitError}
        onConfirm={() => handleEmitir('emitida')}
      />

      <ConfirmDangerDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => { if (!open) setCancelTarget(null); }}
        title={`Cancelar NFS-e #${cancelTarget?.numero || ''}`}
        description={`${cancelTarget?.tomador?.nome || ''} • ${moeda(cancelTarget?.tributos?.valorLiquido || cancelTarget?.tributos?.valorServicos)}`}
        confirmWord="CANCELAR"
        confirmLabel="Confirmar Cancelamento"
        onConfirm={handleCancelarNota}
      >
        <FormField label="Motivo do cancelamento *">
          <Input required value={cancelMotivo} onChange={(e) => setCancelMotivo(e.target.value)} />
        </FormField>
      </ConfirmDangerDialog>

      <ConfirmDangerDialog
        open={Boolean(deleteConfirm)}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
        title={deleteConfirm?.type === 'tomador' ? 'Excluir Tomador' : 'Excluir Template'}
        description={deleteConfirm?.item?.nome || ''}
        confirmWord="EXCLUIR"
        confirmLabel="Confirmar Exclusão"
        onConfirm={handleConfirmDelete}
      />

      <Toaster richColors position="bottom-right" />
    </>
  );
}
