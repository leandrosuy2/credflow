'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Redireciona para a lista de clientes e abre o modal de novo cliente. */
export default function NovoClienteRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/clientes?openModal=novo');
  }, [router]);
  return (
    <div className="flex items-center justify-center py-12 text-slate-500">
      Redirecionando...
    </div>
  );
}
