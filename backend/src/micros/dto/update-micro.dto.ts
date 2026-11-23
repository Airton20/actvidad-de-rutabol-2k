import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { EstadoMicro } from '../micro.interface';

export class UpdateMicroDto {
  @IsOptional() @IsString() @MaxLength(20)
  placa?: string;

  @IsOptional() @IsString() @MaxLength(20)
  interno?: string;

  @IsOptional() @IsInt() @Min(18) @Max(25)
  capacidad?: number;

  @IsOptional() @IsIn(['ACTIVO', 'MANTENIMIENTO', 'INACTIVO', 'EMERGENCIA'])
  estado?: EstadoMicro;

  @IsOptional() @IsInt() @Min(1)
  lineaId?: number;

  @IsOptional() @IsInt() @Min(0)
  pasajerosActuales?: number;

  @IsOptional() @IsNumber()
  latitud?: number;

  @IsOptional() @IsNumber()
  longitud?: number;
}
