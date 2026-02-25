import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    entidade: string;
    entidadeId: string;
    campo?: string;
    valorAnterior?: string;
    valorNovo?: string;
    acao: string;
    usuarioAdminId?: string;
    detalhes?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        entidade: params.entidade,
        entidadeId: params.entidadeId,
        campo: params.campo ?? null,
        valorAnterior: params.valorAnterior ?? null,
        valorNovo: params.valorNovo ?? null,
        acao: params.acao,
        usuarioAdminId: params.usuarioAdminId ?? null,
        detalhes: params.detalhes ?? null,
      },
    });
  }

  async listar(filtros?: { entidade?: string; usuarioAdminId?: string; dataInicio?: Date; dataFim?: Date }, limit = 200) {
    const where: Record<string, unknown> = {};
    if (filtros?.entidade) where.entidade = filtros.entidade;
    if (filtros?.usuarioAdminId) where.usuarioAdminId = filtros.usuarioAdminId;
    if (filtros?.dataInicio || filtros?.dataFim) {
      where.data = {};
      if (filtros.dataInicio) (where.data as Record<string, Date>).gte = filtros.dataInicio;
      if (filtros.dataFim) (where.data as Record<string, Date>).lte = filtros.dataFim;
    }
    return this.prisma.auditLog.findMany({
      where,
      include: { usuarioAdmin: { select: { id: true, nome: true, email: true } } },
      orderBy: { data: 'desc' },
      take: limit,
    });
  }
}
