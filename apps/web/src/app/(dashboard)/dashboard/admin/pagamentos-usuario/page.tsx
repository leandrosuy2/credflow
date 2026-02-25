'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { pagamentosUsuarioApi } from '@/lib/api';
import { usuariosApi } from '@/lib/api';
import { niveisApi } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toasts } from '@/lib/toast';
import { exportToCsv, type CsvColumn } from '@/lib/exportCsv';

type PagamentoUsuario = {
  id: string;
  valor: number | { toString(): string };
  status: string;
  dataCriacao: string;
  dataPagamento?: string | null;
  usuario?: { id: string; nome: string; email: string };
  nivel?: { id: string; nome: string; valorAdesao: unknown };
};

const formatBRL = (v: number | { toString(): string }) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    typeof v === 'number' ? v : Number(String(v))
  );

export default function AdminPagamentosUsuarioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [lista, setLista] = useState<PagamentoUsuario[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string; email: string }[]>([]);
  const [niveis, setNiveis] = useState<{ id: string; nome: string; valorAdesao: unknown }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalConfirmar, setModalConfirmar] = useState<PagamentoUsuario | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [formNovo, setFormNovo] = useState({ usuarioId: '', nivelId: '', valor: '' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [filtros, setFiltros] = useState({ status: '', dataInicio: '', dataFim: '', nivelId: '', usuarioId: '' });

  const load = () => {
    const params: { status?: string; usuarioId?: string; nivelId?: string; dataInicio?: string; dataFim?: string } = {};
    if (filtros.status) params.status = filtros.status;
    if (filtros.usuarioId) params.usuarioId = filtros.usuarioId;
    if (filtros.nivelId) params.nivelId = filtros.nivelId;
    if (filtros.dataInicio) params.dataInicio = filtros.dataInicio;
    if (filtros.dataFim) params.dataFim = filtros.dataFim;
    return pagamentosUsuarioApi.adminTodos(Object.keys(params).length ? params : undefined).then((data) => setLista((data as PagamentoUsuario[]) || []));
  };

  useEffect(() => {
    if (user?.tipo !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    Promise.all([
      load(),
      usuariosApi.list().then((data: unknown[]) => setUsuarios((data as { id: string; nome: string; email: string }[]) || [])),
      niveisApi.list().then((data: unknown[]) => setNiveis((data as { id: string; nome: string; valorAdesao: unknown }[]) || [])),
    ]).finally(() => setLoading(false));
  }, [user?.tipo, router]);

  const handleConfirmar = async () => {
    if (!modalConfirmar) return;
    setSubmitLoading(true);
    try {
      await pagamentosUsuarioApi.confirmar(modalConfirmar.id);
      toasts.success('Pagamento confirmado. Bônus gerado para o indicador.');
      setModalConfirmar(null);
      load();
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Erro ao confirmar.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nivel = niveis.find((n) => n.id === formNovo.nivelId);
    const valor = parseFloat(formNovo.valor);
    if (!nivel || isNaN(valor)) return;
    setSubmitLoading(true);
    try {
      await pagamentosUsuarioApi.criar({
        usuarioId: formNovo.usuarioId,
        nivelId: formNovo.nivelId,
        valor,
        formaPagamento: 'PIX',
      });
      toasts.success('Pagamento de adesão registrado.');
      setFormNovo({ usuarioId: '', nivelId: '', valor: '' });
      setModalNovo(false);
      load();
    } catch (err) {
      toasts.error(err instanceof Error ? err.message : 'Erro ao registrar.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (user?.tipo !== 'admin') return null;
  if (loading) return <div className="py-12 text-center text-slate-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Pagamentos de usuário (adesão)</h2>
      <p className="text-slate-600">Registre pagamentos de adesão ao nível. Ao confirmar, o bônus é gerado para o indicador.</p>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros((f) => ({ ...f, dataInicio: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm" placeholder="Data início" />
          <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros((f) => ({ ...f, dataFim: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm" placeholder="Data fim" />
          <select value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="">Todos status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
          </select>
          <select value={filtros.nivelId} onChange={(e) => setFiltros((f) => ({ ...f, nivelId: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="">Todos níveis</option>
            {niveis.map((n) => <option key={n.id} value={n.id}>{n.nome}</option>)}
          </select>
          <select value={filtros.usuarioId} onChange={(e) => setFiltros((f) => ({ ...f, usuarioId: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm min-w-[160px]">
            <option value="">Todos usuários</option>
            {usuarios.filter((u) => (u as { tipo?: string }).tipo !== 'admin').map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <button type="button" onClick={() => load()} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">Filtrar</button>
          <button
            type="button"
            onClick={() => {
              const cols: CsvColumn<PagamentoUsuario>[] = [
                { key: 'usuario', label: 'Usuário', getValue: (r) => r.usuario?.nome ?? '' },
                { key: 'email', label: 'E-mail', getValue: (r) => r.usuario?.email ?? '' },
                { key: 'nivel', label: 'Nível', getValue: (r) => (r.nivel as { nome?: string })?.nome ?? '' },
                { key: 'valor', label: 'Valor', getValue: (r) => (typeof r.valor === 'number' ? r.valor : Number(String(r.valor))).toFixed(2) },
                { key: 'status', label: 'Status' },
                { key: 'dataCriacao', label: 'Data', getValue: (r) => new Date(r.dataCriacao).toLocaleString('pt-BR') },
              ];
              exportToCsv(lista, cols, `pagamentos-adesao-${new Date().toISOString().slice(0, 10)}.csv`, { excel: true });
              toasts.success('Relatório exportado.');
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-700"
          >
            <Download className="w-4 h-4" /> Exportar CSV/Excel
          </button>
        </div>
        <button
          type="button"
          onClick={() => setModalNovo(true)}
          className="px-4 py-2 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700"
        >
          Registrar pagamento adesão
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Nível</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">{p.usuario?.nome ?? '—'} ({p.usuario?.email})</td>
                <td className="px-4 py-3">{p.nivel?.nome ?? '—'}</td>
                <td className="px-4 py-3">{formatBRL(p.valor)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${p.status === 'PAGO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3">{new Date(p.dataCriacao).toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3">
                  {p.status !== 'PAGO' && (
                    <button type="button" onClick={() => setModalConfirmar(p)} className="text-teal-600 hover:underline font-medium">
                      Confirmar pagamento
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length === 0 && <div className="py-12 text-center text-slate-500">Nenhum pagamento de adesão.</div>}
      </div>

      <ConfirmModal
        open={!!modalConfirmar}
        onClose={() => setModalConfirmar(null)}
        onConfirm={handleConfirmar}
        title="Confirmar pagamento de adesão"
        message={modalConfirmar ? `Confirmar que ${modalConfirmar.usuario?.nome ?? '—'} pagou ${formatBRL(modalConfirmar.valor)} (${modalConfirmar.nivel?.nome ?? ''})? O bônus será gerado para o indicador.` : ''}
        confirmLabel={submitLoading ? 'Confirmando...' : 'Confirmar'}
        variant="warning"
        loading={!!submitLoading}
      />

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Registrar pagamento de adesão">
        <form onSubmit={handleCriar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
            <select
              value={formNovo.usuarioId}
              onChange={(e) => setFormNovo((f) => ({ ...f, usuarioId: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            >
              <option value="">Selecione</option>
              {usuarios.filter((u) => (u as { tipo?: string }).tipo !== 'admin').map((u) => (
                <option key={u.id} value={u.id}>{u.nome} ({u.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nível</label>
            <select
              value={formNovo.nivelId}
              onChange={(e) => {
                const n = niveis.find((x) => x.id === e.target.value);
                setFormNovo((f) => ({ ...f, nivelId: e.target.value, valor: n ? String(Number((n as { valorAdesao: number }).valorAdesao)) : '' }));
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            >
              <option value="">Selecione</option>
              {niveis.map((n) => (
                <option key={n.id} value={n.id}>{n.nome} - {formatBRL(Number((n as { valorAdesao: number }).valorAdesao))}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formNovo.valor}
              onChange={(e) => setFormNovo((f) => ({ ...f, valor: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setModalNovo(false)} className="px-4 py-2 rounded-lg border border-slate-300">Cancelar</button>
            <button type="submit" disabled={submitLoading} className="px-4 py-2 rounded-lg bg-teal-600 text-white disabled:opacity-50">{submitLoading ? 'Salvando...' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
