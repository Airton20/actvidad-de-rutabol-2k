import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TrasbordosService } from './trasbordos.service';
import { CreateTrasbordoDto } from './dto/create-trasbordo.dto';
import { ConductorOrAdminGuard } from '../auth/session.guard';

@Controller('trasbordos')
export class TrasbordosController {
  constructor(private readonly service: TrasbordosService) {}

  @Post()
  @UseGuards(ConductorOrAdminGuard)
  crear(@Body() dto: CreateTrasbordoDto) { return this.service.crear(dto); }

  @Get()
  @UseGuards(ConductorOrAdminGuard)
  findAll() { return this.service.findAll(); }
}
