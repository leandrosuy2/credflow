import { Injectable, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class NiveisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll() {
    return this.prisma.nivel.findMany({
      orderBy: { ordem: 'asc' },
      include: { _count: { select: { usuarios: true } } },
    });
  }

  async findOne(id: string) {
    return this.prisma.nivel.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { usuarios: true, pagamentosUsuario: true } } },
    });
  }

  async update(
    id: string,
    data: { valorAdesao?: number; valorBonus?: number; ordem?: number },
    adminId?: string,
  ) {
    const anterior = await this.prisma.nivel.findUniqueOrThrow({ where: { id } });
    const update: Record<string, unknown> = {};
    if (data.valorAdesao != null) update.valorAdesao = new Decimal(data.valorAdesao);
    if (data.valorBonus != null) update.valorBonus = new Decimal(data.valorBonus);
    if (data.ordem != null) update.ordem = data.ordem;

    const atualizado = await this.prisma.nivel.update({
      where: { id },
      data: update as never,
    });

    await this.audit.log({
      entidade: 'Nivel',
      entidadeId: id,
      acao: 'UPDATE',
      usuarioAdminId: adminId ?? undefined,
      valorAnterior: JSON.stringify({
        valorAdesao: Number(anterior.valorAdesao),
        valorBonus: Number(anterior.valorBonus),
        ordem: anterior.ordem,
      }),
      valorNovo: JSON.stringify({
        valorAdesao: Number(atualizado.valorAdesao),
        valorBonus: Number(atualizado.valorBonus),
        ordem: atualizado.ordem,
      }),
      detalhes: 'Ajuste de valores ou ordem do nível',
    });

    return atualizado;
  }
}
