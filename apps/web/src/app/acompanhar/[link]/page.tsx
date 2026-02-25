'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Check, CreditCard, FileText, Loader2 } from 'lucide-react';
import { clientesApi, pagamentosApi } from '@/lib/api';
import { toasts } from '@/lib/toast';

type Historico = { status: string; descricao: string; dataAtualizacao: string };
type Cliente = {
  nome: string;
  statusProcesso: string;
  valorServico: number | { toString(): string };
  linkAcompanhamento: string;
  historicoProcesso: Historico[];
  pagamentos: Array<{ valor: unknown; status: string; dataPagamento?: string | null }>;
};

const statusLabel: Record<string, string> = {
  CADASTRO_RECEBIDO: 'Cadastro recebido',
  EM_ANALISE: 'Em análise',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Pago',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

const ETAPAS_EXIBICAO: { key: string; label: string }[] = [
  { key: 'CADASTRO_RECEBIDO', label: 'Cadastro recebido' },
  { key: 'EM_ANALISE', label: 'Em análise' },
  { key: 'EM_ANDAMENTO', label: 'Em andamento' },
  { key: 'AGUARDANDO_PAGAMENTO', label: 'Aguardando pagamento' },
  { key: 'CONCLUIDO', label: 'Concluído' },
];

function etapaConcluida(statusAtual: string, etapaKey: string): boolean {
  const ordem: Record<string, number> = {
    CADASTRO_RECEBIDO: 1,
    EM_ANALISE: 2,
    EM_ANDAMENTO: 3,
    AGUARDANDO_PAGAMENTO: 4,
    PAGO: 5,
    CONCLUIDO: 6,
    CANCELADO: 0,
  };
  const idxAtual = ordem[statusAtual] ?? 0;
  const idxEtapa = ordem[etapaKey] ?? 0;
  if (statusAtual === 'CANCELADO') return etapaKey === 'CADASTRO_RECEBIDO' || etapaKey === 'EM_ANALISE' || etapaKey === 'EM_ANDAMENTO';
  return idxAtual >= idxEtapa;
}

export default function AcompanharPage() {
  const params = useParams();
  const link = params?.link as string;
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState(false);

  useEffect(() => {
    if (!link) return;
    clientesApi
      .byLink(link)
      .then((data) => setCliente(data as Cliente))
      .catch(() => setCliente(null))
      .finally(() => setLoading(false));
  }, [link]);

  async function iniciarPagamento() {
    if (!link || !cliente) return;
    setPagando(true);
    try {
      const res = (await pagamentosApi.criarPorLink(link, 'PIX')) as { id: string };
      toasts.success(
        'Solicitação de pagamento registrada. O administrador pode confirmar o pagamento. Em breve: PIX automático aqui.'
      );
      setCliente((c) => (c ? { ...c, statusProcesso: 'AGUARDANDO_PAGAMENTO' } : null));
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Erro ao gerar pagamento');
    } finally {
      setPagando(false);
    }
  }

  const formatBRL = (v: number | { toString(): string }) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      typeof v === 'number' ? v : Number(String(v))
    );

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          <span>Carregando...</span>
        </div>
      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="text-center max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h1 className="text-xl font-bold text-slate-800">Link inválido</h1>
          <p className="text-slate-600 mt-2">Este link de acompanhamento não existe ou expirou.</p>
        </div>
      </main>
    );
  }

  const jaPago =
    cliente.statusProcesso === 'PAGO' ||
    cliente.statusProcesso === 'CONCLUIDO' ||
    (cliente.pagamentos ?? []).some((p) => p.status === 'PAGO');
  const cancelado = cliente.statusProcesso === 'CANCELADO';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Cabeçalho – Portal do cliente */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-teal-600 px-6 py-6 flex items-center gap-4">
            <Image src="/img/logo.jpeg" alt="CredFlow" width={56} height={56} className="rounded-xl object-cover flex-shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-white">Acompanhe seu processo</h1>
            <p className="text-teal-100 mt-1">Olá, {cliente.nome}</p>
            <p className="text-teal-200/90 text-sm mt-0.5">
              Use esta página para ver o status do seu serviço e realizar o pagamento.
            </p>
            </div>
          </div>
        </div>

        {/* Status atual */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Status do processo</h2>
          <p
            className={`text-xl font-bold ${
              cancelado ? 'text-red-600' : jaPago ? 'text-emerald-600' : 'text-slate-800'
            }`}
          >
            {statusLabel[cliente.statusProcesso] ?? cliente.statusProcesso}
          </p>
        </div>

        {/* Etapas concluídas – linha do tempo visual */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Etapas do processo</h2>
          <ul className="space-y-0">
            {ETAPAS_EXIBICAO.map((etapa, i) => {
              const concluida =
                etapaConcluida(cliente.statusProcesso, etapa.key) ||
                (etapa.key === 'CONCLUIDO' && (jaPago || cliente.statusProcesso === 'PAGO'));
              return (
                <li key={etapa.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        concluida ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {concluida ? <Check className="w-4 h-4" /> : i + 1}
                    </span>
                    {i < ETAPAS_EXIBICAO.length - 1 && (
                      <span className={`w-0.5 flex-1 min-h-[20px] ${concluida ? 'bg-teal-300' : 'bg-slate-200'}`} />
                    )}
                  </div>
                  <div className="pb-5">
                    <p className={`font-medium ${concluida ? 'text-slate-800' : 'text-slate-400'}`}>{etapa.label}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Pagamento */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Pagamento
          </h2>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-slate-600">Valor do serviço:</span>
            <span className="text-2xl font-bold text-slate-900">{formatBRL(cliente.valorServico)}</span>
          </div>
          {cliente.pagamentos && cliente.pagamentos.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Pagamentos registrados:</p>
              <ul className="space-y-1 text-sm text-slate-700">
                {cliente.pagamentos.map((p, i) => (
                  <li key={i}>
                    {formatBRL(Number(p.valor))} — {p.status === 'PAGO' ? 'Confirmado' : p.status} —{' '}
                    {p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString('pt-BR') : '—'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!jaPago && !cancelado && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={iniciarPagamento}
                disabled={pagando}
                className="w-full py-3.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pagando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Gerando...
                  </>
                ) : (
                  <>Pagar com PIX</>
                )}
              </button>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Após o pagamento, nossa equipe confirma em até 24h. Você pode acompanhar o status aqui.
              </p>
            </div>
          )}
          {jaPago && (
            <p className="mt-3 text-emerald-600 font-medium flex items-center gap-2">
              <Check className="w-4 h-4" /> Pagamento confirmado
            </p>
          )}
        </div>

        {/* Histórico – linha do tempo */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Histórico
          </h2>
          {cliente.historicoProcesso?.length ? (
            <ul className="space-y-4">
              {cliente.historicoProcesso.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-teal-500" />
                  <div>
                    <p className="font-medium text-slate-800">{h.descricao}</p>
                    <p className="text-xs text-slate-500">{new Date(h.dataAtualizacao).toLocaleString('pt-BR')}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-sm">Nenhum registro no histórico ainda.</p>
          )}
        </div>
      </div>
    </main>
  );
}
