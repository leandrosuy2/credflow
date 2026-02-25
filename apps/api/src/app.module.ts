import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ClientesModule } from './clientes/clientes.module';
import { VendasModule } from './vendas/vendas.module';
import { PagamentosModule } from './pagamentos/pagamentos.module';
import { NiveisModule } from './niveis/niveis.module';
import { BonusModule } from './bonus/bonus.module';
import { SaquesModule } from './saques/saques.module';
import { PagamentosUsuarioModule } from './pagamentos-usuario/pagamentos-usuario.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    UsuariosModule,
    ClientesModule,
    VendasModule,
    PagamentosModule,
    NiveisModule,
    BonusModule,
    SaquesModule,
    PagamentosUsuarioModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
