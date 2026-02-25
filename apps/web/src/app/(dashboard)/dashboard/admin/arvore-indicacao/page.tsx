'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usuariosApi } from '@/lib/api';
import { User, Users, ChevronDown, ChevronRight, Mail, Award } from 'lucide-react';

type No = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  nivel?: string;
  indicados: No[];
};

const nivelCores: Record<string, string> = {
  BRONZE: 'bg-amber-100 text-amber-800 border-amber-200',
  PRATA: 'bg-slate-100 text-slate-700 border-slate-300',
  OURO: 'bg-amber-200/80 text-amber-900 border-amber-400',
};

function TreeNode({ no, nivel = 0 }: { no: No; nivel?: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = no.indicados?.length > 0;
  const nivelClass = (no.nivel && nivelCores[no.nivel]) || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="flex" style={{ marginLeft: nivel * 24 }}>
      <div className="flex-1 min-w-0 border-l-2 border-slate-200 pl-4 ml-2">
        <div
          className="flex items-center gap-3 py-2.5 px-4 rounded-xl border bg-white hover:bg-slate-50/80 hover:border-teal-200 transition-all shadow-sm"
        >
          <button
            type="button"
            onClick={() => hasChildren && setOpen((o) => !o)}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={open ? 'Recolher' : 'Expandir'}
          >
            {hasChildren ? (
              open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-300" />
            )}
          </button>
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800">{no.nome}</span>
              {no.nivel && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${nivelClass}`}>
                  <Award className="w-3.5 h-3.5" />
                  {no.nivel}
                </span>
              )}
              <span className="text-xs text-slate-400 uppercase tracking-wide">{no.tipo}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-slate-500">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{no.email}</span>
            </div>
          </div>
          {hasChildren && (
            <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">
              <Users className="w-4 h-4" />
              {no.indicados.length} indicado{no.indicados.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {open && hasChildren && (
          <div className="mt-2 space-y-2">
            {no.indicados.map((filho) => (
              <TreeNode key={filho.id} no={filho} nivel={nivel + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminArvoreIndicacaoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [arvore, setArvore] = useState<No[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.tipo !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    usuariosApi.arvoreIndicacao().then((data) => setArvore((data as No[]) || [])).finally(() => setLoading(false));
  }, [user?.tipo, router]);

  if (user?.tipo !== 'admin') return null;
  if (loading) return <div className="py-12 text-center text-slate-500">Carregando...</div>;

  const totalNos = (nos: No[]): number =>
    nos.reduce((acc, n) => acc + 1 + totalNos(n.indicados || []), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Árvore de indicação</h2>
          <p className="text-slate-600 mt-1">
            Quem indicou quem. Usuários na raiz não têm indicador; os demais foram indicados por alguém.
          </p>
        </div>
        {arvore.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 border border-teal-100">
            <Users className="w-5 h-5 text-teal-600" />
            <span className="text-sm font-medium text-teal-800">
              {arvore.length} raíz(es) · {totalNos(arvore)} pessoa(s) na rede
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {arvore.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhuma raiz na árvore</p>
            <p className="text-slate-400 text-sm mt-1">
              Todos os usuários têm indicador ou não há vendedores/prepostos. Atribua indicador em Vendedores para montar a rede.
            </p>
          </div>
        ) : (
          arvore.map((no) => <TreeNode key={no.id} no={no} nivel={0} />)
        )}
      </div>
    </div>
  );
}
