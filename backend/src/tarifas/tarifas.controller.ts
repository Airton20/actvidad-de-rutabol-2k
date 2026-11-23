import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { TarifasService } from './tarifas.service';
import { SessionGuard } from '../auth/session.guard';
import { IsNumber, Min } from 'class-validator';

class UpdateTarifaDto {
  @IsNumber()
  @Min(0)
  monto!: number;
}

@Controller('tarifas')
export class TarifasController {
  constructor(private readonly service: TarifasService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id')
  @UseGuards(SessionGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTarifaDto) {
    return this.service.update(id, dto.monto);
  }
}
