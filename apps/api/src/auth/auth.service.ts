import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { TipoUsuario } from '@credflow/database';

export type JwtPayload = { sub: string; email: string; tipo: TipoUsuario };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, senha: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: email.toLowerCase(), status: 'ATIVO' },
    });
    if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    const payload: JwtPayload = { sub: usuario.id, email: usuario.email, tipo: usuario.tipo };
    const token = this.jwt.sign(payload);
    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        vendedorPaiId: usuario.vendedorPaiId,
      },
    };
  }

  async validateUser(payload: JwtPayload) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub, status: 'ATIVO' },
    });
    if (!usuario) throw new UnauthorizedException();
    return usuario;
  }
}
