'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usuariosApi } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { InputIcon } from '@/components/ui/InputIcon';
import { toasts } from '@/lib/toast';

type Preposto = {
  id: string;
  nome: string;
  email: string;
  status: string;
  dataCriacao: string;
  _count?: { clientes: number };
};

export default function PrepostosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [lista, setLista] = useState<Preposto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalEditar, setModalEditar] = useState<Preposto | null>(null);
  const [modalExcluir, setModalExcluir] = useState<Preposto | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', senha: '' });
  const [formEditar, setFormEditar] = useState({ nome: '', email: '', senha: '' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const load = () => usuariosApi.prepostos().then((data) => setLista((data as Preposto[]) || []));

  useEffect(() => {
    if (!user) return;
    if (user.tipo !== 'vendedor') {
      router.replace('/dashboard');
      return;
    }
    load().finally(() => setLoading(false));
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await usuariosApi.createPreposto({ nome: form.nome.trim(), email: form.email.trim(), senha: form.senha });
      toasts.success('Preposto cadastrado com sucesso.');
      setForm({ nome: '', email: '', senha: '' });
      setModalNovo(false);
      load();
    } catch (err) {
      toasts.error(err instanceof Error ? err.message : 'Erro ao cadastrar.');
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!modalEditar) return;
    setSubmitLoading(true);
    try {
      await usuariosApi.update(modalEditar.id, {
        nome: formEditar.nome.trim(),
        email: formEditar.email.trim(),
        ...(formEditar.senha ? { senha: formEditar.senha } : {}),
      });
      toasts.success('Preposto atualizado com sucesso.');
      setModalEditar(null);
      setFormEditar({ nome: '', email: '', senha: '' });
      load();
    } catch (err) {
      toasts.error(err instanceof Error ? err.message : 'Erro ao atualizar.');
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDelete() {
    if (!modalExcluir) return;
    setExcluindo(true);
    try {
      await usuariosApi.remove(modalExcluir.id);
      toasts.success('Preposto excluído.');
      setModalExcluir(null);
      load();
    } catch (err) {
      toasts.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      setExcluindo(false);
    }
  }

  const openEditar = (p: Preposto) => {
    setModalEditar(p);
    setFormEditar({ nome: p.nome, email: p.email, senha: '' });
  };

  if (user?.tipo !== 'vendedor') return null;

  const columns: Column<Preposto>[] = [
    { key: 'nome', label: 'Nome', sortable: true, headerIcon: <User className="w-4 h-4" />, render: (r) => <span className="font-medium text-slate-800">{r.nome}</span> },
    { key: 'email', label: 'E-mail', sortable: true, headerIcon: <Mail className="w-4 h-4" />, render: (r) => r.email },
    { key: 'status', label: 'Status', sortable: true, render: (r) => r.status },
    { key: '_count', label: 'Clientes', sortable: false, render: (r) => r._count?.clientes ?? 0 },
  ];

  if (loading) return <div className="py-12 text-center text-slate-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Meus prepostos</h2>
        <button type="button" onClick={() => setModalNovo(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium transition">
          <UserPlus className="w-5 h-5" /> Cadastrar preposto
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        <DataTable<Preposto>
          data={lista}
          columns={columns}
          keyExtractor={(r) => r.id}
          searchPlaceholder="Buscar por nome ou e-mail..."
          searchKeys={['nome', 'email']}
          pageSize={10}
          emptyMessage="Nenhum preposto cadastrado. Clique em Cadastrar preposto para adicionar."
          actions={(row) => [
            { label: 'Editar', icon: 'edit', onClick: () => openEditar(row) },
            { label: 'Excluir', icon: 'delete', onClick: () => setModalExcluir(row) },
          ]}
        />
      </div>

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo preposto" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputIcon icon={<User className="w-5 h-5" />} label="Nome completo" placeholder="Ex.: Maria Santos" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
          <InputIcon icon={<Mail className="w-5 h-5" />} label="E-mail" placeholder="email@exemplo.com" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          <InputIcon icon={<Lock className="w-5 h-5" />} label="Senha" placeholder="Mínimo 6 caracteres" type="password" value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} required minLength={6} />
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitLoading} className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50">{submitLoading ? 'Cadastrando...' : 'Cadastrar'}</button>
            <button type="button" onClick={() => setModalNovo(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!modalEditar} onClose={() => { setModalEditar(null); setFormEditar({ nome: '', email: '', senha: '' }); }} title="Editar preposto" size="md">
        <form onSubmit={handleUpdate} className="space-y-4">
          <InputIcon icon={<User className="w-5 h-5" />} label="Nome completo" placeholder="Ex.: Maria Santos" value={formEditar.nome} onChange={(e) => setFormEditar((f) => ({ ...f, nome: e.target.value }))} required />
          <InputIcon icon={<Mail className="w-5 h-5" />} label="E-mail" placeholder="email@exemplo.com" type="email" value={formEditar.email} onChange={(e) => setFormEditar((f) => ({ ...f, email: e.target.value }))} required />
          <InputIcon icon={<Lock className="w-5 h-5" />} label="Nova senha (deixe em branco para não alterar)" placeholder="Mínimo 6 caracteres" type="password" value={formEditar.senha} onChange={(e) => setFormEditar((f) => ({ ...f, senha: e.target.value }))} minLength={6} />
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitLoading} className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50">{submitLoading ? 'Salvando...' : 'Salvar'}</button>
            <button type="button" onClick={() => { setModalEditar(null); setFormEditar({ nome: '', email: '', senha: '' }); }} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!modalExcluir}
        onClose={() => setModalExcluir(null)}
        onConfirm={handleDelete}
        title="Excluir preposto"
        message={modalExcluir ? `Tem certeza que deseja excluir "${modalExcluir.nome}"? Esta ação não pode ser desfeita.` : ''}
        confirmLabel={excluindo ? 'Excluindo...' : 'Excluir'}
        loading={excluindo}
      />
    </div>
  );
}
