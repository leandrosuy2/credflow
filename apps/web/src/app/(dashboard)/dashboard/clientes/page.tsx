'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Mail, Phone, CreditCard, DollarSign, Link2, Copy, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { clientesApi } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { InputIcon } from '@/components/ui/InputIcon';
import { toasts } from '@/lib/toast';
import { exportToCsv, type CsvColumn } from '@/lib/exportCsv';

type Cliente = {
  id: string;
  nome: string;
  email: string;
  cpfCnpj?: string;
  telefone?: string;
  statusProcesso: string;
  linkAcompanhamento: string;
  valorServico: number | { toString(): string };
  dataCadastro: string;
  vendedor?: { id: string; nome: string };
};

const statusLabel: Record<string, string> = {
  CADASTRO_RECEBIDO: 'Cadastro recebido',
  EM_ANALISE: 'Em análise',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Pago',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

const emptyForm = { nome: '', cpfCnpj: '', telefone: '', email: '', valorServico: '' };

export default function ClientesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalEditar, setModalEditar] = useState<Cliente | null>(null);
  const [modalExcluir, setModalExcluir] = useState<Cliente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [linkCriado, setLinkCriado] = useState<string | null>(null);
  const [filtrosAdmin, setFiltrosAdmin] = useState({ dataInicio: '', dataFim: '', statusProcesso: '' });
  const isAdmin = user?.tipo === 'admin';

  const copiarLink = (link: string) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/acompanhar/${link}`;
    navigator.clipboard.writeText(url).then(() => toasts.success('Link copiado! Envie ao cliente.'));
  };

  const load = () => {
    const params = isAdmin && (filtrosAdmin.dataInicio || filtrosAdmin.dataFim || filtrosAdmin.statusProcesso)
      ? {
          dataInicio: filtrosAdmin.dataInicio || undefined,
          dataFim: filtrosAdmin.dataFim || undefined,
          statusProcesso: filtrosAdmin.statusProcesso || undefined,
        }
      : undefined;
    return clientesApi.list(params).then((data) => setClientes((data as Cliente[]) || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (searchParams.get('openModal') === 'novo') {
      setModalNovo(true);
      router.replace('/dashboard/clientes', { scroll: false });
    }
  }, [searchParams, router]);

  const formatBRL = (v: number | { toString(): string }) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      typeof v === 'number' ? v : Number(String(v))
    );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const valor = parseFloat(form.valorServico.replace(/\./g, '').replace(',', '.'));
      if (isNaN(valor) || valor <= 0) {
        toasts.warning('Informe um valor válido para o serviço.');
        return;
      }
      const criado = (await clientesApi.create({
        nome: form.nome.trim(),
        cpfCnpj: form.cpfCnpj.replace(/\D/g, ''),
        telefone: form.telefone.replace(/\D/g, ''),
        email: form.email.trim(),
        valorServico: valor,
      })) as { linkAcompanhamento?: string };
      setForm(emptyForm);
      setModalNovo(false);
      load();
      if (criado?.linkAcompanhamento) {
        setLinkCriado(criado.linkAcompanhamento);
        toasts.success('Cliente cadastrado! Envie o link ao cliente.');
      } else {
        toasts.success('Cliente cadastrado com sucesso.');
      }
    } catch (err) {
      toasts.error(err instanceof Error ? err.message : 'Erro ao cadastrar.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditar) return;
    setSubmitLoading(true);
    try {
      const valor = parseFloat(form.valorServico.replace(/\./g, '').replace(',', '.'));
      await clientesApi.update(modalEditar.id, {
        nome: form.nome.trim(),
        cpfCnpj: form.cpfCnpj.replace(/\D/g, ''),
        telefone: form.telefone.replace(/\D/g, ''),
        email: form.email.trim(),
        ...(isNaN(valor) ? {} : { valorServico: valor }),
      });
      toasts.success('Cliente atualizado com sucesso.');
      setModalEditar(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      toasts.error(err instanceof Error ? err.message : 'Erro ao atualizar.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!modalExcluir) return;
    setExcluindo(true);
    try {
      await clientesApi.remove(modalExcluir.id);
      toasts.success('Cliente excluído.');
      setModalExcluir(null);
      load();
    } catch (err) {
      toasts.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      setExcluindo(false);
    }
  };

  const openEditar = (c: Cliente) => {
    setModalEditar(c);
    setForm({
      nome: c.nome,
      cpfCnpj: c.cpfCnpj ?? '',
      telefone: c.telefone ?? '',
      email: c.email,
      valorServico: typeof c.valorServico === 'number' ? String(c.valorServico) : String(c.valorServico),
    });
  };

  const columns: Column<Cliente>[] = [
    { key: 'nome', label: 'Nome', sortable: true, headerIcon: <User className="w-4 h-4" />, render: (r) => <span className="font-medium text-slate-800">{r.nome}</span> },
    ...(isAdmin ? [{ key: 'vendedor', label: 'Vendedor', render: (r: Cliente) => r.vendedor?.nome ?? '—' } as Column<Cliente>] : []),
    { key: 'email', label: 'E-mail', sortable: true, headerIcon: <Mail className="w-4 h-4" />, className: 'hidden sm:table-cell', render: (r) => r.email },
    { key: 'statusProcesso', label: 'Status', sortable: true, render: (r) => (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
        r.statusProcesso === 'PAGO' || r.statusProcesso === 'CONCLUIDO' ? 'bg-emerald-100 text-emerald-700' :
        r.statusProcesso === 'CANCELADO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
      }`}>{statusLabel[r.statusProcesso] ?? r.statusProcesso}</span>
    )},
    { key: 'valorServico', label: 'Valor', sortable: true, className: 'hidden md:table-cell', render: (r) => formatBRL(r.valorServico) },
    {
      key: 'link',
      label: 'Link do cliente',
      render: (r) => (
        <div className="flex items-center gap-2">
          <a
            href={`/acompanhar/${r.linkAcompanhamento}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline inline-flex items-center gap-1"
          >
            <Link2 className="w-4 h-4" /> Abrir
          </a>
          <button
            type="button"
            onClick={(ev) => {
              ev.preventDefault();
              copiarLink(r.linkAcompanhamento);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-600 transition"
            title="Copiar link para enviar ao cliente"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-slate-500">Carregando clientes...</div>
      </div>
    );
  }

  const formFields = (
    <>
      <InputIcon icon={<User className="w-5 h-5" />} label="Nome completo" placeholder="Ex.: João da Silva" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
      <InputIcon icon={<CreditCard className="w-5 h-5" />} label="CPF ou CNPJ" placeholder="000.000.000-00" value={form.cpfCnpj} onChange={(e) => setForm((f) => ({ ...f, cpfCnpj: e.target.value }))} required />
      <InputIcon icon={<Phone className="w-5 h-5" />} label="WhatsApp / Telefone" placeholder="(11) 99999-9999" type="tel" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} required />
      <InputIcon icon={<Mail className="w-5 h-5" />} label="E-mail" placeholder="email@exemplo.com" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
      <InputIcon icon={<DollarSign className="w-5 h-5" />} label="Valor do serviço (R$)" placeholder="400,00" value={form.valorServico} onChange={(e) => setForm((f) => ({ ...f, valorServico: e.target.value }))} required />
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
        <button
          type="button"
          onClick={() => { setForm(emptyForm); setModalNovo(true); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium transition"
        >
          <User className="w-5 h-5" /> Novo cliente
        </button>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-sm font-medium text-slate-600">Filtros (relatório):</span>
          <input type="date" value={filtrosAdmin.dataInicio} onChange={(e) => setFiltrosAdmin((f) => ({ ...f, dataInicio: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm" />
          <input type="date" value={filtrosAdmin.dataFim} onChange={(e) => setFiltrosAdmin((f) => ({ ...f, dataFim: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm" />
          <select value={filtrosAdmin.statusProcesso} onChange={(e) => setFiltrosAdmin((f) => ({ ...f, statusProcesso: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="">Todos os status</option>
            {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="button" onClick={() => load()} className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300">Filtrar</button>
          <button
            type="button"
            onClick={() => {
              const cols: CsvColumn<Cliente>[] = [
                { key: 'nome', label: 'Nome' },
                { key: 'email', label: 'E-mail' },
                { key: 'telefone', label: 'Telefone' },
                { key: 'statusProcesso', label: 'Status', getValue: (r) => statusLabel[r.statusProcesso] ?? r.statusProcesso },
                { key: 'valorServico', label: 'Valor', getValue: (r) => (typeof r.valorServico === 'number' ? r.valorServico : Number(String(r.valorServico))).toFixed(2) },
                { key: 'dataCadastro', label: 'Data cadastro', getValue: (r) => new Date(r.dataCadastro).toLocaleString('pt-BR') },
              ];
              exportToCsv(clientes, cols, `clientes-${new Date().toISOString().slice(0, 10)}.csv`, { excel: true });
              toasts.success('Relatório exportado.');
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
          >
            <Download className="w-4 h-4" /> Exportar CSV/Excel
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        <DataTable<Cliente>
          data={clientes}
          columns={columns}
          keyExtractor={(r) => r.id}
          searchPlaceholder="Buscar por nome ou e-mail..."
          searchKeys={['nome', 'email']}
          pageSize={10}
          emptyMessage="Nenhum cliente cadastrado. Cadastre o primeiro."
          actions={(row) => [
            { label: 'Ver', icon: 'view', onClick: () => router.push(`/dashboard/clientes/${row.id}`) },
            { label: 'Editar', icon: 'edit', onClick: () => openEditar(row) },
            { label: 'Excluir', icon: 'delete', onClick: () => setModalExcluir(row) },
          ]}
        />
      </div>

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo cliente" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {formFields}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitLoading} className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50">
              {submitLoading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
            <button type="button" onClick={() => setModalNovo(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!modalEditar} onClose={() => { setModalEditar(null); setForm(emptyForm); }} title="Editar cliente" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          {formFields}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitLoading} className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50">Salvar</button>
            <button type="button" onClick={() => { setModalEditar(null); setForm(emptyForm); }} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!modalExcluir}
        onClose={() => setModalExcluir(null)}
        onConfirm={handleDelete}
        title="Excluir cliente"
        message={modalExcluir ? `Tem certeza que deseja excluir "${modalExcluir.nome}"? Esta ação não pode ser desfeita.` : ''}
        confirmLabel="Excluir"
        loading={excluindo}
      />

      <Modal open={!!linkCriado} onClose={() => setLinkCriado(null)} title="Link para o cliente" size="md">
        <p className="text-slate-600 mb-3">Envie este link ao cliente para ele acompanhar o processo e realizar o pagamento:</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={linkCriado ? `${typeof window !== 'undefined' ? window.location.origin : ''}/acompanhar/${linkCriado}` : ''}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-mono"
          />
          <button
            type="button"
            onClick={() => linkCriado && copiarLink(linkCriado)}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium inline-flex items-center gap-2"
          >
            <Copy className="w-4 h-4" /> Copiar
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">O cliente poderá ver status, etapas e pagar por PIX por este link.</p>
        <div className="flex justify-end mt-4">
          <button type="button" onClick={() => setLinkCriado(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">
            Fechar
          </button>
        </div>
      </Modal>
    </div>
  );
}
