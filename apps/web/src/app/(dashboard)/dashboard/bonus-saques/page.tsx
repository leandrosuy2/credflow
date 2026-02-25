'use client';

import { useEffect, useState } from 'react';
import { Copy, Link2, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { bonusApi, saquesApi } from '@/lib/api';
import { toasts } from '@/lib/toast';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

function isQuintaFeira() {
  return new Date().getDay() === 4;
}

export default function BonusSaquesPage() {
  const { user } = useAuth();
  const [resumo, setResumo] = useState<{ totalPendente: number; totalPago: number } | null>(null);
  const [saldoDisponivel, setSaldoDisponivel] = useState<number | null>(null);
  const [saques, setSaques] = useState<unknown[]>([]);
  const [valorSaque, setValorSaque] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    Promise.all([
      bonusApi.meuResumo().then((r) => setResumo(r as { totalPendente: number; totalPago: number })),
      saquesApi.saldoDisponivel().then((r) => setSaldoDisponivel((r as { saldoDisponivel: number }).saldoDisponivel)),
      saquesApi.meus().then((data) => setSaques((data as unknown[]) || [])),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(valorSaque.replace(',', '.'));
    if (isNaN(v) || v <= 0) {
      toasts.error('Informe um valor válido.');
      return;
    }
    if (!isQuintaFeira()) {
      toasts.error('Solicitação de saque só é permitida às quintas-feiras.');
      return;
    }
    setSubmitting(true);
    try {
      await saquesApi.solicitar(v);
      toasts.success('Solicitação de saque enviada. Aguarde aprovação do administrador.');
      setValorSaque('');
      load();
    } catch (err) {
      toasts.error(err instanceof Error ? err.message : 'Erro ao solicitar saque.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-500">Carregando...</div>;

  const quinta = isQuintaFeira();
  const saldo = saldoDisponivel ?? 0;

  const nivelNome = user?.nivel?.nome;
  const linkPrata = typeof window !== 'undefined' && user?.id
    ? `${window.location.origin}/cadastro/indicacao?indicador=${encodeURIComponent(user.id)}&nivel=PRATA`
    : '';
  const linkBronze = typeof window !== 'undefined' && user?.id
    ? `${window.location.origin}/cadastro/indicacao?indicador=${encodeURIComponent(user.id)}&nivel=BRONZE`
    : '';

  const copiar = (url: string, label: string) => {
    navigator.clipboard.writeText(url).then(() => toasts.success(`Link para cadastro ${label} copiado!`));
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-800">Bônus e Saques</h2>

      {/* Links de indicação: Ouro → Prata, Prata → Bronze */}
      {(nivelNome === 'OURO' || nivelNome === 'PRATA') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-teal-600" />
            Meus links de indicação
          </h3>
          <p className="text-slate-600 text-sm mb-4">
            Somente níveis Ouro e Prata possuem links de indicação. Envie o link abaixo para a pessoa se cadastrar; você será o indicador e receberá bônus quando ela pagar.
          </p>
          <div className="space-y-4">
            {nivelNome === 'OURO' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-slate-500" />
                  Link para cadastro <strong>Prata</strong>
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={linkPrata}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => copiar(linkPrata, 'Prata')}
                    className="px-4 py-2 rounded-lg bg-teal-600 text-white font-medium inline-flex items-center gap-2 hover:bg-teal-700"
                  >
                    <Copy className="w-4 h-4" /> Copiar
                  </button>
                </div>
              </div>
            )}
            {(nivelNome === 'PRATA' || nivelNome === 'OURO') && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  Link para cadastro <strong>Bronze</strong>
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={linkBronze}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => copiar(linkBronze, 'Bronze')}
                    className="px-4 py-2 rounded-lg bg-teal-600 text-white font-medium inline-flex items-center gap-2 hover:bg-teal-700"
                  >
                    <Copy className="w-4 h-4" /> Copiar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
          <p className="text-sm font-medium text-amber-800">Bônus pendentes</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{resumo ? formatBRL(resumo.totalPendente) : '—'}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
          <p className="text-sm font-medium text-emerald-800">Bônus já recebidos</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{resumo ? formatBRL(resumo.totalPago) : '—'}</p>
        </div>
        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-6">
          <p className="text-sm font-medium text-teal-800">Saldo disponível para saque</p>
          <p className="text-2xl font-bold text-teal-900 mt-1">{formatBRL(saldo)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Solicitar saque</h3>
        <p className="text-slate-600 text-sm mb-4">
          Saques só podem ser solicitados <strong>às quintas-feiras</strong>. O valor será analisado e pago pelo administrador.
        </p>
        {!quinta && (
          <p className="text-amber-700 bg-amber-50 rounded-lg px-4 py-2 text-sm mb-4">
            Hoje não é quinta-feira. Você poderá solicitar saque na próxima quinta.
          </p>
        )}
        <form onSubmit={handleSolicitar} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={valorSaque}
              onChange={(e) => setValorSaque(e.target.value)}
              className="w-40 px-3 py-2 border border-slate-300 rounded-lg"
              disabled={!quinta || saldo <= 0}
            />
          </div>
          <button
            type="submit"
            disabled={!quinta || saldo <= 0 || submitting}
            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Enviando...' : 'Solicitar saque'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <h3 className="text-lg font-semibold text-slate-800 p-4 border-b border-slate-100">Minhas solicitações de saque</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data solicitação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(saques as { id: string; valor: unknown; status: string; dataSolicitacao: string }[]).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{formatBRL(Number(s.valor))}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      s.status === 'PAGO' ? 'bg-emerald-100 text-emerald-700' :
                      s.status === 'CANCELADO' ? 'bg-slate-100 text-slate-600' :
                      s.status === 'APROVADO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3">{new Date(s.dataSolicitacao).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {saques.length === 0 && (
          <div className="py-12 text-center text-slate-500">Nenhuma solicitação de saque.</div>
        )}
      </div>
    </div>
  );
}
