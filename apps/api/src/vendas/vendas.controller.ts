import { Controller, Get, Param, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VendasService } from './vendas.service';
import { Usuario } from '@credflow/database';
import { TipoUsuario } from '@credflow/database';

@Controller('vendas')
@UseGuards(JwtAuthGuard)
export class VendasController {
  constructor(private readonly vendas: VendasService) {}

  @Get('comissoes')
  resumoComissoes(@CurrentUser() user: Usuario) {
    return this.vendas.resumoComissoes(user);
  }

  @Get('config-comissoes')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  configComissoes() {
    return this.vendas.getConfigComissoes();
  }

  @Put('config-comissoes')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  updateConfigComissoes(@Body() body: { comissaoVendedor: number; comissaoPreposto: number }) {
    return this.vendas.updateConfigComissoes(
      Number(body.comissaoVendedor),
      Number(body.comissaoPreposto),
    );
  }

  @Get('dashboard-admin')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  dashboardAdmin() {
    return this.vendas.dashboardAdmin();
  }

  @Get('cliente/:clienteId')
  findByCliente(@Param('clienteId') clienteId: string, @CurrentUser() user: Usuario) {
    return this.vendas.findByCliente(clienteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vendas.findById(id);
  }
}
