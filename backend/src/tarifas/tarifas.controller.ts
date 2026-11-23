import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { IsNumber, Min } from 'class-validator';
import { TarifasService } from './tarifas.service';
import { AdminGuard } from '../auth/session.guard';

class UpdateTarifaDto {
  @IsNumber()
  @Min(0)
  monto!: number;
}

@Controller('tarifas')
export class TarifasController {
  constructor(private readonly service: TarifasService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTarifaDto) {
    return this.service.update(id, dto.monto);
  }
}
