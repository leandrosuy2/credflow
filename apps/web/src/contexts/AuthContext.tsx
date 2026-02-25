'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { UsuarioLogado } from '@credflow/shared';
import { authApi, usuariosApi } from '@/lib/api';

type AuthState = {
  user: UsuarioLogado | null;
  token: string | null;
  loading: boolean;
};

const defaultState: AuthState = { user: null, token: null, loading: true };

const AuthContext = createContext<AuthState & {
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}>(null as never);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState);

  const refreshUser = useCallback(async () => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('credflow_token') : null;
    if (!t) {
      setState({ user: null, token: null, loading: false });
      return;
    }
    try {
      const user = await usuariosApi.me() as UsuarioLogado;
      setState({ user, token: t, loading: false });
    } catch {
      localStorage.removeItem('credflow_token');
      setState({ user: null, token: null, loading: false });
    }
  }, []);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('credflow_token') : null;
    if (!t) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    usuariosApi.me()
      .then((user) => setState({ user: user as UsuarioLogado, token: t, loading: false }))
      .catch(() => {
        localStorage.removeItem('credflow_token');
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const res = await authApi.login(email, senha);
    localStorage.setItem('credflow_token', res.token);
    setState({ user: res.usuario, token: res.token, loading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('credflow_token');
    setState({ user: null, token: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
