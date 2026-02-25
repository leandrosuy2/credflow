import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

@Controller('cadastro-indicacao')
export class CadastroIndicacaoController {
  constructor(private readonly usuarios: UsuariosService) {}

  /** Valida o link e retorna nome do indicador e nível (para exibir na tela de cadastro). */
  @Get('link')
  getLink(
    @Query('indicador') indicadorId: string,
    @Query('nivel') nivel: string,
  ) {
    return this.usuarios.getLinkIndicacao(indicadorId, nivel);
  }

  /** Cadastro público: indicado preenche nome, e-mail e senha. */
  @Post()
  cadastrar(
    @Body()
    body: { indicadorId: string; nivel: 'PRATA' | 'BRONZE'; nome: string; email: string; senha: string },
  ) {
    return this.usuarios.createByIndicacao(body.indicadorId, body.nivel, {
      nome: body.nome,
      email: body.email,
      senha: body.senha,
    });
  }
}
