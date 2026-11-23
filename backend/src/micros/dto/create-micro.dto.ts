import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { EstadoMicro } from '../micro.interface';

export class CreateMicroDto {
  @IsString() @IsNotEmpty() @MaxLength(20)
  placa!: string;

  @IsString() @IsNotEmpty() @MaxLength(20)
  interno!: string;

  @IsInt() @Min(18) @Max(25)
  capacidad!: number;

  @IsOptional() @IsIn(['ACTIVO', 'MANTENIMIENTO', 'INACTIVO', 'EMERGENCIA'])
  estado?: EstadoMicro;

  @IsInt() @Min(1)
  lineaId!: number;

  @IsOptional() @IsNumber()
  latitud?: number;

  @IsOptional() @IsNumber()
  longitud?: number;
}
