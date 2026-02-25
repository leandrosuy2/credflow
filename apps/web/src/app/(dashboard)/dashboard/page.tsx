'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { vendasApi, clientesApi } from '@/lib/api';
import { TrendingUp, DollarSign, Users, Loader2, Link2 } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [comissoes, setComissoes] = useState<{ totalVendido: number; comissaoReceber: number; quantidadeVendas: number } | null>(null);
  const [clientes, setClientes] = useState<unknown[]>([]);
  const [dashboardAdmin, setDashboardAdmin] = useState<{
    totalVendido: number;
    totalVendas: number;
    pagamentosRecebidos: number;
    processosEmAndamento: number;
    rankingVendedores: Array<{ nome: string; totalVendido: number; quantidade: number }>;
    taxaConversao: number;
    clientesTotal: number;
  } | null>(null);
  const [configComissoes, setConfigComissoes] = useState<{ comissaoVendedor: number; comissaoPreposto: number } | null>(null);

  useEffect(() => {
    if (user?.tipo === 'admin') {
      vendasApi.dashboardAdmin().then(setDashboardAdmin).catch(() => setDashboardAdmin(null));
      vendasApi.configComissoes().then(setConfigComissoes).catch(() => setConfigComissoes(null));
    } else {
      vendasApi.comissoes().then(setComissoes).catch(() => setComissoes(null));
      clientesApi.list().then(setClientes).catch(() => setClientes([]));
    }
  }, [user?.tipo]);

  const formatBRL = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);

  if (user?.tipo === 'admin' && dashboardAdmin) {
    const rankingData = dashboardAdmin.rankingVendedores.slice(0, 10).map((r) => ({
      nome: r.nome.length > 15 ? r.nome.slice(0, 15) + '…' : r.nome,
      total: r.totalVendido,
      vendas: r.quantidade,
    }));
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-slate-800">Visão geral</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-teal-100 text-teal-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total vendido</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{formatBRL(dashboardAdmin.totalVendido)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Vendas realizadas</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{dashboardAdmin.totalVendas}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pagamentos recebidos</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{formatBRL(dashboardAdmin.pagamentosRecebidos ?? 0)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Processos em andamento</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{dashboardAdmin.processosEmAndamento}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-violet-100 text-violet-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Taxa de conversão</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{dashboardAdmin.taxaConversao}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Ranking de vendedores (top 10)</h3>
            {rankingData.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhum dado ainda.</p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankingData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tickFormatter={(v) => formatBRL(v)} stroke="#64748b" fontSize={12} />
                    <YAxis type="category" dataKey="nome" width={90} stroke="#64748b" fontSize={11} />
                    <Tooltip formatter={(v: number) => [formatBRL(v), 'Total']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="total" fill="#0d9488" radius={[0, 4, 4, 0]} name="Total vendido" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Indicadores</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Total de clientes</span>
                <span className="font-semibold text-slate-800">{dashboardAdmin.clientesTotal}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Vendas realizadas</span>
                <span className="font-semibold text-slate-800">{dashboardAdmin.totalVendas}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-600">Taxa de conversão</span>
                <span className="font-semibold text-teal-600">{dashboardAdmin.taxaConversao}%</span>
              </div>
              {configComissoes && (
                <div className="pt-2 mt-2 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Comissões (atual)</p>
                  <p className="text-sm text-slate-700">Vendedor: <strong>{configComissoes.comissaoVendedor}%</strong> · Preposto: <strong>{configComissoes.comissaoPreposto}%</strong></p>
                  <a href="/dashboard/admin/comissoes" className="text-xs text-teal-600 hover:underline mt-0.5 inline-block">Alterar em Comissões →</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  type ClienteStatus = { statusProcesso?: string };
  const andamento = Array.isArray(clientes)
    ? (clientes as ClienteStatus[]).filter((c) =>
        ['CADASTRO_RECEBIDO', 'EM_ANALISE', 'EM_ANDAMENTO'].includes(c.statusProcesso ?? '')
      ).length
    : 0;
  const pendentes = Array.isArray(clientes)
    ? (clientes as ClienteStatus[]).filter((c) => c.statusProcesso === 'AGUARDANDO_PAGAMENTO').length
    : 0;
  const pagos = Array.isArray(clientes)
    ? (clientes as ClienteStatus[]).filter((c) => c.statusProcesso === 'PAGO' || c.statusProcesso === 'CONCLUIDO').length
    : 0;

  const pieData = [
    { name: 'Em andamento', value: andamento, color: '#0d9488' },
    { name: 'Pendentes', value: pendentes, color: '#d97706' },
    { name: 'Pagos', value: pagos, color: '#059669' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-800">Seu painel</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-teal-100 text-teal-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total vendido</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{comissoes ? formatBRL(comissoes.totalVendido) : '—'}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Comissões a receber</p>
            <p className="text-2xl font-bold text-teal-600 mt-0.5">{comissoes ? formatBRL(comissoes.comissaoReceber) : '—'}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-teal-100 text-teal-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Clientes em andamento</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{andamento}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600">
            <Loader2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Clientes pendentes</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{pendentes}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Clientes pagos</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{pagos}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Clientes por status</h3>
          {pieData.length === 0 ? (
            <p className="text-slate-500 text-sm py-8">Nenhum cliente cadastrado ainda.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Clientes']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <p className="text-slate-600">
            Você tem <strong>{Array.isArray(clientes) ? clientes.length : 0}</strong> clientes cadastrados.
          </p>
          <a href="/dashboard/clientes" className="inline-block px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium transition">
            Ver clientes
          </a>
          {(user?.nivel?.nome === 'OURO' || user?.nivel?.nome === 'PRATA') && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-slate-600 text-sm mb-2">
                <strong>Links de indicação:</strong> Ouro indica Prata, Prata indica Bronze. Envie o link para a pessoa se cadastrar.
              </p>
              <Link
                href="/dashboard/bonus-saques"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
              >
                <Link2 className="w-4 h-4" /> Copiar meus links
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
