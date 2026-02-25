import { Injectable, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Usuario } from '@credflow/database';

const COMISSAO_VENDEDOR_ENV = Number(process.env.COMISSAO_VENDEDOR) || 20;
const COMISSAO_PREPOSTO_ENV = Number(process.env.COMISSAO_PREPOSTO) || 5;
const CONFIG_KEY_VENDEDOR = 'COMISSAO_VENDEDOR';
const CONFIG_KEY_PREPOSTO = 'COMISSAO_PREPOSTO';

@Injectable()
export class VendasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usuarios: UsuariosService,
  ) {}

  /** Lê % de comissão do banco (config); se não existir, usa env. */
  async getComissoesPct(): Promise<{ comissaoVendedor: number; comissaoPreposto: number }> {
    const [cfgV, cfgP] = await Promise.all([
      this.prisma.config.findUnique({ where: { chave: CONFIG_KEY_VENDEDOR } }),
      this.prisma.config.findUnique({ where: { chave: CONFIG_KEY_PREPOSTO } }),
    ]);
    return {
      comissaoVendedor: cfgV?.valor != null ? Number(cfgV.valor) : COMISSAO_VENDEDOR_ENV,
      comissaoPreposto: cfgP?.valor != null ? Number(cfgP.valor) : COMISSAO_PREPOSTO_ENV,
    };
  }

  /** Cria ou atualiza venda e comissões quando pagamento é confirmado. */
  async registrarVendaPorPagamento(clienteId: string) {
    const cliente = await this.prisma.cliente.findUniqueOrThrow({
      where: { id: clienteId },
      include: { vendedor: true },
    });
    const { comissaoVendedor: comissaoVendedorPct, comissaoPreposto: comissaoPrepostoPct } = await this.getComissoesPct();
    const valor = Number(cliente.valorServico);
    const vendedor = cliente.vendedor;
    const isPreposto = !!cliente.prepostoId;
    const pctV = comissaoVendedorPct;
    const pctP = isPreposto ? comissaoPrepostoPct : 0;
    const comissaoVendedor = new Decimal((valor * pctV) / 100);
    const comissaoPreposto = isPreposto ? new Decimal((valor * pctP) / 100) : null;

    const vendedorId = vendedor.id;
    const prepostoId = cliente.prepostoId ?? null;

    const existing = await this.prisma.venda.findFirst({
      where: { clienteId },
      orderBy: { dataVenda: 'desc' },
    });

    if (existing) {
      return this.prisma.venda.update({
        where: { id: existing.id },
        data: {
          statusPagamento: 'PAGO',
          comissaoVendedor,
          comissaoPreposto: comissaoPreposto ?? undefined,
          prepostoId: prepostoId ?? undefined,
        },
      });
    }

    return this.prisma.venda.create({
      data: {
        clienteId,
        vendedorId,
        prepostoId,
        valorServico: cliente.valorServico,
        comissaoVendedor,
        comissaoPreposto,
        statusPagamento: 'PAGO',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.venda.findUniqueOrThrow({
      where: { id },
      include: { cliente: true, vendedor: true },
    });
  }

  async findByCliente(clienteId: string) {
    return this.prisma.venda.findMany({
      where: { clienteId },
      include: { vendedor: { select: { nome: true } } },
      orderBy: { dataVenda: 'desc' },
    });
  }

  async resumoComissoes(user: Usuario) {
    if (user.tipo === 'preposto') {
      const vendas = await this.prisma.venda.findMany({
        where: { prepostoId: user.id, statusPagamento: 'PAGO' },
        select: { comissaoPreposto: true, valorServico: true },
      });
      const comissaoReceber = vendas.reduce((s, v) => s + Number(v.comissaoPreposto ?? 0), 0);
      const totalVendido = vendas.reduce((s, v) => s + Number(v.valorServico), 0);
      return { totalVendido, comissaoReceber, quantidadeVendas: vendas.length };
    }
    const ids = await this.usuarios.vendedorIdsPermitidos(user);
    const vendas = await this.prisma.venda.findMany({
      where: { vendedorId: { in: ids }, statusPagamento: 'PAGO' },
      select: { comissaoVendedor: true, valorServico: true },
    });
    const comissaoReceber = vendas.reduce((s, v) => s + Number(v.comissaoVendedor), 0);
    const totalVendido = vendas.reduce((s, v) => s + Number(v.valorServico), 0);
    return { totalVendido, comissaoReceber, quantidadeVendas: vendas.length };
  }

  /** Retorna os % de comissão atuais (banco ou env). Para admin "controlar comissões". */
  async getConfigComissoes(): Promise<{ comissaoVendedor: number; comissaoPreposto: number }> {
    return this.getComissoesPct();
  }

  /** Atualiza % de comissão no banco (admin). */
  async updateConfigComissoes(comissaoVendedor: number, comissaoPreposto: number): Promise<{ comissaoVendedor: number; comissaoPreposto: number }> {
    if (comissaoVendedor < 0 || comissaoVendedor > 100 || comissaoPreposto < 0 || comissaoPreposto > 100) {
      throw new BadRequestException('Comissões devem estar entre 0 e 100.');
    }
    await this.prisma.$transaction([
      this.prisma.config.upsert({
        where: { chave: CONFIG_KEY_VENDEDOR },
        create: { chave: CONFIG_KEY_VENDEDOR, valor: String(comissaoVendedor) },
        update: { valor: String(comissaoVendedor) },
      }),
      this.prisma.config.upsert({
        where: { chave: CONFIG_KEY_PREPOSTO },
        create: { chave: CONFIG_KEY_PREPOSTO, valor: String(comissaoPreposto) },
        update: { valor: String(comissaoPreposto) },
      }),
    ]);
    return { comissaoVendedor, comissaoPreposto };
  }

  async dashboardAdmin() {
    const [totalVendas, porVendedor, pagamentosRecebidos] = await Promise.all([
      this.prisma.venda.aggregate({
        where: { statusPagamento: 'PAGO' },
        _sum: { valorServico: true },
        _count: true,
      }),
      this.prisma.venda.groupBy({
        by: ['vendedorId'],
        where: { statusPagamento: 'PAGO' },
        _sum: { valorServico: true, comissaoVendedor: true },
        _count: true,
      }),
      this.prisma.pagamento.aggregate({
        where: { status: 'PAGO' },
        _sum: { valor: true },
        _count: true,
      }),
    ]);
    const vendedorIds = [...new Set(porVendedor.map((p) => p.vendedorId))];
    const usuarios = await this.prisma.usuario.findMany({
      where: { id: { in: vendedorIds } },
      select: { id: true, nome: true, tipo: true },
    });
    const ranking = porVendedor.map((p) => ({
      vendedorId: p.vendedorId,
      nome: usuarios.find((u) => u.id === p.vendedorId)?.nome ?? '—',
      tipo: usuarios.find((u) => u.id === p.vendedorId)?.tipo,
      totalVendido: Number(p._sum.valorServico ?? 0),
      comissao: Number(p._sum.comissaoVendedor ?? 0),
      quantidade: p._count,
    })).sort((a, b) => b.totalVendido - a.totalVendido);

    const processosAndamento = await this.prisma.cliente.count({
      where: {
        statusProcesso: { in: ['CADASTRO_RECEBIDO', 'EM_ANALISE', 'EM_ANDAMENTO', 'AGUARDANDO_PAGAMENTO'] },
      },
    });
    const clientesTotal = await this.prisma.cliente.count();
    const convertidos = await this.prisma.cliente.count({ where: { statusProcesso: 'PAGO' } });
    const taxaConversao = clientesTotal > 0 ? Math.round((convertidos / clientesTotal) * 100) : 0;

    return {
      totalVendido: Number(totalVendas._sum.valorServico ?? 0),
      totalVendas: totalVendas._count,
      pagamentosRecebidos: Number(pagamentosRecebidos._sum.valor ?? 0),
      quantidadePagamentos: pagamentosRecebidos._count,
      processosEmAndamento: processosAndamento,
      rankingVendedores: ranking,
      taxaConversao,
      clientesTotal,
    };
  }
}
