import { Controller, Get, Param } from '@nestjs/common';
import { ClientesService } from './clientes.service';

/** Rotas públicas: acompanhamento por link (sem JWT). */
@Controller('clientes/acompanhar')
export class ClientesPublicController {
  constructor(private readonly clientes: ClientesService) {}

  @Get(':link')
  findByLink(@Param('link') link: string) {
    return this.clientes.findByLink(link);
  }
}
