const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('credflow_token');
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token = getToken(), ...init } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Erro na requisição');
  }
  return res.json();
}

export const authApi = {
  login: (email: string, senha: string) =>
    api<{ token: string; usuario: import('@credflow/shared').UsuarioLogado }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
      token: null,
    }),
};

export const usuariosApi = {
  list: () => api<unknown[]>('/usuarios'),
  get: (id: string) => api<unknown>(`/usuarios/${id}`),
  vendedores: () => api<unknown[]>('/usuarios/vendedores'),
  prepostos: () => api<unknown[]>('/usuarios/prepostos'),
  me: () => api<unknown>('/usuarios/me'),
  create: (body: { nome: string; email: string; senha: string; tipo: string; vendedorPaiId?: string }) =>
    api<unknown>('/usuarios', { method: 'POST', body: JSON.stringify(body) }),
  createPreposto: (body: { nome: string; email: string; senha: string }) =>
    api<unknown>('/usuarios/preposto', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { nome?: string; email?: string; senha?: string; status?: string }) =>
    api<unknown>(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) => api<unknown>(`/usuarios/${id}`, { method: 'DELETE' }),
};

export const clientesApi = {
  list: () => api<unknown[]>('/clientes'),
  one: (id: string) => api<unknown>(`/clientes/${id}`),
  create: (body: { nome: string; cpfCnpj: string; telefone: string; email: string; valorServico: number }) =>
    api<unknown>('/clientes', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Record<string, unknown>) =>
    api<unknown>(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateStatus: (id: string, body: { status: string; descricao?: string }) =>
    api<unknown>(`/clientes/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) => api<unknown>(`/clientes/${id}`, { method: 'DELETE' }),
  byLink: (link: string) => api<unknown>(`/clientes/acompanhar/${link}`),
};

export const vendasApi = {
  comissoes: () => api<{ totalVendido: number; comissaoReceber: number; quantidadeVendas: number }>('/vendas/comissoes'),
  configComissoes: () => api<{ comissaoVendedor: number; comissaoPreposto: number }>('/vendas/config-comissoes'),
  updateConfigComissoes: (comissaoVendedor: number, comissaoPreposto: number) =>
    api<{ comissaoVendedor: number; comissaoPreposto: number }>('/vendas/config-comissoes', {
      method: 'PUT',
      body: JSON.stringify({ comissaoVendedor, comissaoPreposto }),
    }),
  dashboardAdmin: () => api<{
    totalVendido: number;
    totalVendas: number;
    pagamentosRecebidos: number;
    processosEmAndamento: number;
    rankingVendedores: Array<{ nome: string; totalVendido: number; quantidade: number }>;
    taxaConversao: number;
    clientesTotal: number;
  }>('/vendas/dashboard-admin'),
};

export const pagamentosApi = {
  list: () => api<unknown[]>('/pagamentos'),
  confirmar: (pagamentoId: string) =>
    api<unknown>('/pagamentos/confirmar', { method: 'POST', body: JSON.stringify({ pagamentoId }) }),
  criarPorLink: (link: string, formaPagamento?: string) =>
    api<{ id: string; valor: unknown }>('/pagamentos/public/criar', {
      method: 'POST',
      body: JSON.stringify({ link, formaPagamento: formaPagamento || 'PIX' }),
      token: null,
    }),
};
