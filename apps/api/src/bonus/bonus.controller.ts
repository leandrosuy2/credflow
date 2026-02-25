import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TipoUsuario, Usuario } from '@credflow/database';
import { BonusService } from './bonus.service';

@Controller('bonus')
@UseGuards(JwtAuthGuard)
export class BonusController {
  constructor(private readonly bonus: BonusService) {}

  @Get('admin/todos')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  listarTodos(
    @Query('status') status?: string,
    @Query('beneficiarioId') beneficiarioId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('nivelId') nivelId?: string,
  ) {
    return this.bonus.listarTodos({
      status,
      beneficiarioId,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
      nivelId,
    });
  }

  @Get('admin/resumo')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  resumoGeral() {
    return this.bonus.resumoGeral();
  }

  @Get('meu-resumo')
  resumo(@CurrentUser() user: Usuario) {
    return this.bonus.resumoPorUsuario(user.id);
  }

  @Get('meus')
  meus(@CurrentUser() user: Usuario) {
    return this.bonus.listarPorUsuario(user.id);
  }
}
