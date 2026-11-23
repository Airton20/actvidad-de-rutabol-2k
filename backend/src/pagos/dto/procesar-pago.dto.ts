import { IsInt, IsNotEmpty, IsString, Length, Min } from 'class-validator';

export class ProcesarPagoDto {
  @IsInt() @Min(1)
  microId!: number;

  @IsString() @IsNotEmpty()
  @Length(15, 19, { message: 'El número de tarjeta debe tener entre 15 y 19 dígitos' })
  numeroTarjeta!: string;

  @IsString() @IsNotEmpty()
  nombreTitular!: string;

  @IsString() @IsNotEmpty()
  fechaVencimiento!: string;

  @IsString() @Length(3, 4, { message: 'El CVV debe tener 3 o 4 dígitos' })
  cvv!: string;
}
