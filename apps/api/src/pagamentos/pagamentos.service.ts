import { Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma.service';
import { VendasService } from '../vendas/vendas.service';
import { StatusProcesso } from '@credflow/database';

@Injectable()
export class PagamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendas: VendasService,
  ) {}

  async criarPorCliente(clienteId: string, valor: number, formaPagamento: string, gatewayId?: string) {
    const cliente = await this.prisma.cliente.findUniqueOrThrow({ where: { id: clienteId } });
    const pagamento = await this.prisma.pagamento.create({
      data: {
        clienteId,
        valor: new Decimal(valor),
        formaPagamento,
        gatewayId: gatewayId ?? null,
      },
    });
    return pagamento;
  }

  /** Cria intenção de pagamento a partir do link do cliente (página pública). */
  async criarPorLink(link: string, formaPagamento: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { linkAcompanhamento: link.toUpperCase() },
    });
    if (!cliente) throw new NotFoundException('Link inválido');
    const valor = Number(cliente.valorServico);
    return this.criarPorCliente(cliente.id, valor, formaPagamento);
  }

  /** Confirma pagamento (chamado por webhook ou admin). Atualiza status, cliente e registra venda/comissão. */
  async confirmarPagamento(pagamentoId: string) {
    const pagamento = await this.prisma.pagamento.findUniqueOrThrow({
      where: { id: pagamentoId },
      include: { cliente: true },
    });
    if (pagamento.status === 'PAGO') {
      return { pagamento, already: true };
    }
    await this.prisma.$transaction([
      this.prisma.pagamento.update({
        where: { id: pagamentoId },
        data: { status: 'PAGO', dataPagamento: new Date() },
      }),
      this.prisma.cliente.update({
        where: { id: pagamento.clienteId },
        data: { statusProcesso: StatusProcesso.PAGO },
      }),
      this.prisma.historicoProcesso.create({
        data: {
          clienteId: pagamento.clienteId,
          status: 'PAGO',
          descricao: 'Pagamento confirmado',
        },
      }),
    ]);
    await this.vendas.registrarVendaPorPagamento(pagamento.clienteId);
    return this.prisma.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } });
  }

  async findByCliente(clienteId: string) {
    return this.prisma.pagamento.findMany({
      where: { clienteId },
      orderBy: { dataCriacao: 'desc' },
    });
  }

  async listarTodos() {
    return this.prisma.pagamento.findMany({
      include: { cliente: { select: { nome: true, email: true } } },
      orderBy: { dataCriacao: 'desc' },
    });
  }
}
