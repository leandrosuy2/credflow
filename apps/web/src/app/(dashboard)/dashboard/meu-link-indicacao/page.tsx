'use client';

import { useEffect, useState } from 'react';
import { Copy, Link2, Share2, Users, Award } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usuariosApi } from '@/lib/api';
import { toasts } from '@/lib/toast';

type Indicado = {
  id: string;
  nome: string;
  email: string;
  status: string;
  dataCriacao: string;
  nivel?: { nome: string };
};

export default function MeuLinkIndicacaoPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [indicados, setIndicados] = useState<{ total: number; lista: Indicado[] }>({ total: 0, lista: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.tipo !== 'vendedor') {
      router.replace('/dashboard');
      return;
    }
    usuariosApi
      .meusIndicados()
      .then((data) => setIndicados({ total: data.total, lista: (data.lista || []) as Indicado[] }))
      .catch(() => setIndicados({ total: 0, lista: [] }))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || !user) return <div className="py-12 text-center text-slate-500">Carregando…</div>;
  if (user.tipo !== 'vendedor') return null;

  const nivelNome = user.nivel?.nome;
  const linkPrata =
    typeof window !== 'undefined' && user.id
      ? `${window.location.origin}/cadastro/indicacao?indicador=${encodeURIComponent(user.id)}&nivel=PRATA`
      : '';
  const linkBronze =
    typeof window !== 'undefined' && user.id
      ? `${window.location.origin}/cadastro/indicacao?indicador=${encodeURIComponent(user.id)}&nivel=BRONZE`
      : '';

  const copiar = (url: string, label: string) => {
    navigator.clipboard.writeText(url).then(() => toasts.success(`Link ${label} copiado!`));
  };

  const compartilharWhatsApp = (url: string, nivelLabel: string) => {
    const text = `Cadastre-se como vendedor ${nivelLabel} pelo meu link: ${url}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, '_blank', 'noopener,noreferrer');
  };

  if (loading) return <div className="py-12 text-center text-slate-500">Carregando…</div>;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Link2 className="w-7 h-7 text-teal-600" />
        Meu Link de Indicação
      </h2>

      {nivelNome !== 'OURO' && nivelNome !== 'PRATA' ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800">
          <p className="font-medium">Você não possui link de indicação.</p>
          <p className="text-sm mt-1">
            Apenas níveis <strong>Prata</strong> e <strong>Ouro</strong> possuem links. Se for Bronze, um administrador pode promover seu nível.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <p className="text-slate-600 text-sm">
              O sistema identifica seu nível automaticamente. {nivelNome === 'OURO' ? 'Como Ouro, você pode indicar cadastros Prata e Bronze.' : 'Como Prata, você pode indicar cadastros Bronze.'}
            </p>

            {nivelNome === 'OURO' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-slate-500" />
                  Link para cadastro <strong>Prata</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    readOnly
                    value={linkPrata}
                    className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => copiar(linkPrata, 'Prata')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700"
                  >
                    <Copy className="w-4 h-4" /> Copiar
                  </button>
                  <button
                    type="button"
                    onClick={() => compartilharWhatsApp(linkPrata, 'Prata')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                  >
                    <Share2 className="w-4 h-4" /> WhatsApp
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                Link para cadastro <strong>Bronze</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  readOnly
                  value={linkBronze}
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => copiar(linkBronze, 'Bronze')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700"
                >
                  <Copy className="w-4 h-4" /> Copiar
                </button>
                <button
                  type="button"
                  onClick={() => compartilharWhatsApp(linkBronze, 'Bronze')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                >
                  <Share2 className="w-4 h-4" /> WhatsApp
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Cadastros realizados pelo meu link
            </h3>
            <p className="text-slate-600 text-sm mb-4">
              <strong>{indicados.total}</strong> {indicados.total === 1 ? 'pessoa cadastrada' : 'pessoas cadastradas'} através do seu link.
            </p>
            {indicados.lista.length === 0 ? (
              <p className="text-slate-500 text-sm">Nenhum cadastro ainda.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {indicados.lista.map((ind) => (
                  <li key={ind.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-slate-800">{ind.nome}</span>
                      <span className="text-slate-500 text-sm ml-2">{ind.email}</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                      {ind.nivel?.nome ?? '—'} · {ind.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
