import { Injectable, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma.service';
import { BonusService } from '../bonus/bonus.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PagamentosUsuarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bonus: BonusService,
    private readonly audit: AuditService,
  ) {}

  async criar(data: {
    usuarioId: string;
    nivelId: string;
    valor: number;
    formaPagamento?: string;
    gatewayId?: string;
  }) {
    const nivel = await this.prisma.nivel.findUniqueOrThrow({ where: { id: data.nivelId } });
    const valorEsperado = Number(nivel.valorAdesao);
    if (Math.abs(data.valor - valorEsperado) > 0.01) {
      throw new BadRequestException(
        `Valor do nível ${nivel.nome} é R$ ${valorEsperado.toFixed(2)}. Informado: R$ ${data.valor.toFixed(2)}.`,
      );
    }
    return this.prisma.pagamentoUsuario.create({
      data: {
        usuarioId: data.usuarioId,
        nivelId: data.nivelId,
        valor: new Decimal(data.valor),
        formaPagamento: data.formaPagamento ?? null,
        gatewayId: data.gatewayId ?? null,
        status: 'PENDENTE',
      },
      include: { usuario: { select: { nome: true, email: true } }, nivel: { select: { nome: true } } },
    });
  }

  async confirmar(pagamentoId: string, adminId: string) {
    const pag = await this.prisma.pagamentoUsuario.findUniqueOrThrow({
      where: { id: pagamentoId },
      include: { usuario: true, nivel: true },
    });
    if (pag.status === 'PAGO') {
      return { pagamento: pag, already: true };
    }

    await this.prisma.pagamentoUsuario.update({
      where: { id: pagamentoId },
      data: { status: 'PAGO', dataPagamento: new Date() },
    });

    await this.bonus.gerarPorPagamentoUsuario(pagamentoId);

    await this.audit.log({
      entidade: 'PagamentoUsuario',
      entidadeId: pagamentoId,
      acao: 'CONFIRMAR_PAGAMENTO',
      usuarioAdminId: adminId,
      valorAnterior: 'PENDENTE',
      valorNovo: 'PAGO',
      detalhes: `${pag.usuario.nome} - ${pag.nivel.nome} - R$ ${Number(pag.valor)}`,
    });

    return this.prisma.pagamentoUsuario.findUniqueOrThrow({
      where: { id: pagamentoId },
      include: { usuario: true, nivel: true },
    });
  }

  async listarTodos(filtros?: { status?: string; usuarioId?: string; nivelId?: string; dataInicio?: Date; dataFim?: Date }) {
    const where: Record<string, unknown> = {};
    if (filtros?.status) where.status = filtros.status;
    if (filtros?.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros?.nivelId) where.nivelId = filtros.nivelId;
    if (filtros?.dataInicio || filtros?.dataFim) {
      where.dataCriacao = {};
      if (filtros.dataInicio) (where.dataCriacao as Record<string, Date>).gte = filtros.dataInicio;
      if (filtros.dataFim) (where.dataCriacao as Record<string, Date>).lte = filtros.dataFim;
    }

    return this.prisma.pagamentoUsuario.findMany({
      where,
      include: { usuario: { select: { id: true, nome: true, email: true } }, nivel: true },
      orderBy: { dataCriacao: 'desc' },
    });
  }

  async listarPorUsuario(usuarioId: string) {
    return this.prisma.pagamentoUsuario.findMany({
      where: { usuarioId },
      include: { nivel: true },
      orderBy: { dataCriacao: 'desc' },
    });
  }
}
