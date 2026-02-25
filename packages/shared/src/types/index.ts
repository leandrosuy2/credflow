export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type PaginatedResponse<T> = ApiResponse<T> & {
  total: number;
  page: number;
  pageSize: number;
};

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export type TipoUsuario = 'admin' | 'vendedor' | 'preposto';

export type StatusProcesso =
  | 'CADASTRO_RECEBIDO'
  | 'EM_ANALISE'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_PAGAMENTO'
  | 'PAGO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  vendedorPaiId?: string | null;
}
