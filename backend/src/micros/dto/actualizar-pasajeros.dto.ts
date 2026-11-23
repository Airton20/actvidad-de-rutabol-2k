import { IsIn, IsInt, Min } from 'class-validator';

export class ActualizarPasajerosDto {
  @IsIn(['SUBIR', 'BAJAR'])
  accion!: 'SUBIR' | 'BAJAR';

  @IsInt() @Min(1)
  cantidad!: number;
}
