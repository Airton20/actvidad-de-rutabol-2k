import { Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}

  @Get()
  @UseGuards(SessionGuard)
  findAll() { return this.service.findAll(); }

  @Patch(':id/leido')
  @UseGuards(SessionGuard)
  marcarLeida(@Param('id', ParseIntPipe) id: number) { return this.service.marcarLeida(id); }
}
