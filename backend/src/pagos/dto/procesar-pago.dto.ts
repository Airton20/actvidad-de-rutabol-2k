import { IsInt, IsNotEmpty, IsString, Length, Matches, Min } from 'class-validator';

export class ProcesarPagoDto {
  @IsInt() @Min(1)
  microId!: number;

  @IsString() @IsNotEmpty()
  @Length(15, 19, { message: 'El número de tarjeta debe tener entre 15 y 19 dígitos' })
  @Matches(/^\d{15,19}$/, { message: 'El número de tarjeta debe contener solo dígitos' })
  numeroTarjeta!: string;

  @IsString() @IsNotEmpty()
  nombreTitular!: string;

  @IsString() @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'La fecha de vencimiento debe tener el formato MM/YY' })
  fechaVencimiento!: string;

  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'El CVV debe tener 3 o 4 dígitos' })
  cvv!: string;
}
