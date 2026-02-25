import { Injectable, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

/** Verifica se hoje é quinta-feira (4 = quinta em getDay()). */
function isQuintaFeira(): boolean {
  const hoje = new Date();
  return hoje.getDay() === 4;
}

@Injectable()
export class SaquesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async solicitar(usuarioId: string, valor: number): Promise<unknown> {
    if (!isQuintaFeira()) {
      throw new BadRequestException('Solicitação de saque só é permitida às quintas-feiras.');
    }
    if (valor <= 0) throw new BadRequestException('Valor deve ser positivo.');

    const saldoDisponivel = await this.saldoDisponivelUsuario(usuarioId);
    if (valor > saldoDisponivel) {
      throw new BadRequestException(
        `Saldo disponível (R$ ${saldoDisponivel.toFixed(2)}) é insuficiente para o valor solicitado.`,
      );
    }

    return this.prisma.saque.create({
      data: {
        usuarioId,
        valor: new Decimal(valor),
        status: 'PENDENTE',
      },
    });
  }

  async saldoDisponivelUsuario(usuarioId: string): Promise<number> {
    const [totalBonus, totalEmSaque] = await Promise.all([
      this.prisma.bonus.aggregate({
        where: { beneficiarioId: usuarioId, status: 'PENDENTE' },
        _sum: { valor: true },
      }),
      this.prisma.saque.aggregate({
        where: {
          usuarioId,
          status: { in: ['PENDENTE', 'APROVADO'] },
        },
        _sum: { valor: true },
      }),
    ]);
    const bonusPendente = Number(totalBonus._sum.valor ?? 0);
    const valorEmSaque = Number(totalEmSaque._sum.valor ?? 0);
    return Math.max(0, bonusPendente - valorEmSaque);
  }

  async listarPorUsuario(usuarioId: string) {
    return this.prisma.saque.findMany({
      where: { usuarioId },
      orderBy: { dataSolicitacao: 'desc' },
    });
  }

  async listarTodos(filtros?: { status?: string; usuarioId?: string; dataInicio?: Date; dataFim?: Date }) {
    const where: Record<string, unknown> = {};
    if (filtros?.status) where.status = filtros.status;
    if (filtros?.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros?.dataInicio || filtros?.dataFim) {
      where.dataSolicitacao = {};
      if (filtros.dataInicio) (where.dataSolicitacao as Record<string, Date>).gte = filtros.dataInicio;
      if (filtros.dataFim) (where.dataSolicitacao as Record<string, Date>).lte = filtros.dataFim;
    }

    return this.prisma.saque.findMany({
      where,
      include: { usuario: { select: { id: true, nome: true, email: true } } },
      orderBy: { dataSolicitacao: 'desc' },
    });
  }

  async aprovar(id: string, adminId: string) {
    const saque = await this.prisma.saque.findUniqueOrThrow({
      where: { id },
      include: { usuario: true },
    });
    if (saque.status !== 'PENDENTE') {
      throw new BadRequestException('Só é possível aprovar saques com status PENDENTE.');
    }

    const atualizado = await this.prisma.saque.update({
      where: { id },
      data: { status: 'APROVADO', dataAprovacao: new Date() },
    });

    await this.audit.log({
      entidade: 'Saque',
      entidadeId: id,
      acao: 'APROVAR_SAQUE',
      usuarioAdminId: adminId,
      valorAnterior: saque.status,
      valorNovo: 'APROVADO',
      detalhes: `Saque R$ ${Number(saque.valor)} - ${saque.usuario.nome}`,
    });

    return atualizado;
  }

  async recusar(id: string, adminId: string, motivoRecusa: string) {
    const saque = await this.prisma.saque.findUniqueOrThrow({ where: { id }, include: { usuario: true } });
    if (saque.status !== 'PENDENTE') {
      throw new BadRequestException('Só é possível recusar saques com status PENDENTE.');
    }

    const atualizado = await this.prisma.saque.update({
      where: { id },
      data: { status: 'CANCELADO', motivoRecusa },
    });

    await this.audit.log({
      entidade: 'Saque',
      entidadeId: id,
      acao: 'RECUSAR_SAQUE',
      usuarioAdminId: adminId,
      valorAnterior: saque.status,
      valorNovo: 'CANCELADO',
      detalhes: motivoRecusa,
    });

    return atualizado;
  }

  async marcarComoPago(id: string, adminId: string) {
    const saque = await this.prisma.saque.findUniqueOrThrow({
      where: { id },
      include: { usuario: true },
    });
    if (saque.status !== 'APROVADO') {
      throw new BadRequestException('Só é possível marcar como PAGO um saque APROVADO.');
    }

    const valorSaque = Number(saque.valor);
    const bonusPendentes = await this.prisma.bonus.findMany({
      where: { beneficiarioId: saque.usuarioId, status: 'PENDENTE' },
      orderBy: { dataGeracao: 'asc' },
    });
    let restante = valorSaque;
    const idsMarcarPago: string[] = [];
    for (const b of bonusPendentes) {
      if (restante <= 0) break;
      const v = Number(b.valor);
      idsMarcarPago.push(b.id);
      restante -= v;
    }
    if (restante > 0.01) {
      throw new BadRequestException(
        'Saldo de bônus insuficiente para cobrir este saque. Aprove apenas quando o usuário tiver bônus pendentes suficientes.',
      );
    }

    const dataPagamento = new Date();
    await this.prisma.$transaction([
      this.prisma.saque.update({
        where: { id },
        data: { status: 'PAGO', dataPagamento },
      }),
      ...idsMarcarPago.map((bid) =>
        this.prisma.bonus.update({
          where: { id: bid },
          data: { status: 'PAGO', dataPagamento },
        }),
      ),
    ]);

    const atualizado = await this.prisma.saque.findUniqueOrThrow({ where: { id } });

    await this.audit.log({
      entidade: 'Saque',
      entidadeId: id,
      acao: 'PAGAR_SAQUE',
      usuarioAdminId: adminId,
      valorAnterior: 'APROVADO',
      valorNovo: 'PAGO',
      detalhes: `Saque R$ ${Number(saque.valor)} pago para ${saque.usuario.nome}`,
    });

    return atualizado;
  }
}
