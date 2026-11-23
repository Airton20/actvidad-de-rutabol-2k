import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateLineaDto {
  @IsString() @IsNotEmpty() @MaxLength(10)
  @Matches(/^\d+[A-Za-z]?$/, { message: 'numero debe ser numérico (opcionalmente con letra)' })
  numero!: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  nombre!: string;

  @IsString() @IsNotEmpty() @MaxLength(80)
  zona!: string;

  @IsString() @IsNotEmpty()
  descripcion!: string;

  @IsOptional() @IsString() @MaxLength(20)
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'color debe ser hex (#RGB o #RRGGBB)' })
  color?: string;
}
