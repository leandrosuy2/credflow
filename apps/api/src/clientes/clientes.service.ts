import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';
import { Usuario } from '@credflow/database';
import { Decimal } from '@prisma/client/runtime/library';
import { UsuariosService } from '../usuarios/usuarios.service';
import { StatusProcesso } from '@credflow/database';

function gerarTokenLink(): string {
  return randomBytes(10).toString('base64url').replace(/[-_]/g, '').slice(0, 12).toUpperCase();
}

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usuarios: UsuariosService,
  ) {}

  async create(
    user: Usuario,
    data: {
      nome: string;
      cpfCnpj: string;
      telefone: string;
      email: string;
      valorServico: number;
    },
  ) {
    const idsPermitidos = await this.usuarios.vendedorIdsPermitidos(user);
    if (user.tipo !== 'admin' && !idsPermitidos.includes(user.id)) {
      throw new ForbiddenException('Apenas vendedores podem cadastrar clientes');
    }
    let link = gerarTokenLink();
    while (await this.prisma.cliente.findUnique({ where: { linkAcompanhamento: link } })) {
      link = gerarTokenLink();
    }
    const cliente = await this.prisma.cliente.create({
      data: {
        nome: data.nome,
        cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
        telefone: data.telefone.replace(/\D/g, ''),
        email: data.email,
        valorServico: new Decimal(data.valorServico),
        vendedorId: user.tipo === 'preposto' ? user.vendedorPaiId! : user.id,
        prepostoId: user.tipo === 'preposto' ? user.id : undefined,
        linkAcompanhamento: link,
      },
      include: { vendedor: { select: { nome: true, email: true } } },
    });
    await this.prisma.historicoProcesso.create({
      data: {
        clienteId: cliente.id,
        status: 'CADASTRO_RECEBIDO',
        descricao: 'Cadastro recebido no sistema',
      },
    });
    return cliente;
  }

  async findAll(user: Usuario) {
    const ids = await this.usuarios.vendedorIdsPermitidos(user);
    return this.prisma.cliente.findMany({
      where: { vendedorId: { in: ids } },
      include: {
        vendedor: { select: { id: true, nome: true } },
        vendas: { take: 1, orderBy: { dataVenda: 'desc' } },
      },
      orderBy: { dataCadastro: 'desc' },
    });
  }

  async findOne(id: string, user: Usuario) {
    const ids = await this.usuarios.vendedorIdsPermitidos(user);
    const c = await this.prisma.cliente.findFirst({
      where: { id, vendedorId: { in: ids } },
      include: {
        vendedor: { select: { nome: true, email: true } },
        vendas: true,
        pagamentos: true,
        historicoProcesso: { orderBy: { dataAtualizacao: 'desc' } },
      },
    });
    if (!c) throw new NotFoundException('Cliente não encontrado');
    return c;
  }

  async findByLink(link: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { linkAcompanhamento: link.toUpperCase() },
      include: {
        historicoProcesso: { orderBy: { dataAtualizacao: 'desc' } },
        pagamentos: { orderBy: { dataCriacao: 'desc' } },
      },
    });
    if (!cliente) throw new NotFoundException('Link inválido');
    return cliente;
  }

  async updateStatus(id: string, user: Usuario, status: StatusProcesso, descricao?: string) {
    const ids = await this.usuarios.vendedorIdsPermitidos(user);
    const c = await this.prisma.cliente.findFirst({ where: { id, vendedorId: { in: ids } } });
    if (!c) throw new ForbiddenException('Cliente não encontrado');
    await this.prisma.historicoProcesso.create({
      data: { clienteId: id, status, descricao: descricao || `Status alterado para ${status}` },
    });
    return this.prisma.cliente.update({
      where: { id },
      data: { statusProcesso: status },
      include: { historicoProcesso: { orderBy: { dataAtualizacao: 'desc' } } },
    });
  }

  async update(id: string, user: Usuario, data: Partial<{ nome: string; cpfCnpj: string; telefone: string; email: string; valorServico: number }>) {
    const ids = await this.usuarios.vendedorIdsPermitidos(user);
    const exists = await this.prisma.cliente.findFirst({ where: { id, vendedorId: { in: ids } } });
    if (!exists) throw new ForbiddenException('Cliente não encontrado');
    const update: Record<string, unknown> = {};
    if (data.nome != null) update.nome = data.nome;
    if (data.cpfCnpj != null) update.cpfCnpj = data.cpfCnpj.replace(/\D/g, '');
    if (data.telefone != null) update.telefone = data.telefone.replace(/\D/g, '');
    if (data.email != null) update.email = data.email;
    if (data.valorServico != null) update.valorServico = new Decimal(data.valorServico);
    return this.prisma.cliente.update({
      where: { id },
      data: update as never,
      include: { vendedor: { select: { nome: true } } },
    });
  }

  async remove(id: string, user: Usuario) {
    const ids = await this.usuarios.vendedorIdsPermitidos(user);
    const exists = await this.prisma.cliente.findFirst({ where: { id, vendedorId: { in: ids } } });
    if (!exists) throw new ForbiddenException('Cliente não encontrado');
    await this.prisma.cliente.delete({ where: { id } });
    return { success: true };
  }
}
