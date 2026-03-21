'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, Mail, Lock, UserCircle, Award, RefreshCw, TreePine, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usuariosApi, niveisApi, auditApi } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { InputIcon } from '@/components/ui/InputIcon';
import { toasts } from '@/lib/toast';

type NivelOpt = { id: string; nome: string };
type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  status: string;
  vendedorPaiId?: string | null;
  nivelId?: string | null;
  nivel?: NivelOpt | null;
  _count?: { clientes: number; indicados?: number };
};
type AuditEntry = { id: string; campo: string | null; valorAnterior: string | null; valorNovo: string | null; acao: string; data: string; usuarioAdmin?: { nome: string } };
type VendedorOpt = { id: string; nome: string; tipo: string };

export default function AdminVendedoresPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [lista, setLista] = useState<Usuario[]>([]);
  const [vendedores, setVendedores] = useState<VendedorOpt[]>([]);
  const [niveis, setNiveis] = useState<NivelOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalEditar, setModalEditar] = useState<Usuario | null>(null);
  const [modalExcluir, setModalExcluir] = useState<Usuario | null>(null);
  const [modalAlterarNivel, setModalAlterarNivel] = useState<Usuario | null>(null);
  const [nivelIdNovo, setNivelIdNovo] = useState('');
  const [historicoNivel, setHistoricoNivel] = useState<AuditEntry[]>([]);
  const [formNovo, setFormNovo] = useState({ tipo: 'vendedor' as 'vendedor' | 'preposto', vendedorPaiId: '', nome: '', email: '', senha: '' });
  const [formEditar, setFormEditar] = useState({ nome: '', email: '', status: 'ATIVO', senha: '' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [alterandoNivel, setAlterandoNivel] = useState(false);

  const load = () =>
    Promise.all([
      usuariosApi.list().then((data) => setLista((data as Usuario[]) || [])),
      usuariosApi.vendedores().then((data) => setVendedores((data as VendedorOpt[]) || [])),
      niveisApi.list().then((data) => setNiveis((data as NivelOpt[]) || [])),
    ]);

  useEffect(() => {
    if (user?.tipo !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    load().finally(() => setLoading(false));
  }, [user?.tipo, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await usuariosApi.create({
        nome: formNovo.nome.trim(),
        email: formNovo.email.trim(),
        senha: formNovo.senha,
        tipo: formNovo.tipo,
        vendedorPaiId: formNovo.tipo === 'preposto' ? formNovo.vendedorPaiId || undefined : undefined,
      });
      toasts.success('Cadastro realizado com sucesso.');
      setFormNovo({ tipo: 'vendedor', vendedorPaiId: '', nome: '', email: '', senha: '' });
      setModalNovo(false);
      load();
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
      await usuariosApi.update(modalEditar.id, {
        nome: formEditar.nome.trim(),
        email: formEditar.email.trim(),
        status: formEditar.status,
        ...(formEditar.senha ? { senha: formEditar.senha } : {}),
      });
      toasts.success('Atualizado com sucesso.');
      setModalEditar(null);
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
      await usuariosApi.remove(modalExcluir.id);
      toasts.success('Usuário excluído.');
      setModalExcluir(null);
      load();
    } catch (err) {
      toasts.error(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      setExcluindo(false);
    }
  };

  const openEditar = (u: Usuario) => {
    setModalEditar(u);
    setFormEditar({ nome: u.nome, email: u.email, status: u.status ?? 'ATIVO', senha: '' });
    setHistoricoNivel([]);
    auditApi.listar({ entidade: 'Usuario', entidadeId: u.id, limit: 50 }).then((data) => {
      const logs = (data as AuditEntry[]).filter((l) => l.campo === 'nivelId' || l.acao === 'ALTERAR_NIVEL');
      setHistoricoNivel(logs);
    }).catch(() => setHistoricoNivel([]));
  };

  const openAlterarNivel = (u: Usuario) => {
    setModalAlterarNivel(u);
    setNivelIdNovo(u.nivelId || '');
  };

  const handleAlterarNivel = async () => {
    if (!modalAlterarNivel || !nivelIdNovo) return;
    setAlterandoNivel(true);
    try {
      await usuariosApi.update(modalAlterarNivel.id, { nivelId: nivelIdNovo });
      toasts.success('Nível alterado. O link de indicação do vendedor será atualizado automaticamente.');
      setModalAlterarNivel(null);
      load();
      if (modalEditar?.id === modalAlterarNivel.id) {
        const updated = await usuariosApi.get(modalAlterarNivel.id);
        setModalEditar(updated as Usuario);
        auditApi.listar({ entidade: 'Usuario', entidadeId: modalAlterarNivel.id, limit: 50 }).then((data) => {
          const logs = (data as AuditEntry[]).filter((l) => l.campo === 'nivelId' || l.acao === 'ALTERAR_NIVEL');
          setHistoricoNivel(logs);
        }).catch(() => {});
      }
    } catch (err) {
      toasts.error(err instanceof Error ? err.message : 'Erro ao alterar nível.');
    } finally {
      setAlterandoNivel(false);
    }
  };

  if (user?.tipo !== 'admin') return null;

  const filtered = lista.filter((u) => u.tipo !== 'admin');
  const columns: Column<Usuario>[] = [
    { key: 'nome', label: 'Nome', sortable: true, headerIcon: <User className="w-4 h-4" />, render: (r) => <span className="font-medium text-slate-800">{r.nome}</span> },
    { key: 'email', label: 'E-mail', sortable: true, headerIcon: <Mail className="w-4 h-4" />, render: (r) => r.email },
    { key: 'tipo', label: 'Tipo', sortable: true, render: (r) => <span className="capitalize">{r.tipo}</span> },
    { key: 'nivel', label: 'Nível', sortable: false, headerIcon: <Award className="w-4 h-4" />, render: (r) => r.nivel?.nome ?? '—' },
    { key: 'status', label: 'Status', sortable: true, render: (r) => r.status },
    { key: '_count', label: 'Clientes', sortable: false, render: (r) => r._count?.clientes ?? 0 },
  ];

  if (loading) return <div className="py-12 text-center text-slate-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Gestão de Vendedores</h2>
        <button type="button" onClick={() => setModalNovo(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium transition">
          <UserCircle className="w-5 h-5" /> Novo vendedor / preposto
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        <DataTable<Usuario>
          data={filtered}
          columns={columns}
          keyExtractor={(r) => r.id}
          searchPlaceholder="Buscar por nome ou e-mail..."
          searchKeys={['nome', 'email']}
          pageSize={10}
          emptyMessage="Nenhum vendedor ou preposto cadastrado."
          actions={(row) => [
            { label: 'Editar', icon: 'edit', onClick: () => openEditar(row) },
            { label: 'Excluir', icon: 'delete', onClick: () => setModalExcluir(row) },
          ]}
        />
      </div>

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo vendedor ou preposto" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
            <select value={formNovo.tipo} onChange={(e) => setFormNovo((f) => ({ ...f, tipo: e.target.value as 'vendedor' | 'preposto' }))} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500">
              <option value="vendedor">Vendedor</option>
              <option value="preposto">Preposto</option>
            </select>
          </div>
          {formNovo.tipo === 'preposto' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendedor pai</label>
              <select value={formNovo.vendedorPaiId} onChange={(e) => setFormNovo((f) => ({ ...f, vendedorPaiId: e.target.value }))} required={formNovo.tipo === 'preposto'} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500">
                <option value="">Selecione o vendedor</option>
                {vendedores.filter((v) => v.tipo === 'vendedor').map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </div>
          )}
          <InputIcon icon={<User className="w-5 h-5" />} label="Nome" placeholder="Nome completo" value={formNovo.nome} onChange={(e) => setFormNovo((f) => ({ ...f, nome: e.target.value }))} required />
          <InputIcon icon={<Mail className="w-5 h-5" />} label="E-mail" placeholder="email@exemplo.com" type="email" value={formNovo.email} onChange={(e) => setFormNovo((f) => ({ ...f, email: e.target.value }))} required />
          <InputIcon icon={<Lock className="w-5 h-5" />} label="Senha" placeholder="Mínimo 6 caracteres" type="password" value={formNovo.senha} onChange={(e) => setFormNovo((f) => ({ ...f, senha: e.target.value }))} required minLength={6} />
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitLoading} className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50">{submitLoading ? 'Cadastrando...' : 'Cadastrar'}</button>
            <button type="button" onClick={() => setModalNovo(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!modalEditar} onClose={() => setModalEditar(null)} title="Editar vendedor / preposto" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          <InputIcon icon={<User className="w-5 h-5" />} label="Nome" placeholder="Nome completo" value={formEditar.nome} onChange={(e) => setFormEditar((f) => ({ ...f, nome: e.target.value }))} required />
          <InputIcon icon={<Mail className="w-5 h-5" />} label="E-mail" placeholder="email@exemplo.com" type="email" value={formEditar.email} onChange={(e) => setFormEditar((f) => ({ ...f, email: e.target.value }))} required />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
            <select value={formEditar.status} onChange={(e) => setFormEditar((f) => ({ ...f, status: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500">
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>
          {modalEditar && (modalEditar.tipo === 'vendedor' || modalEditar.tipo === 'preposto') && (
            <>
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                  <Award className="w-4 h-4" /> Nível
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 font-medium">{modalEditar.nivel?.nome ?? '—'}</span>
                  <button type="button" onClick={() => openAlterarNivel(modalEditar)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 font-medium text-sm">
                    <RefreshCw className="w-4 h-4" /> Alterar Nível
                  </button>
                  <Link href="/dashboard/admin/arvore-indicacao" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm" onClick={() => setModalEditar(null)}>
                    <TreePine className="w-4 h-4" /> Ver rede abaixo dele
                  </Link>
                </div>
              </div>
              {historicoNivel.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <History className="w-4 h-4" /> Histórico de alterações de nível
                  </p>
                  <ul className="text-sm text-slate-600 space-y-1 max-h-32 overflow-y-auto">
                    {historicoNivel.map((h) => (
                      <li key={h.id}>
                        {h.valorAnterior ?? '—'} → {h.valorNovo ?? '—'}
                        {h.usuarioAdmin?.nome && ` (${h.usuarioAdmin.nome})`}
                        {' · '}
                        {new Date(h.data).toLocaleString('pt-BR')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <InputIcon icon={<Lock className="w-5 h-5" />} label="Nova senha (deixe em branco para não alterar)" placeholder="Mín. 6 caracteres" type="password" value={formEditar.senha} onChange={(e) => setFormEditar((f) => ({ ...f, senha: e.target.value }))} minLength={6} />
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitLoading} className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50">Salvar</button>
            <button type="button" onClick={() => setModalEditar(null)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!modalAlterarNivel} onClose={() => setModalAlterarNivel(null)} title="Alterar nível" size="sm">
        <div className="space-y-4">
          {modalAlterarNivel && (
            <p className="text-slate-600 text-sm">
              Vendedor: <strong>{modalAlterarNivel.nome}</strong>. O link de indicação será atualizado conforme o novo nível.
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Novo nível</label>
            <select value={nivelIdNovo} onChange={(e) => setNivelIdNovo(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500">
              <option value="">— Sem nível —</option>
              {niveis.map((n) => (
                <option key={n.id} value={n.id}>{n.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleAlterarNivel} disabled={alterandoNivel} className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium disabled:opacity-50">
              {alterandoNivel ? 'Alterando...' : 'Confirmar'}
            </button>
            <button type="button" onClick={() => setModalAlterarNivel(null)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">Cancelar</button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!modalExcluir} onClose={() => setModalExcluir(null)} onConfirm={handleDelete} title="Excluir usuário" message={modalExcluir ? `Excluir "${modalExcluir.nome}"? Esta ação não pode ser desfeita.` : ''} confirmLabel="Excluir" loading={excluindo} />
    </div>
  );
}
