import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TipoUsuario, Usuario } from '@credflow/database';
import { SaquesService } from './saques.service';

@Controller('saques')
@UseGuards(JwtAuthGuard)
export class SaquesController {
  constructor(private readonly saques: SaquesService) {}

  @Post('solicitar')
  solicitar(@CurrentUser() user: Usuario, @Body() body: { valor: number }) {
    return this.saques.solicitar(user.id, body.valor);
  }

  @Get('saldo-disponivel')
  saldoDisponivel(@CurrentUser() user: Usuario) {
    return this.saques.saldoDisponivelUsuario(user.id).then((v) => ({ saldoDisponivel: v }));
  }

  @Get('meus')
  meus(@CurrentUser() user: Usuario) {
    return this.saques.listarPorUsuario(user.id);
  }

  @Get('admin/todos')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  listarTodos(
    @Query('status') status?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.saques.listarTodos({
      status,
      usuarioId,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
    });
  }

  @Post('admin/:id/aprovar')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  aprovar(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.saques.aprovar(id, user.id);
  }

  @Post('admin/:id/recusar')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  recusar(
    @Param('id') id: string,
    @CurrentUser() user: Usuario,
    @Body() body: { motivoRecusa: string },
  ) {
    return this.saques.recusar(id, user.id, body.motivoRecusa ?? 'Não informado');
  }

  @Post('admin/:id/marcar-pago')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  marcarComoPago(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.saques.marcarComoPago(id, user.id);
  }
}
