'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usuariosApi } from '@/lib/api';

type No = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  nivel?: string;
  indicados: No[];
};

function TreeNode({ no, nivel = 0 }: { no: No; nivel?: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = no.indicados?.length > 0;
  const padding = 20 + nivel * 24;

  return (
    <div className="mb-1">
      <div
        style={{ paddingLeft: padding }}
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-50 border-l-2 border-slate-200"
      >
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-slate-500 hover:text-slate-700"
          >
            {open ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        <span className="font-medium text-slate-800">{no.nome}</span>
        <span className="text-slate-500 text-sm">({no.email})</span>
        {no.nivel && (
          <span className="ml-2 px-2 py-0.5 rounded bg-teal-100 text-teal-700 text-xs">{no.nivel}</span>
        )}
        <span className="text-slate-400 text-xs">{no.tipo}</span>
      </div>
      {open && hasChildren && (
        <div>
          {no.indicados.map((filho) => (
            <TreeNode key={filho.id} no={filho} nivel={nivel + 1} />
          ))}
        </div>
      )}
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Árvore de indicação</h2>
      <p className="text-slate-600">Quem indicou quem. Usuários sem indicador aparecem na raiz.</p>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        {arvore.length === 0 ? (
          <p className="text-slate-500">Nenhum usuário com indicação ou todos têm indicador (não há raízes).</p>
        ) : (
          arvore.map((no) => <TreeNode key={no.id} no={no} />)
        )}
      </div>
    </div>
  );
}
