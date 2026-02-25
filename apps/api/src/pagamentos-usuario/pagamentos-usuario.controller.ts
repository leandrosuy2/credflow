import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TipoUsuario, Usuario } from '@credflow/database';
import { PagamentosUsuarioService } from './pagamentos-usuario.service';

@Controller('pagamentos-usuario')
@UseGuards(JwtAuthGuard)
export class PagamentosUsuarioController {
  constructor(private readonly service: PagamentosUsuarioService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  criar(
    @Body()
    body: { usuarioId: string; nivelId: string; valor: number; formaPagamento?: string; gatewayId?: string },
  ) {
    return this.service.criar(body);
  }

  @Post(':id/confirmar')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  confirmar(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.confirmar(id, user.id);
  }

  @Get('admin/todos')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  listarTodos(
    @Query('status') status?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('nivelId') nivelId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.service.listarTodos({
      status,
      usuarioId,
      nivelId,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
    });
  }

  @Get('meus')
  meus(@CurrentUser() user: Usuario) {
    return this.service.listarPorUsuario(user.id);
  }
}
