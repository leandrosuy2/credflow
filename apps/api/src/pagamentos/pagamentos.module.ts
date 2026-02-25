import { Module } from '@nestjs/common';
import { PagamentosController } from './pagamentos.controller';
import { PagamentosPublicController } from './pagamentos-public.controller';
import { PagamentosService } from './pagamentos.service';
import { VendasModule } from '../vendas/vendas.module';
import { BonusModule } from '../bonus/bonus.module';

@Module({
  imports: [VendasModule, BonusModule],
  controllers: [PagamentosController, PagamentosPublicController],
  providers: [PagamentosService],
  exports: [PagamentosService],
})
export class PagamentosModule {}
