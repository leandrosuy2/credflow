import { Module } from '@nestjs/common';
import { PagamentosUsuarioController } from './pagamentos-usuario.controller';
import { PagamentosUsuarioService } from './pagamentos-usuario.service';
import { BonusModule } from '../bonus/bonus.module';

@Module({
  imports: [BonusModule],
  controllers: [PagamentosUsuarioController],
  providers: [PagamentosUsuarioService],
  exports: [PagamentosUsuarioService],
})
export class PagamentosUsuarioModule {}
