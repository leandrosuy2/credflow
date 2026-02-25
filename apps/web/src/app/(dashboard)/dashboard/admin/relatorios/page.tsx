'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FileText, Users, DollarSign, Gift, Wallet, TreePine, History, Download } from 'lucide-react';

const cards = [
  { href: '/dashboard/clientes', title: 'Clientes cadastrados', desc: 'Lista de todos os clientes. Filtros por data de cadastro e status.', icon: Users },
  { href: '/dashboard/admin/pagamentos', title: 'Histórico de pagamentos', desc: 'Pagamentos (cliente). Filtros por data e status. Exportar CSV/Excel.', icon: DollarSign },
  { href: '/dashboard/admin/pagamentos-usuario', title: 'Pagamentos de adesão', desc: 'Pagamentos de usuário por nível. Filtros por data, nível, usuário, status. Exportar CSV/Excel.', icon: FileText },
  { href: '/dashboard/admin/bonus', title: 'Bônus gerados', desc: 'Histórico de bônus. Filtros por data, status, nível, beneficiário. Exportar CSV/Excel.', icon: Gift },
  { href: '/dashboard/admin/saques', title: 'Solicitações de saque', desc: 'Status de cada solicitação. Filtros por data, status, usuário. Exportar CSV/Excel.', icon: Wallet },
  { href: '/dashboard/admin/arvore-indicacao', title: 'Quem indicou quem', desc: 'Árvore/hierarquia de indicação.', icon: TreePine },
  { href: '/dashboard/admin/auditoria', title: 'Auditoria', desc: 'Histórico de alterações e ações. Filtros por entidade e data.', icon: History },
];

export default function AdminRelatoriosPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.tipo !== 'admin') router.replace('/dashboard');
  }, [user?.tipo, router]);

  if (user?.tipo !== 'admin') return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Relatórios completos</h2>
        <p className="text-slate-600 mt-1">Acesso a todos os relatórios com filtros por data, usuário, nível e status. Exporte em CSV/Excel em cada tela.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-teal-300 hover:shadow-md transition"
          >
            <div className="p-3 rounded-xl bg-teal-100 text-teal-600 shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                {title}
                {(href.includes('pagamentos') || href.includes('bonus') || href.includes('saques')) && (
                  <Download className="w-4 h-4 text-slate-400" />
                )}
              </h3>
              <p className="text-sm text-slate-600 mt-1">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
