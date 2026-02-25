'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { User, Mail, Lock, Award } from 'lucide-react';
import { cadastroIndicacaoApi } from '@/lib/api';

const NIVEL_LABEL: Record<string, string> = {
  PRATA: 'Prata',
  BRONZE: 'Bronze',
};

function CadastroIndicacaoContent() {
  const searchParams = useSearchParams();
  const indicadorId = searchParams.get('indicador') ?? '';
  const nivelParam = (searchParams.get('nivel') ?? '').toUpperCase();

  const [linkOk, setLinkOk] = useState<{ indicadorNome: string; nivel: string } | null>(null);
  const [erroLink, setErroLink] = useState('');
  const [loadingLink, setLoadingLink] = useState(true);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const nivel = nivelParam === 'PRATA' || nivelParam === 'BRONZE' ? nivelParam : null;

  useEffect(() => {
    if (!indicadorId || !nivel) {
      setErroLink('Link inválido. Falta indicador ou nível (use PRATA ou BRONZE).');
      setLoadingLink(false);
      return;
    }
    cadastroIndicacaoApi
      .validarLink(indicadorId, nivel)
      .then((data) => {
        setLinkOk(data as { indicadorNome: string; nivel: string });
        setErroLink('');
      })
      .catch((err) => {
        setErroLink(err instanceof Error ? err.message : 'Link inválido ou expirado.');
      })
      .finally(() => setLoadingLink(false));
  }, [indicadorId, nivel]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErro('');
      if (form.senha !== form.confirmarSenha) {
        setErro('As senhas não coincidem.');
        return;
      }
      if (form.senha.length < 6) {
        setErro('A senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (!linkOk || !nivel) return;
      setSubmitLoading(true);
      try {
        await cadastroIndicacaoApi.cadastrar({
          indicadorId,
          nivel: nivel as 'PRATA' | 'BRONZE',
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          senha: form.senha,
        });
        setSucesso(true);
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao cadastrar.');
      } finally {
        setSubmitLoading(false);
      }
    },
    [form, indicadorId, nivel, linkOk],
  );

  if (loadingLink) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Validando link...</div>
      </main>
    );
  }

  if (erroLink || !linkOk) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-red-300 font-medium">{erroLink}</p>
          <Link href="/login" className="inline-block mt-6 text-teal-400 hover:text-teal-300 font-medium">
            Ir para o login
          </Link>
        </div>
      </main>
    );
  }

  if (sucesso) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Cadastro realizado!</h2>
          <p className="text-slate-300">Você já pode entrar com seu e-mail e senha.</p>
          <Link
            href="/login"
            className="inline-block mt-6 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium"
          >
            Ir para o login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Image src="/img/logo.jpeg" alt="CredFlow" width={80} height={80} className="rounded-xl object-cover mx-auto" />
          <h1 className="text-2xl font-bold text-white mt-4">Cadastro por indicação</h1>
          <p className="text-teal-300/90 mt-1">
            Você está sendo indicado por <strong className="text-white">{linkOk.indicadorNome}</strong> para o nível{' '}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-white">
              <Award className="w-4 h-4" />
              {NIVEL_LABEL[linkOk.nivel] ?? linkOk.nivel}
            </span>
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-slate-300 mb-1">Nome completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="nome"
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  placeholder="Seu nome"
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="senha" className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="senha"
                  type="password"
                  required
                  minLength={6}
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
            <div>
              <label htmlFor="confirmarSenha" className="block text-sm font-medium text-slate-300 mb-1">Confirmar senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="confirmarSenha"
                  type="password"
                  required
                  value={form.confirmarSenha}
                  onChange={(e) => setForm((f) => ({ ...f, confirmarSenha: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                  placeholder="Repita a senha"
                />
              </div>
            </div>
            {erro && <p className="text-red-400 text-sm">{erro}</p>}
            <button
              type="submit"
              disabled={submitLoading}
              className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold disabled:opacity-50"
            >
              {submitLoading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-4">
            Já tem conta? <Link href="/login" className="text-teal-400 hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function CadastroIndicacaoPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Carregando...</div>
      </main>
    }>
      <CadastroIndicacaoContent />
    </Suspense>
  );
}
