import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/session.guard';
import { CreateLineaDto } from './dto/create-linea.dto';
import { UpdateLineaDto } from './dto/update-linea.dto';
import { LineasService } from './lineas.service';

@Controller('lineas')
export class LineasController {
  constructor(private readonly service: LineasService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateLineaDto) { return this.service.create(dto); }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLineaDto) { return this.service.update(id, dto); }
}
