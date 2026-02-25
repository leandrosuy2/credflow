import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TipoUsuario, Usuario } from '@credflow/database';
import { NiveisService } from './niveis.service';

@Controller('niveis')
@UseGuards(JwtAuthGuard)
export class NiveisController {
  constructor(private readonly niveis: NiveisService) {}

  @Get()
  findAll() {
    return this.niveis.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.niveis.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  update(
    @Param('id') id: string,
    @Body() body: { valorAdesao?: number; valorBonus?: number; ordem?: number },
    @CurrentUser() user: Usuario,
  ) {
    return this.niveis.update(id, body, user.tipo === 'admin' ? user.id : undefined);
  }
}
