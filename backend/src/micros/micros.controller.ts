import { Body, Controller, Delete, Get, HttpCode, Param, ParseFloatPipe, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MicrosService } from './micros.service';
import { CreateMicroDto } from './dto/create-micro.dto';
import { UpdateMicroDto } from './dto/update-micro.dto';
import { ActualizarPasajerosDto } from './dto/actualizar-pasajeros.dto';
import { ActualizarUbicacionDto } from './dto/actualizar-ubicacion.dto';
import { AdminGuard, ConductorOrAdminGuard } from '../auth/session.guard';

@Controller('micros')
export class MicrosController {
  constructor(private readonly service: MicrosService) {}

  @Get('cercanos')
  findCercanos(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radio') radio?: string,
  ) {
    const radioKm = radio ? parseFloat(radio) : 5;
    return this.service.findCercanos(lat, lng, radioKm);
  }

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Patch(':id/pasajeros')
  @UseGuards(ConductorOrAdminGuard)
  actualizarPasajeros(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarPasajerosDto) {
    return this.service.actualizarPasajeros(id, dto);
  }

  @Patch(':id/ubicacion')
  @UseGuards(ConductorOrAdminGuard)
  actualizarUbicacion(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarUbicacionDto) {
    return this.service.actualizarUbicacion(id, dto);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateMicroDto) { return this.service.create(dto); }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMicroDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
