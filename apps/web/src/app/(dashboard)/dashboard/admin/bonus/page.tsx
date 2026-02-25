'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { bonusApi, niveisApi, usuariosApi } from '@/lib/api';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { exportToCsv, type CsvColumn } from '@/lib/exportCsv';
import { toasts } from '@/lib/toast';

type Bonus = {
  id: string;
  valor: number | { toString(): string };
  status: string;
  dataGeracao: string;
  dataPagamento?: string | null;
  beneficiario?: { id: string; nome: string; email: string };
  pagamentoUsuario?: { usuario?: { nome: string }; nivel?: { nome: string } };
  pagamento?: { cliente?: { nome: string } };
};

/** Bonus com campos extras usados na busca da DataTable */
type BonusRow = Bonus & { _beneficiarioNome?: string; _beneficiarioEmail?: string };

type Nivel = { id: string; nome: string };
type UsuarioOpt = { id: string; nome: string; email: string };

const formatBRL = (v: number | { toString(): string }) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    typeof v === 'number' ? v : Number(String(v))
  );
const formatDate = (s: string) => new Date(s).toLocaleString('pt-BR');

export default function AdminBonusPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [lista, setLista] = useState<BonusRow[]>([]);
  const [resumo, setResumo] = useState<{ totalPendente: number; totalPago: number; quantidadePendente: number; quantidadePago: number } | null>(null);
  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ status: '', dataInicio: '', dataFim: '', nivelId: '', beneficiarioId: '' });

  const load = () => {
    const params: Parameters<typeof bonusApi.adminTodos>[0] = {};
    if (filtros.status) params.status = filtros.status;
    if (filtros.dataInicio) params.dataInicio = filtros.dataInicio;
    if (filtros.dataFim) params.dataFim = filtros.dataFim;
    if (filtros.nivelId) params.nivelId = filtros.nivelId;
    if (filtros.beneficiarioId) params.beneficiarioId = filtros.beneficiarioId;
    return Promise.all([
      bonusApi.adminTodos(Object.keys(params).length ? params : undefined).then((data) => {
        const items = (data as Bonus[]) || [];
        setLista(items.map((b): BonusRow => ({ ...b, _beneficiarioNome: b.beneficiario?.nome ?? '', _beneficiarioEmail: b.beneficiario?.email ?? '' })));
      }),
      bonusApi.adminResumo().then((data) => setResumo(data as { totalPendente: number; totalPago: number; quantidadePendente: number; quantidadePago: number })),
    ]);
  };

  useEffect(() => {
    if (user?.tipo !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    Promise.all([
      niveisApi.list().then((d) => setNiveis((d as Nivel[]) || [])),
      usuariosApi.list().then((d) => setUsuarios((d as UsuarioOpt[]) || [])),
    ]).then(() => load().finally(() => setLoading(false)));
  }, [user?.tipo, router]);

  if (user?.tipo !== 'admin') return null;
  if (loading && !lista.length) return <div className="py-12 text-center text-slate-500">Carregando...</div>;

  const columns: Column<BonusRow>[] = [
    { key: 'beneficiario', label: 'Beneficiário', render: (r) => (
      <div>
        <span className="font-medium text-slate-800">{r.beneficiario?.nome ?? '—'}</span>
        {r.beneficiario?.email && <span className="block text-xs text-slate-500">{r.beneficiario.email}</span>}
      </div>
    )},
    { key: 'valor', label: 'Valor', render: (r) => formatBRL(r.valor) },
    { key: 'status', label: 'Status', render: (r) => (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
        r.status === 'PAGO' ? 'bg-emerald-100 text-emerald-700' : r.status === 'CANCELADO' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
      }`}>{r.status}</span>
    )},
    { key: 'origem', label: 'Origem', render: (r) => {
      if (r.pagamentoUsuario?.usuario?.nome) return `Adesão: ${r.pagamentoUsuario.usuario.nome} (${r.pagamentoUsuario.nivel?.nome ?? ''})`;
      if (r.pagamento?.cliente?.nome) return `Cliente: ${r.pagamento.cliente.nome}`;
      return '—';
    }},
    { key: 'dataGeracao', label: 'Data geração', render: (r) => formatDate(r.dataGeracao) },
    { key: 'dataPagamento', label: 'Data pagamento', render: (r) => r.dataPagamento ? formatDate(r.dataPagamento) : '—' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Bônus gerados</h2>

      {resumo && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <p className="text-sm text-amber-800">Bônus pendentes</p>
            <p className="text-2xl font-bold text-amber-900">{formatBRL(resumo.totalPendente)}</p>
            <p className="text-xs text-amber-700">{resumo.quantidadePendente} registro(s)</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
            <p className="text-sm text-emerald-800">Bônus já pagos</p>
            <p className="text-2xl font-bold text-emerald-900">{formatBRL(resumo.totalPago)}</p>
            <p className="text-xs text-emerald-700">{resumo.quantidadePago} registro(s)</p>
          </div>
        </div>
      )}

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
            <option value="PAGO">Pago</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Nível</label>
          <select value={filtros.nivelId} onChange={(e) => setFiltros((f) => ({ ...f, nivelId: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="">Todos</option>
            {niveis.map((n) => <option key={n.id} value={n.id}>{n.nome}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Beneficiário</label>
          <select value={filtros.beneficiarioId} onChange={(e) => setFiltros((f) => ({ ...f, beneficiarioId: e.target.value }))} className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm min-w-[180px]">
            <option value="">Todos</option>
            {usuarios.filter((u) => (u as { tipo?: string }).tipo !== 'admin').map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => load()} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200">Filtrar</button>
        <button
          type="button"
          onClick={() => {
            const cols: CsvColumn<Bonus>[] = [
              { key: 'beneficiario', label: 'Beneficiário', getValue: (r) => r.beneficiario?.nome ?? '' },
              { key: 'email', label: 'E-mail', getValue: (r) => r.beneficiario?.email ?? '' },
              { key: 'valor', label: 'Valor', getValue: (r) => (typeof r.valor === 'number' ? r.valor : Number(String(r.valor))).toFixed(2) },
              { key: 'status', label: 'Status' },
              { key: 'origem', label: 'Origem', getValue: (r) => r.pagamentoUsuario?.usuario?.nome ? `Adesão: ${r.pagamentoUsuario.usuario.nome}` : r.pagamento?.cliente?.nome ?? '' },
              { key: 'dataGeracao', label: 'Data geração', getValue: (r) => formatDate(r.dataGeracao) },
            ];
            exportToCsv(lista, cols, `bonus-${new Date().toISOString().slice(0, 10)}.csv`, { excel: true });
            toasts.success('Relatório exportado.');
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
        >
          <Download className="w-4 h-4" /> Exportar CSV/Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        <DataTable<BonusRow>
          data={lista}
          columns={columns}
          keyExtractor={(r) => r.id}
          searchPlaceholder="Buscar..."
          searchKeys={['_beneficiarioNome', '_beneficiarioEmail']}
          pageSize={15}
          emptyMessage="Nenhum bônus encontrado."
        />
      </div>
    </div>
  );
}
