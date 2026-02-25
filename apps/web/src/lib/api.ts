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

/** Cadastro por link de indicação (público, sem token). */
export const cadastroIndicacaoApi = {
  validarLink: (indicadorId: string, nivel: string) =>
    api<{ indicadorNome: string; nivel: string }>(
      `/cadastro-indicacao/link?indicador=${encodeURIComponent(indicadorId)}&nivel=${encodeURIComponent(nivel)}`,
      { token: null }
    ),
  cadastrar: (body: { indicadorId: string; nivel: 'PRATA' | 'BRONZE'; nome: string; email: string; senha: string }) =>
    api<unknown>('/cadastro-indicacao', {
      method: 'POST',
      body: JSON.stringify(body),
      token: null,
    }),
};

export const usuariosApi = {
  list: () => api<unknown[]>('/usuarios'),
  get: (id: string) => api<unknown>(`/usuarios/${id}`),
  vendedores: () => api<unknown[]>('/usuarios/vendedores'),
  prepostos: () => api<unknown[]>('/usuarios/prepostos'),
  me: () => api<unknown>('/usuarios/me'),
  create: (body: { nome: string; email: string; senha: string; tipo: string; vendedorPaiId?: string; indicadorId?: string; nivelId?: string }) =>
    api<unknown>('/usuarios', { method: 'POST', body: JSON.stringify(body) }),
  createPreposto: (body: { nome: string; email: string; senha: string }) =>
    api<unknown>('/usuarios/preposto', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { nome?: string; email?: string; senha?: string; status?: string; indicadorId?: string | null; nivelId?: string | null }) =>
    api<unknown>(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) => api<unknown>(`/usuarios/${id}`, { method: 'DELETE' }),
  arvoreIndicacao: () => api<unknown[]>('/usuarios/arvore-indicacao'),
};

export const clientesApi = {
  list: (params?: { dataInicio?: string; dataFim?: string; statusProcesso?: string }) => {
    const q = new URLSearchParams();
    if (params?.dataInicio) q.set('dataInicio', params.dataInicio);
    if (params?.dataFim) q.set('dataFim', params.dataFim);
    if (params?.statusProcesso) q.set('statusProcesso', params.statusProcesso);
    return api<unknown[]>(`/clientes?${q.toString()}`);
  },
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
  list: (params?: { dataInicio?: string; dataFim?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.dataInicio) q.set('dataInicio', params.dataInicio);
    if (params?.dataFim) q.set('dataFim', params.dataFim);
    if (params?.status) q.set('status', params.status);
    return api<unknown[]>(`/pagamentos?${q.toString()}`);
  },
  confirmar: (pagamentoId: string) =>
    api<unknown>('/pagamentos/confirmar', { method: 'POST', body: JSON.stringify({ pagamentoId }) }),
  criarPorLink: (link: string, formaPagamento?: string) =>
    api<{ id: string; valor: unknown }>('/pagamentos/public/criar', {
      method: 'POST',
      body: JSON.stringify({ link, formaPagamento: formaPagamento || 'PIX' }),
      token: null,
    }),
};

export const niveisApi = {
  list: () => api<unknown[]>('/niveis'),
  get: (id: string) => api<unknown>(`/niveis/${id}`),
  update: (id: string, body: { valorAdesao?: number; valorBonus?: number; ordem?: number }) =>
    api<unknown>(`/niveis/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};

export const bonusApi = {
  adminTodos: (params?: { status?: string; beneficiarioId?: string; dataInicio?: string; dataFim?: string; nivelId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.beneficiarioId) q.set('beneficiarioId', params.beneficiarioId);
    if (params?.dataInicio) q.set('dataInicio', params.dataInicio);
    if (params?.dataFim) q.set('dataFim', params.dataFim);
    if (params?.nivelId) q.set('nivelId', params.nivelId);
    return api<unknown[]>(`/bonus/admin/todos?${q.toString()}`);
  },
  adminResumo: () => api<{ totalPendente: number; quantidadePendente: number; totalPago: number; quantidadePago: number }>('/bonus/admin/resumo'),
  meus: () => api<unknown[]>('/bonus/meus'),
  meuResumo: () => api<{ totalPendente: number; quantidadePendente: number; totalPago: number; quantidadePago: number }>('/bonus/meu-resumo'),
};

export const saquesApi = {
  solicitar: (valor: number) => api<unknown>('/saques/solicitar', { method: 'POST', body: JSON.stringify({ valor }) }),
  saldoDisponivel: () => api<{ saldoDisponivel: number }>('/saques/saldo-disponivel'),
  meus: () => api<unknown[]>('/saques/meus'),
  adminTodos: (params?: { status?: string; usuarioId?: string; dataInicio?: string; dataFim?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.usuarioId) q.set('usuarioId', params.usuarioId);
    if (params?.dataInicio) q.set('dataInicio', params.dataInicio);
    if (params?.dataFim) q.set('dataFim', params.dataFim);
    return api<unknown[]>(`/saques/admin/todos?${q.toString()}`);
  },
  adminAprovar: (id: string) => api<unknown>(`/saques/admin/${id}/aprovar`, { method: 'POST' }),
  adminRecusar: (id: string, motivoRecusa: string) =>
    api<unknown>(`/saques/admin/${id}/recusar`, { method: 'POST', body: JSON.stringify({ motivoRecusa }) }),
  adminMarcarPago: (id: string) => api<unknown>(`/saques/admin/${id}/marcar-pago`, { method: 'POST' }),
};

export const pagamentosUsuarioApi = {
  criar: (body: { usuarioId: string; nivelId: string; valor: number; formaPagamento?: string }) =>
    api<unknown>('/pagamentos-usuario', { method: 'POST', body: JSON.stringify(body) }),
  confirmar: (id: string) => api<unknown>(`/pagamentos-usuario/${id}/confirmar`, { method: 'POST' }),
  adminTodos: (params?: { status?: string; usuarioId?: string; nivelId?: string; dataInicio?: string; dataFim?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.usuarioId) q.set('usuarioId', params.usuarioId);
    if (params?.nivelId) q.set('nivelId', params.nivelId);
    if (params?.dataInicio) q.set('dataInicio', params.dataInicio);
    if (params?.dataFim) q.set('dataFim', params.dataFim);
    return api<unknown[]>(`/pagamentos-usuario/admin/todos?${q.toString()}`);
  },
  meus: () => api<unknown[]>('/pagamentos-usuario/meus'),
};

export const auditApi = {
  listar: (params?: { entidade?: string; usuarioAdminId?: string; dataInicio?: string; dataFim?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.entidade) q.set('entidade', params.entidade);
    if (params?.usuarioAdminId) q.set('usuarioAdminId', params.usuarioAdminId);
    if (params?.dataInicio) q.set('dataInicio', params.dataInicio);
    if (params?.dataFim) q.set('dataFim', params.dataFim);
    if (params?.limit) q.set('limit', String(params.limit));
    return api<unknown[]>(`/audit?${q.toString()}`);
  },
};
