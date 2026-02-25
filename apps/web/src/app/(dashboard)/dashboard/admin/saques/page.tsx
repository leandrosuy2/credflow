'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { saquesApi, usuariosApi } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toasts } from '@/lib/toast';
import { exportToCsv, type CsvColumn } from '@/lib/exportCsv';

type Saque = {
  id: string;
  valor: number | { toString(): string };
  status: string;
  dataSolicitacao: string;
  dataAprovacao?: string | null;
  dataPagamento?: string | null;
  motivoRecusa?: string | null;
  usuario?: { id: string; nome: string; email: string };
};

type UsuarioOpt = { id: string; nome: string; email: string };

const formatBRL = (v: number | { toString(): string }) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    typeof v === 'number' ? v : Number(String(v))
  );
const formatDate = (s: string) => new Date(s).toLocaleString('pt-BR');

export default function AdminSaquesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [lista, setLista] = useState<Saque[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAcao, setModalAcao] = useState<{ saque: Saque; acao: 'aprovar' | 'recusar' | 'pagar' } | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [filtros, setFiltros] = useState({ status: '', dataInicio: '', dataFim: '', usuarioId: '' });

  const load = () => {
    const params: { status?: string; usuarioId?: string; dataInicio?: string; dataFim?: string } = {};
    if (filtros.status) params.status = filtros.status;
    if (filtros.usuarioId) params.usuarioId = filtros.usuarioId;
    if (filtros.dataInicio) params.dataInicio = filtros.dataInicio;
    if (filtros.dataFim) params.dataFim = filtros.dataFim;
    return saquesApi.adminTodos(Object.keys(params).length ? params : undefined).then((data) => setLista((data as Saque[]) || []));
  };

  useEffect(() => {
    if (user?.tipo !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    Promise.all([
      usuariosApi.list().then((d) => setUsuarios((d as UsuarioOpt[]) || [])),
      load(),
    ]).finally(() => setLoading(false));
  }, [user?.tipo, router]);

  const handleAprovar = async () => {
    if (!modalAcao || modalAcao.acao !== 'aprovar') return;
    setSubmitLoading(true);
    try {
      await saquesApi.adminAprovar(modalAcao.saque.id);
      toasts.success('Saque aprovado.');
      setModalAcao(null);
      load();
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Erro ao aprovar.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRecusar = async () => {
    if (!modalAcao || modalAcao.acao !== 'recusar') return;
    setSubmitLoading(true);
    try {
      await saquesApi.adminRecusar(modalAcao.saque.id, motivoRecusa || 'Não informado');
      toasts.success('Saque recusado.');
      setModalAcao(null);
      setMotivoRecusa('');
      load();
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Erro ao recusar.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleMarcarPago = async () => {
    if (!modalAcao || modalAcao.acao !== 'pagar') return;
    setSubmitLoading(true);
    try {
      await saquesApi.adminMarcarPago(modalAcao.saque.id);
      toasts.success('Saque marcado como pago.');
      setModalAcao(null);
      load();
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Erro.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (user?.tipo !== 'admin') return null;
  if (loading && !lista.length) return <div className="py-12 text-center text-slate-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Solicitações de saque</h2>
      <p className="text-slate-600">Aprove ou recuse saques. Saques só podem ser solicitados às quintas-feiras.</p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Data início</label>
          <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros((f) => ({ ...f, dataInicio: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Data fim</label>
          <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros((f) => ({ ...f, dataFim: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Status</label>
          <select value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="">Todos</option>
            <option value="PENDENTE">Pendente</option>
            <option value="APROVADO">Aprovado</option>
            <option value="PAGO">Pago</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Usuário</label>
          <select value={filtros.usuarioId} onChange={(e) => setFiltros((f) => ({ ...f, usuarioId: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm min-w-[180px]">
            <option value="">Todos</option>
            {usuarios.filter((u) => (u as { tipo?: string }).tipo !== 'admin').map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => load()} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">Filtrar</button>
        <button
          type="button"
          onClick={() => {
            const cols: CsvColumn<Saque>[] = [
              { key: 'usuario', label: 'Usuário', getValue: (r) => r.usuario?.nome ?? '' },
              { key: 'email', label: 'E-mail', getValue: (r) => r.usuario?.email ?? '' },
              { key: 'valor', label: 'Valor', getValue: (r) => (typeof r.valor === 'number' ? r.valor : Number(String(r.valor))).toFixed(2) },
              { key: 'status', label: 'Status' },
              { key: 'dataSolicitacao', label: 'Data solicitação', getValue: (r) => formatDate(r.dataSolicitacao) },
            ];
            exportToCsv(lista, cols, `saques-${new Date().toISOString().slice(0, 10)}.csv`, { excel: true });
            toasts.success('Relatório exportado.');
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
        >
          <Download className="w-4 h-4" /> Exportar CSV/Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data solicitação</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-slate-800">{s.usuario?.nome ?? '—'}</span>
                      {s.usuario?.email && <span className="block text-xs text-slate-500">{s.usuario.email}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatBRL(s.valor)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      s.status === 'PAGO' ? 'bg-emerald-100 text-emerald-700' :
                      s.status === 'CANCELADO' ? 'bg-slate-100 text-slate-600' :
                      s.status === 'APROVADO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3">{formatDate(s.dataSolicitacao)}</td>
                  <td className="px-4 py-3 flex flex-wrap gap-2">
                    {s.status === 'PENDENTE' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setModalAcao({ saque: s, acao: 'aprovar' })}
                          className="text-teal-600 hover:underline font-medium"
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalAcao({ saque: s, acao: 'recusar' })}
                          className="text-red-600 hover:underline font-medium"
                        >
                          Recusar
                        </button>
                      </>
                    )}
                    {s.status === 'APROVADO' && (
                      <button
                        type="button"
                        onClick={() => setModalAcao({ saque: s, acao: 'pagar' })}
                        className="text-emerald-600 hover:underline font-medium"
                      >
                        Marcar como pago
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && (
          <div className="py-12 text-center text-slate-500">Nenhuma solicitação de saque.</div>
        )}
      </div>

      {modalAcao?.acao === 'aprovar' && (
        <ConfirmModal
          open
          onClose={() => setModalAcao(null)}
          onConfirm={handleAprovar}
          title="Aprovar saque"
          message={`Aprovar saque de ${formatBRL(modalAcao.saque.valor)} de ${modalAcao.saque.usuario?.nome ?? '—'}?`}
          confirmLabel={submitLoading ? 'Aprovando...' : 'Aprovar'}
          variant="warning"
          loading={!!submitLoading}
        />
      )}

      {modalAcao?.acao === 'recusar' && (
        <Modal open onClose={() => { setModalAcao(null); setMotivoRecusa(''); }} title="Recusar saque">
          <p className="text-slate-600 mb-4">Saque de {formatBRL(modalAcao.saque.valor)} - {modalAcao.saque.usuario?.nome}</p>
          <label className="block text-sm font-medium text-slate-700 mb-1">Motivo da recusa</label>
          <textarea
            value={motivoRecusa}
            onChange={(e) => setMotivoRecusa(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            rows={3}
            placeholder="Opcional"
          />
          <div className="flex gap-2 justify-end mt-4">
            <button type="button" onClick={() => { setModalAcao(null); setMotivoRecusa(''); }} className="px-4 py-2 rounded-lg border border-slate-300">
              Cancelar
            </button>
            <button type="button" onClick={handleRecusar} disabled={submitLoading} className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50">
              {submitLoading ? 'Recusando...' : 'Recusar'}
            </button>
          </div>
        </Modal>
      )}

      {modalAcao?.acao === 'pagar' && (
        <ConfirmModal
          open
          onClose={() => setModalAcao(null)}
          onConfirm={handleMarcarPago}
          title="Marcar como pago"
          message={`Confirmar que o saque de ${formatBRL(modalAcao.saque.valor)} foi pago para ${modalAcao.saque.usuario?.nome ?? '—'}? Os bônus correspondentes serão marcados como pagos.`}
          confirmLabel={submitLoading ? 'Confirmando...' : 'Marcar como pago'}
          variant="warning"
          loading={!!submitLoading}
        />
      )}
    </div>
  );
}
