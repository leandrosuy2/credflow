import { Body, Controller, Post } from '@nestjs/common';
import { PagamentosService } from './pagamentos.service';

/** Webhook e endpoints públicos (sem JWT). */
@Controller('pagamentos/public')
export class PagamentosPublicController {
  constructor(private readonly pagamentos: PagamentosService) {}

  /** Iniciar pagamento a partir do link do cliente (ex: PIX). */
  @Post('criar')
  criarPorLink(@Body() body: { link: string; formaPagamento?: string }) {
    return this.pagamentos.criarPorLink(body.link, body.formaPagamento ?? 'PIX');
  }
}
