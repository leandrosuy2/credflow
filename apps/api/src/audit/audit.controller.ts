import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TipoUsuario } from '@credflow/database';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(TipoUsuario.admin)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  listar(
    @Query('entidade') entidade?: string,
    @Query('usuarioAdminId') usuarioAdminId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.listar(
      {
        entidade,
        usuarioAdminId,
        dataInicio: dataInicio ? new Date(dataInicio) : undefined,
        dataFim: dataFim ? new Date(dataFim) : undefined,
      },
      limit ? parseInt(limit, 10) : 200,
    );
  }
}
