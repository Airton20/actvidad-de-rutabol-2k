import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TrasbordosService } from './trasbordos.service';
import { CreateTrasbordoDto } from './dto/create-trasbordo.dto';
import { SessionGuard } from '../auth/session.guard';

@Controller('trasbordos')
export class TrasbordosController {
  constructor(private readonly service: TrasbordosService) {}

  @Post()
  @UseGuards(SessionGuard)
  crear(@Body() dto: CreateTrasbordoDto) {
    return this.service.crear(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
