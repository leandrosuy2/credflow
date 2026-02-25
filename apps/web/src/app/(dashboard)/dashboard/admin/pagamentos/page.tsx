'use client';

import { useEffect, useState } from 'react';
import { User, DollarSign, CreditCard, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { pagamentosApi } from '@/lib/api';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toasts } from '@/lib/toast';

type Pagamento = {
  id: string;
  valor: number | { toString(): string };
  formaPagamento: string;
  status: string;
  dataCriacao: string;
  dataPagamento?: string | null;
  cliente?: { nome: string; email: string };
  clienteNome?: string;
};

export default function AdminPagamentosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [lista, setLista] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [modalConfirmar, setModalConfirmar] = useState<Pagamento | null>(null);

  const load = () => pagamentosApi.list().then((data) => {
    const items = (data as Pagamento[]) || [];
    setLista(items.map((p) => ({ ...p, clienteNome: p.cliente?.nome ?? '' })));
  });

  useEffect(() => {
    if (user?.tipo !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    load().finally(() => setLoading(false));
  }, [user?.tipo, router]);

  const formatBRL = (v: number | { toString(): string }) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      typeof v === 'number' ? v : Number(String(v))
    );

  async function confirmar() {
    if (!modalConfirmar) return;
    const id = modalConfirmar.id;
    setConfirmando(id);
    try {
      await pagamentosApi.confirmar(id);
      toasts.success('Pagamento confirmado com sucesso.');
      setModalConfirmar(null);
      load();
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Erro ao confirmar.');
    } finally {
      setConfirmando(null);
    }
  }

  if (user?.tipo !== 'admin') return null;

  const columns: Column<Pagamento>[] = [
    { key: 'cliente', label: 'Cliente', sortable: true, headerIcon: <User className="w-4 h-4" />, render: (r) => (
      <div>
        <span className="font-medium text-slate-800">{r.cliente?.nome ?? '—'}</span>
        {r.cliente?.email && <span className="block text-xs text-slate-500">{r.cliente.email}</span>}
      </div>
    )},
    { key: 'valor', label: 'Valor', sortable: true, headerIcon: <DollarSign className="w-4 h-4" />, render: (r) => formatBRL(r.valor) },
    { key: 'formaPagamento', label: 'Forma', sortable: true, headerIcon: <CreditCard className="w-4 h-4" />, render: (r) => r.formaPagamento },
    { key: 'status', label: 'Status', sortable: true, render: (r) => (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${r.status === 'PAGO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
    )},
    { key: 'acao', label: 'Ação', sortable: false, render: (r) => (
      r.status !== 'PAGO' ? (
        <button type="button" onClick={() => setModalConfirmar(r)} disabled={!!confirmando} className="inline-flex items-center gap-1.5 text-teal-600 hover:underline font-medium disabled:opacity-50">
          <CheckCircle className="w-4 h-4" /> Confirmar
        </button>
      ) : <span className="text-slate-500">—</span>
    )},
  ];

  if (loading) return <div className="py-12 text-center text-slate-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Pagamentos</h2>
      <ConfirmModal
        open={!!modalConfirmar}
        onClose={() => setModalConfirmar(null)}
        onConfirm={confirmar}
        title="Confirmar pagamento"
        message={modalConfirmar ? `Confirmar pagamento de ${formatBRL(modalConfirmar.valor)} do cliente ${modalConfirmar.cliente?.nome ?? '—'}? O status será atualizado para Pago e a comissão será calculada.` : ''}
        confirmLabel={confirmando ? 'Confirmando...' : 'Confirmar pagamento'}
        variant="warning"
        loading={!!confirmando}
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        <DataTable<Pagamento>
          data={lista}
          columns={columns}
          keyExtractor={(r) => r.id}
          searchPlaceholder="Buscar por nome do cliente..."
          searchKeys={['clienteNome']}
          pageSize={10}
          emptyMessage="Nenhum pagamento registrado."
        />
      </div>
    </div>
  );
}
