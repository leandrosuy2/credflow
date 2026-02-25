import { Module } from '@nestjs/common';
import { ClientesController } from './clientes.controller';
import { ClientesPublicController } from './clientes-public.controller';
import { ClientesService } from './clientes.service';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [UsuariosModule],
  controllers: [ClientesController, ClientesPublicController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
