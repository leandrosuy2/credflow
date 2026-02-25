import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PagamentosService } from './pagamentos.service';
import { TipoUsuario } from '@credflow/database';

@Controller('pagamentos')
@UseGuards(JwtAuthGuard)
export class PagamentosController {
  constructor(private readonly pagamentos: PagamentosService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  listarTodos(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('status') status?: string,
  ) {
    return this.pagamentos.listarTodos({
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
      status,
    });
  }

  @Get('cliente/:clienteId')
  findByCliente(@Param('clienteId') clienteId: string) {
    return this.pagamentos.findByCliente(clienteId);
  }

  @Post('confirmar')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  confirmar(@Body() body: { pagamentoId: string }) {
    return this.pagamentos.confirmarPagamento(body.pagamentoId);
  }
}
