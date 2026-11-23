import { Body, Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PagosService } from './pagos.service';
import { ProcesarPagoDto } from './dto/procesar-pago.dto';
import { SessionGuard } from '../auth/session.guard';

@Controller('pagos')
export class PagosController {
  constructor(private readonly service: PagosService) {}

  @Post('pagar')
  @UseGuards(SessionGuard)
  procesarPago(@Req() req: Request, @Body() dto: ProcesarPagoDto) {
    if (!req.session?.usuarioId) throw new UnauthorizedException('Debe iniciar sesión');
    return this.service.procesarPago(req.session.usuarioId, dto);
  }

  @Get('mis-pagos')
  @UseGuards(SessionGuard)
  historial(@Req() req: Request) {
    if (!req.session?.usuarioId) throw new UnauthorizedException('Debe iniciar sesión');
    return this.service.historialUsuario(req.session.usuarioId);
  }

  @Get('verificar/:codigoTicket')
  verificar(@Param('codigoTicket') codigoTicket: string) {
    return this.service.verificarTicket(codigoTicket);
  }
}
