import { Injectable, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { TipoUsuario, Usuario } from '@credflow/database';

const SALT_ROUNDS = 10;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(data: {
    nome: string;
    email: string;
    senha: string;
    tipo: TipoUsuario;
    vendedorPaiId?: string;
    indicadorId?: string;
    nivelId?: string;
  }) {
    const senhaHash = await bcrypt.hash(data.senha, SALT_ROUNDS);
    return this.prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email.toLowerCase(),
        senhaHash,
        tipo: data.tipo,
        vendedorPaiId: data.vendedorPaiId || null,
        indicadorId: data.indicadorId || null,
        nivelId: data.nivelId || null,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        vendedorPaiId: true,
        indicadorId: true,
        nivelId: true,
        status: true,
        dataCriacao: true,
      },
    });
  }

  async findAll(adminOnly = false) {
    return this.prisma.usuario.findMany({
      where: adminOnly ? { tipo: 'admin' } : {},
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        vendedorPaiId: true,
        indicadorId: true,
        nivelId: true,
        status: true,
        dataCriacao: true,
        indicador: { select: { id: true, nome: true, email: true } },
        nivel: { select: { id: true, nome: true } },
        _count: { select: { clientes: true, vendas: true, indicados: true } },
      },
      orderBy: { dataCriacao: 'desc' },
    });
  }

  async findVendedores() {
    return this.prisma.usuario.findMany({
      where: { tipo: { in: ['vendedor', 'preposto'] }, status: 'ATIVO' },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        vendedorPaiId: true,
        _count: { select: { clientes: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.usuario.findUniqueOrThrow({
      where: { id },
      include: {
        prepostos: true,
        indicador: { select: { id: true, nome: true, email: true } },
        indicados: { select: { id: true, nome: true, email: true, nivel: { select: { nome: true } } } },
        nivel: true,
        _count: { select: { clientes: true, vendas: true, indicados: true } },
      },
    });
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) throw new ForbiddenException('Não é possível excluir seu próprio usuário');
    await this.prisma.usuario.delete({ where: { id } });
    return { success: true };
  }

  async update(
    id: string,
    data: Partial<{ nome: string; email: string; senha: string; status: string; indicadorId?: string; nivelId?: string }>,
    adminId?: string,
  ) {
    const anterior = await this.prisma.usuario.findUnique({
      where: { id },
      select: { nome: true, email: true, status: true, indicadorId: true, nivelId: true },
    });
    const update: Record<string, unknown> = {};
    if (data.nome != null) update.nome = data.nome;
    if (data.email != null) update.email = data.email.toLowerCase();
    if (data.status != null) update.status = data.status;
    if (data.indicadorId !== undefined) update.indicadorId = data.indicadorId || null;
    if (data.nivelId !== undefined) update.nivelId = data.nivelId || null;
    if (data.senha != null) update.senhaHash = await bcrypt.hash(data.senha, SALT_ROUNDS);

    const atualizado = await this.prisma.usuario.update({
      where: { id },
      data: update as never,
      select: { id: true, nome: true, email: true, tipo: true, status: true, indicadorId: true, nivelId: true },
    });

    if (adminId && anterior && (data.status != null || data.nivelId !== undefined)) {
      await this.audit.log({
        entidade: 'Usuario',
        entidadeId: id,
        acao: 'UPDATE',
        usuarioAdminId: adminId,
        valorAnterior: JSON.stringify(anterior),
        valorNovo: JSON.stringify(atualizado),
        detalhes: data.status != null ? `Status alterado para ${data.status}` : 'Dados alterados',
      });
    }

    return atualizado;
  }

  /** Prepostos do vendedor logado (só vendedor pode ter prepostos). */
  async findPrepostosByVendedor(vendedorId: string) {
    return this.prisma.usuario.findMany({
      where: { vendedorPaiId: vendedorId, tipo: 'preposto' },
      select: {
        id: true,
        nome: true,
        email: true,
        status: true,
        dataCriacao: true,
        _count: { select: { clientes: true } },
      },
      orderBy: { dataCriacao: 'desc' },
    });
  }

  /** Vendedor cria um preposto (vendedorPaiId = ele mesmo). */
  async createPrepostoByVendedor(vendedorId: string, data: { nome: string; email: string; senha: string }) {
    return this.create({
      ...data,
      tipo: 'preposto',
      vendedorPaiId: vendedorId,
    });
  }

  /** Árvore de indicação (quem indicou quem) - para admin. */
  async arvoreIndicacao(): Promise<Array<{ id: string; nome: string; email: string; tipo: string; nivel?: string; indicados: unknown[] }>> {
    const raizes = await this.prisma.usuario.findMany({
      where: { indicadorId: null, tipo: { not: 'admin' } },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        nivel: { select: { nome: true } },
      },
      orderBy: { dataCriacao: 'asc' },
    });
    const build = async (userId: string): Promise<unknown[]> => {
      const filhos = await this.prisma.usuario.findMany({
        where: { indicadorId: userId },
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          nivel: { select: { nome: true } },
        },
        orderBy: { dataCriacao: 'asc' },
      });
      return Promise.all(
        filhos.map(async (f) => ({
          ...f,
          nivel: f.nivel?.nome,
          indicados: await build(f.id),
        })),
      );
    };
    return Promise.all(
      raizes.map(async (r) => ({
        id: r.id,
        nome: r.nome,
        email: r.email,
        tipo: r.tipo,
        nivel: r.nivel?.nome,
        indicados: await build(r.id),
      })),
    );
  }

  /** IDs de vendedores que este usuário pode ver (ele mesmo ou seus prepostos). */
  async vendedorIdsPermitidos(user: Usuario): Promise<string[]> {
    if (user.tipo === 'admin') {
      const all = await this.prisma.usuario.findMany({
        where: { tipo: { in: ['vendedor', 'preposto'] } },
        select: { id: true },
      });
      return all.map((u) => u.id);
    }
    if (user.tipo === 'preposto' && user.vendedorPaiId) return [user.vendedorPaiId, user.id];
    if (user.tipo === 'preposto') return [user.id];
    // vendedor: ele + prepostos
    const ids = await this.prisma.usuario.findMany({
      where: { OR: [{ id: user.id }, { vendedorPaiId: user.id }] },
      select: { id: true },
    });
    return ids.map((u) => u.id);
  }
}
