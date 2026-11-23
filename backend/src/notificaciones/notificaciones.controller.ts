import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) { }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/leido')
  marcarLeida(@Param('id', ParseIntPipe) id: number) {
    return this.service.marcarLeida(id);
  }
}
