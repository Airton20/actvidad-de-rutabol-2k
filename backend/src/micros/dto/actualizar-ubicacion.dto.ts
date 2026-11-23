import { IsNumber } from 'class-validator';

export class ActualizarUbicacionDto {
  @IsNumber()
  latitud!: number;

  @IsNumber()
  longitud!: number;
}
