import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class CreateTrasbordoDto {
  @IsInt() @Min(1)
  microOrigenId!: number;

  @IsInt() @Min(1)
  microDestinoId!: number;

  @IsIn(['CAMBIO_TURNO', 'FALLA_MECANICA', 'EMERGENCIA'])
  motivo!: 'CAMBIO_TURNO' | 'FALLA_MECANICA' | 'EMERGENCIA';

  @IsOptional() @IsInt() @Min(0)
  cantidadPasajeros?: number;
}
