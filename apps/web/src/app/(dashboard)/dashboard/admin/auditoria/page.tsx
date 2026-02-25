'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { auditApi } from '@/lib/api';

type Log = {
  id: string;
  entidade: string;
  entidadeId: string;
  campo?: string | null;
  valorAnterior?: string | null;
  valorNovo?: string | null;
  acao: string;
  data: string;
  detalhes?: string | null;
  usuarioAdmin?: { nome: string; email: string } | null;
};

const formatDate = (s: string) => new Date(s).toLocaleString('pt-BR');

export default function AdminAuditoriaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [lista, setLista] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [entidade, setEntidade] = useState('');

  useEffect(() => {
    if (user?.tipo !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    auditApi
      .listar({ entidade: entidade || undefined, limit: 300 })
      .then((data) => setLista((data as Log[]) || []))
      .finally(() => setLoading(false));
  }, [user?.tipo, router, entidade]);

  if (user?.tipo !== 'admin') return null;
  if (loading && !lista.length) return <div className="py-12 text-center text-slate-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Auditoria</h2>
      <p className="text-slate-600">Histórico de alterações e ações do administrador. Nenhum valor é alterado sem registro.</p>

      <div className="flex gap-2 items-center">
        <label className="text-sm text-slate-600">Entidade:</label>
        <select
          value={entidade}
          onChange={(e) => setEntidade(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="">Todas</option>
          <option value="Usuario">Usuario</option>
          <option value="Nivel">Nivel</option>
          <option value="Saque">Saque</option>
          <option value="PagamentoUsuario">PagamentoUsuario</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Detalhes</th>
                <th className="px-4 py-3">Valor anterior / novo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lista.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(l.data)}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{l.acao}</span>
                  </td>
                  <td className="px-4 py-3">{l.entidade} ({l.entidadeId.slice(0, 8)}…)</td>
                  <td className="px-4 py-3">{l.usuarioAdmin?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={l.detalhes ?? ''}>{l.detalhes ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-md">
                    {l.valorAnterior && <span className="block">Ant: {l.valorAnterior.slice(0, 80)}{l.valorAnterior.length > 80 ? '…' : ''}</span>}
                    {l.valorNovo && <span className="block">Novo: {l.valorNovo.slice(0, 80)}{l.valorNovo.length > 80 ? '…' : ''}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && (
          <div className="py-12 text-center text-slate-500">Nenhum registro de auditoria.</div>
        )}
      </div>
    </div>
  );
}
