'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { niveisApi } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { toasts } from '@/lib/toast';

type Nivel = {
  id: string;
  nome: string;
  valorAdesao: number | { toString(): string };
  valorBonus: number | { toString(): string };
  ordem: number;
  _count?: { usuarios: number };
};

const formatBRL = (v: number | { toString(): string }) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    typeof v === 'number' ? v : Number(String(v))
  );

export default function AdminNiveisPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [lista, setLista] = useState<Nivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalEditar, setModalEditar] = useState<Nivel | null>(null);
  const [form, setForm] = useState({ valorAdesao: '', valorBonus: '' });
  const [submitLoading, setSubmitLoading] = useState(false);

  const load = () => niveisApi.list().then((data) => setLista((data as Nivel[]) || []));

  useEffect(() => {
    if (user?.tipo !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    load().finally(() => setLoading(false));
  }, [user?.tipo, router]);

  const openEditar = (n: Nivel) => {
    setModalEditar(n);
    setForm({
      valorAdesao: String(typeof n.valorAdesao === 'number' ? n.valorAdesao : Number(String(n.valorAdesao))),
      valorBonus: String(typeof n.valorBonus === 'number' ? n.valorBonus : Number(String(n.valorBonus))),
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditar) return;
    setSubmitLoading(true);
    try {
      await niveisApi.update(modalEditar.id, {
        valorAdesao: parseFloat(form.valorAdesao),
        valorBonus: parseFloat(form.valorBonus),
      });
      toasts.success('Nível atualizado.');
      setModalEditar(null);
      load();
    } catch (err) {
      toasts.error(err instanceof Error ? err.message : 'Erro ao atualizar.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (user?.tipo !== 'admin') return null;
  if (loading) return <div className="py-12 text-center text-slate-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Níveis (Bronze, Prata, Ouro)</h2>
      <p className="text-slate-600">Ajuste valores de adesão e bônus por nível. Alterações ficam registradas em auditoria.</p>

      <div className="grid gap-4 md:grid-cols-3">
        {lista.map((n) => (
          <div
            key={n.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col"
          >
            <h3 className="text-lg font-semibold text-slate-800 capitalize">{n.nome.toLowerCase()}</h3>
            <p className="mt-2 text-slate-600">
              Adesão: <strong>{formatBRL(n.valorAdesao)}</strong>
            </p>
            <p className="text-slate-600">
              Bônus indicador: <strong>{formatBRL(n.valorBonus)}</strong>
            </p>
            {n._count != null && (
              <p className="text-sm text-slate-500 mt-2">{n._count.usuarios} usuário(s) neste nível</p>
            )}
            <button
              type="button"
              onClick={() => openEditar(n)}
              className="mt-4 w-full py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
            >
              Editar valores
            </button>
          </div>
        ))}
      </div>

      <Modal
        open={!!modalEditar}
        onClose={() => setModalEditar(null)}
        title={modalEditar ? `Editar nível ${modalEditar.nome}` : ''}
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor adesão (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.valorAdesao}
              onChange={(e) => setForm((f) => ({ ...f, valorAdesao: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor bônus indicador (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.valorBonus}
              onChange={(e) => setForm((f) => ({ ...f, valorBonus: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setModalEditar(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={submitLoading} className="px-4 py-2 rounded-lg bg-teal-600 text-white disabled:opacity-50">
              {submitLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
