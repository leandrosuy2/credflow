import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma.service';

const CONFIG_BONUS_CLIENTE = 'BONUS_INDICADOR_VALOR'; // valor fixo de bônus quando cliente do vendedor paga (para o indicador do vendedor)
const DEFAULT_BONUS_CLIENTE = 100;

@Injectable()
export class BonusService {
  constructor(private readonly prisma: PrismaService) {}

  /** Gera bônus para o indicador quando um pagamento de CLIENTE é confirmado (vendedor tem indicador). Impede duplicidade. */
  async gerarPorPagamentoCliente(
    pagamentoId: string,
    vendedorId: string,
    valorPagamento: number,
  ): Promise<void> {
    const existente = await this.prisma.bonus.findFirst({
      where: { pagamentoId },
    });
    if (existente) return;

    const vendedor = await this.prisma.usuario.findUnique({
      where: { id: vendedorId },
      include: { nivel: true },
    });
    if (!vendedor?.indicadorId) return;

    const valorBonus =
      vendedor.nivel != null
        ? Number(vendedor.nivel.valorBonus)
        : await this.getBonusClienteConfig();

    await this.prisma.bonus.create({
      data: {
        beneficiarioId: vendedor.indicadorId,
        pagamentoId,
        valor: new Decimal(valorBonus),
        status: 'PENDENTE',
      },
    });
  }

  /** Gera bônus para o indicador quando um PAGAMENTO USUÁRIO (adesão) é confirmado. Impede duplicidade. */
  async gerarPorPagamentoUsuario(pagamentoUsuarioId: string): Promise<void> {
    const existente = await this.prisma.bonus.findFirst({
      where: { pagamentoUsuarioId },
    });
    if (existente) return;

    const pag = await this.prisma.pagamentoUsuario.findUnique({
      where: { id: pagamentoUsuarioId },
      include: { usuario: { include: { indicador: true } }, nivel: true },
    });
    if (!pag?.usuario.indicadorId) return;

    const valorBonus = Number(pag.nivel.valorBonus);

    await this.prisma.bonus.create({
      data: {
        beneficiarioId: pag.usuario.indicadorId,
        pagamentoUsuarioId,
        valor: new Decimal(valorBonus),
        status: 'PENDENTE',
      },
    });
  }

  private async getBonusClienteConfig(): Promise<number> {
    const cfg = await this.prisma.config.findUnique({
      where: { chave: CONFIG_BONUS_CLIENTE },
    });
    return cfg?.valor != null ? Number(cfg.valor) : DEFAULT_BONUS_CLIENTE;
  }

  async listarTodos(filtros?: { status?: string; beneficiarioId?: string; dataInicio?: Date; dataFim?: Date; nivelId?: string }) {
    const where: Record<string, unknown> = {};
    if (filtros?.status) where.status = filtros.status;
    if (filtros?.beneficiarioId) where.beneficiarioId = filtros.beneficiarioId;
    if (filtros?.dataInicio || filtros?.dataFim) {
      where.dataGeracao = {};
      if (filtros.dataInicio) (where.dataGeracao as Record<string, Date>).gte = filtros.dataInicio;
      if (filtros.dataFim) (where.dataGeracao as Record<string, Date>).lte = filtros.dataFim;
    }
    if (filtros?.nivelId) {
      where.pagamentoUsuario = { nivelId: filtros.nivelId };
    }

    return this.prisma.bonus.findMany({
      where,
      include: {
        beneficiario: { select: { id: true, nome: true, email: true } },
        pagamentoUsuario: { include: { usuario: { select: { nome: true, email: true } }, nivel: { select: { id: true, nome: true } } } },
        pagamento: { include: { cliente: { select: { nome: true } } } },
      },
      orderBy: { dataGeracao: 'desc' },
    });
  }

  async listarPorUsuario(usuarioId: string) {
    return this.prisma.bonus.findMany({
      where: { beneficiarioId: usuarioId },
      include: {
        pagamentoUsuario: { include: { usuario: { select: { nome: true } }, nivel: { select: { nome: true } } } },
        pagamento: { include: { cliente: { select: { nome: true } } } },
      },
      orderBy: { dataGeracao: 'desc' },
    });
  }

  async resumoPorUsuario(usuarioId: string) {
    const [pendentes, pagos] = await Promise.all([
      this.prisma.bonus.aggregate({
        where: { beneficiarioId: usuarioId, status: 'PENDENTE' },
        _sum: { valor: true },
        _count: true,
      }),
      this.prisma.bonus.aggregate({
        where: { beneficiarioId: usuarioId, status: 'PAGO' },
        _sum: { valor: true },
        _count: true,
      }),
    ]);
    return {
      totalPendente: Number(pendentes._sum.valor ?? 0),
      quantidadePendente: pendentes._count,
      totalPago: Number(pagos._sum.valor ?? 0),
      quantidadePago: pagos._count,
    };
  }

  async resumoGeral() {
    const [pendentes, pagos] = await Promise.all([
      this.prisma.bonus.aggregate({
        where: { status: 'PENDENTE' },
        _sum: { valor: true },
        _count: true,
      }),
      this.prisma.bonus.aggregate({
        where: { status: 'PAGO' },
        _sum: { valor: true },
        _count: true,
      }),
    ]);
    return {
      totalPendente: Number(pendentes._sum.valor ?? 0),
      quantidadePendente: pendentes._count,
      totalPago: Number(pagos._sum.valor ?? 0),
      quantidadePago: pagos._count,
    };
  }
}
