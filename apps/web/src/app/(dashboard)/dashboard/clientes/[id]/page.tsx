'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Copy, User, Mail, Phone, CreditCard, DollarSign } from 'lucide-react';
import { clientesApi } from '@/lib/api';
import { toasts } from '@/lib/toast';
import { Modal } from '@/components/ui/Modal';
import { InputIcon } from '@/components/ui/InputIcon';

type Historico = { status: string; descricao: string; dataAtualizacao: string };
type Cliente = {
  id: string;
  nome: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  valorServico: number | { toString(): string };
  statusProcesso: string;
  linkAcompanhamento: string;
  historicoProcesso?: Historico[];
};

const STATUS_OPCOES = [
  'CADASTRO_RECEBIDO',
  'EM_ANALISE',
  'EM_ANDAMENTO',
  'AGUARDANDO_PAGAMENTO',
  'PAGO',
  'CONCLUIDO',
  'CANCELADO',
] as const;

const statusLabel: Record<string, string> = {
  CADASTRO_RECEBIDO: 'Cadastro recebido',
  EM_ANALISE: 'Em análise',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Pago',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export default function ClienteDetalhePage() {
  const params = useParams();
  const id = params?.id as string;
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalEditar, setModalEditar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({ nome: '', cpfCnpj: '', telefone: '', email: '', valorServico: '' });
  const [novoStatus, setNovoStatus] = useState('');
  const [descricaoStatus, setDescricaoStatus] = useState('');
  const [salvandoStatus, setSalvandoStatus] = useState(false);

  useEffect(() => {
    if (!id) return;
    clientesApi.one(id).then((data) => {
      const c = data as Cliente;
      setCliente(c);
      setForm({
        nome: c.nome,
        cpfCnpj: c.cpfCnpj || '',
        telefone: c.telefone || '',
        email: c.email,
        valorServico: typeof c.valorServico === 'number' ? String(c.valorServico) : String(c.valorServico),
      });
      setNovoStatus(c.statusProcesso);
    }).catch(() => setCliente(null)).finally(() => setLoading(false));
  }, [id]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      const valor = parseFloat(form.valorServico.replace(/\./g, '').replace(',', '.'));
      await clientesApi.update(id, {
        nome: form.nome.trim(),
        cpfCnpj: form.cpfCnpj.replace(/\D/g, ''),
        telefone: form.telefone.replace(/\D/g, ''),
        email: form.email.trim(),
        valorServico: isNaN(valor) ? undefined : valor,
      });
      const atualizado = await clientesApi.one(id) as Cliente;
      setCliente(atualizado);
      setModalEditar(false);
      toasts.success('Cadastro atualizado com sucesso.');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
      toasts.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function handleAlterarStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!novoStatus) return;
    setSalvandoStatus(true);
    try {
      await clientesApi.updateStatus(id, { status: novoStatus, descricao: descricaoStatus || undefined });
      const atualizado = await clientesApi.one(id) as Cliente;
      setCliente(atualizado);
      setDescricaoStatus('');
      toasts.success('Status atualizado.');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao alterar status');
      toasts.error(err instanceof Error ? err.message : 'Erro ao alterar status');
    } finally {
      setSalvandoStatus(false);
    }
  }

  const formatBRL = (v: number | { toString(): string }) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      typeof v === 'number' ? v : Number(String(v))
    );

  if (loading) return <div className="py-12 text-center text-slate-500">Carregando...</div>;
  if (!cliente) return <div className="py-12 text-center text-slate-600">Cliente não encontrado. <Link href="/dashboard/clientes" className="text-teal-600 hover:underline">Voltar</Link></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link href="/dashboard/clientes" className="text-sm text-teal-600 hover:underline">← Clientes</Link>
        <div className="flex items-center gap-2">
          <a href={`/acompanhar/${cliente.linkAcompanhamento}`} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 hover:underline">Abrir link do cliente</a>
          <button
            type="button"
            onClick={() => {
              const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/acompanhar/${cliente.linkAcompanhamento}`;
              navigator.clipboard.writeText(url).then(() => toasts.success('Link copiado! Envie ao cliente.'));
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-600 transition"
            title="Copiar link"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-800">{cliente.nome}</h2>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
            cliente.statusProcesso === 'PAGO' || cliente.statusProcesso === 'CONCLUIDO' ? 'bg-emerald-100 text-emerald-700' :
            cliente.statusProcesso === 'CANCELADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {statusLabel[cliente.statusProcesso] ?? cliente.statusProcesso}
          </span>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">E-mail</span><p className="font-medium text-slate-800">{cliente.email}</p></div>
            <div><span className="text-slate-500">Telefone</span><p className="font-medium text-slate-800">{cliente.telefone}</p></div>
            <div><span className="text-slate-500">CPF/CNPJ</span><p className="font-medium text-slate-800">{cliente.cpfCnpj}</p></div>
            <div><span className="text-slate-500">Valor do serviço</span><p className="font-medium text-slate-800">{formatBRL(cliente.valorServico)}</p></div>
            <div className="sm:col-span-2">
              <span className="text-slate-500">Link de acompanhamento</span>
              <p className="font-mono text-slate-700 break-all mt-0.5">{cliente.linkAcompanhamento}</p>
              <button
                type="button"
                onClick={() => {
                  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/acompanhar/${cliente.linkAcompanhamento}`;
                  navigator.clipboard.writeText(url).then(() => toasts.success('Link copiado!'));
                }}
                className="mt-1 inline-flex items-center gap-1 text-sm text-teal-600 hover:underline"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar link para enviar ao cliente
              </button>
            </div>
          </div>

          <button type="button" onClick={() => setModalEditar(true)} className="text-sm text-teal-600 hover:underline font-medium">Editar cadastro</button>

          <hr className="border-slate-200" />

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Alterar status do processo</h3>
            <form onSubmit={handleAlterarStatus} className="flex flex-wrap gap-2 items-end">
              <div className="min-w-[180px]">
                <label className="block text-xs text-slate-500 mb-1">Status</label>
                <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                  {STATUS_OPCOES.map((s) => <option key={s} value={s}>{statusLabel[s] ?? s}</option>)}
                </select>
              </div>
              <div className="min-w-[200px] flex-1">
                <label className="block text-xs text-slate-500 mb-1">Descrição (opcional)</label>
                <input type="text" value={descricaoStatus} onChange={(e) => setDescricaoStatus(e.target.value)} placeholder="Ex: Documentos recebidos" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </div>
              <button type="submit" disabled={salvandoStatus} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50">Atualizar</button>
            </form>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Linha do tempo</h3>
            <ul className="space-y-2">
              {(cliente.historicoProcesso ?? []).map((h, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-teal-500" />
                  <div>
                    <p className="font-medium text-slate-800">{h.descricao}</p>
                    <p className="text-xs text-slate-500">{new Date(h.dataAtualizacao).toLocaleString('pt-BR')}</p>
                  </div>
                </li>
              ))}
              {(!cliente.historicoProcesso || cliente.historicoProcesso.length === 0) && (
                <li className="text-slate-500 text-sm">Nenhum registro ainda.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <Modal open={modalEditar} onClose={() => setModalEditar(false)} title="Editar cadastro do cliente" size="lg">
        <form onSubmit={handleSalvar} className="space-y-4">
          <InputIcon icon={<User className="w-5 h-5" />} label="Nome completo" placeholder="Ex.: João da Silva" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
          <InputIcon icon={<Mail className="w-5 h-5" />} label="E-mail" placeholder="email@exemplo.com" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          <InputIcon icon={<Phone className="w-5 h-5" />} label="WhatsApp / Telefone" placeholder="(11) 99999-9999" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
          <InputIcon icon={<CreditCard className="w-5 h-5" />} label="CPF ou CNPJ" placeholder="000.000.000-00" value={form.cpfCnpj} onChange={(e) => setForm((f) => ({ ...f, cpfCnpj: e.target.value }))} />
          <InputIcon icon={<DollarSign className="w-5 h-5" />} label="Valor do serviço (R$)" placeholder="400,00" value={form.valorServico} onChange={(e) => setForm((f) => ({ ...f, valorServico: e.target.value }))} />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={salvando} className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
            <button type="button" onClick={() => setModalEditar(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
