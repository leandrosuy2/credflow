import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { CadastroIndicacaoController } from './cadastro-indicacao.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  controllers: [UsuariosController, CadastroIndicacaoController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
