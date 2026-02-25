import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsuariosService } from './usuarios.service';
import { TipoUsuario, Usuario } from '@credflow/database';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  create(
    @Body()
    body: { nome: string; email: string; senha: string; tipo: TipoUsuario; vendedorPaiId?: string },
  ) {
    return this.usuarios.create(body);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  findAll() {
    return this.usuarios.findAll();
  }

  @Get('vendedores')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  findVendedores() {
    return this.usuarios.findVendedores();
  }

  @Get('arvore-indicacao')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  arvoreIndicacao() {
    return this.usuarios.arvoreIndicacao();
  }

  /** Lista prepostos do vendedor logado (só vendedor). */
  @Get('prepostos')
  @UseGuards(RolesGuard)
  findPrepostos(@CurrentUser() user: Usuario) {
    if (user.tipo !== 'vendedor') return [];
    return this.usuarios.findPrepostosByVendedor(user.id);
  }

  @Post('preposto')
  @UseGuards(RolesGuard)
  createPreposto(
    @CurrentUser() user: Usuario,
    @Body() body: { nome: string; email: string; senha: string },
  ) {
    if (user.tipo !== 'vendedor') throw new ForbiddenException('Apenas vendedores podem cadastrar prepostos');
    return this.usuarios.createPrepostoByVendedor(user.id, body);
  }

  @Get('me')
  me(@CurrentUser() user: Usuario) {
    return this.usuarios.findOne(user.id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  findOne(@Param('id') id: string) {
    return this.usuarios.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  update(
    @Param('id') id: string,
    @Body() body: { nome?: string; email?: string; senha?: string; status?: string; indicadorId?: string; nivelId?: string },
    @CurrentUser() user: Usuario,
  ) {
    return this.usuarios.update(id, body, user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(TipoUsuario.admin)
  remove(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.usuarios.remove(id, user.id);
  }
}
