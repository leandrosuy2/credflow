import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientesService } from './clientes.service';
import { Usuario } from '@credflow/database';
import { StatusProcesso } from '@credflow/database';

@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Post()
  create(
    @CurrentUser() user: Usuario,
    @Body()
    body: { nome: string; cpfCnpj: string; telefone: string; email: string; valorServico: number },
  ) {
    return this.clientes.create(user, body);
  }

  @Get()
  findAll(
    @CurrentUser() user: Usuario,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('statusProcesso') statusProcesso?: string,
  ) {
    return this.clientes.findAll(user, {
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
      statusProcesso: statusProcesso as StatusProcesso | undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.clientes.findOne(id, user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: Usuario,
    @Body() body: { nome?: string; cpfCnpj?: string; telefone?: string; email?: string; valorServico?: number },
  ) {
    return this.clientes.update(id, user, body);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: Usuario,
    @Body() body: { status: StatusProcesso; descricao?: string },
  ) {
    return this.clientes.updateStatus(id, user, body.status, body.descricao);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.clientes.remove(id, user);
  }
}
