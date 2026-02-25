'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const navVendedor = [
  { href: '/dashboard', label: 'Início' },
  { href: '/dashboard/clientes', label: 'Clientes' },
  { href: '/dashboard/prepostos', label: 'Prepostos' },
];

const navPreposto = [
  { href: '/dashboard', label: 'Início' },
  { href: '/dashboard/clientes', label: 'Clientes' },
];

const navAdmin = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/clientes', label: 'Clientes' },
  { href: '/dashboard/admin/vendedores', label: 'Vendedores' },
  { href: '/dashboard/admin/pagamentos', label: 'Pagamentos' },
  { href: '/dashboard/admin/comissoes', label: 'Comissões' },
];

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-500">Carregando...</div>
      </div>
    );
  }

  const nav = user.tipo === 'admin' ? navAdmin : user.tipo === 'preposto' ? navPreposto : navVendedor;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 transform transition-transform duration-200 ease-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-white/10">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image src="/img/logo.jpeg" alt="CredFlow" width={40} height={40} className="rounded-lg object-cover flex-shrink-0" />
              <span className="text-xl font-bold text-white">CredFlow</span>
            </Link>
            <p className="text-xs text-slate-400 mt-0.5">
              {user.tipo === 'admin' ? 'Administrador' : user.tipo === 'preposto' ? 'Preposto' : 'Vendedor'}
            </p>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition ${
                    active
                      ? 'bg-teal-500/20 text-teal-300'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-white/10">
            <p className="text-xs text-slate-500 truncate px-2" title={user.email}>
              {user.email}
            </p>
            <button
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="mt-2 w-full text-left px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white transition"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-4 h-14 px-4 bg-white/80 backdrop-blur border-b border-slate-200 md:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-800 truncate">
            {pathname === '/dashboard' ? 'Início' : pathname.split('/').pop()?.replace(/-/g, ' ') ?? 'Dashboard'}
          </h1>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
