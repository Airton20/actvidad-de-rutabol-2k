import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @IsNotEmpty()
  username!: string;

  @IsString() @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  @IsOptional() @IsString()
  nombreCompleto?: string;

  @IsOptional() @IsIn(['ADMIN', 'CONDUCTOR', 'PASAJERO'])
  rol?: 'ADMIN' | 'CONDUCTOR' | 'PASAJERO';

  @IsOptional() @IsIn(['GENERAL', 'ESCOLAR', 'UNIVERSITARIO', 'ADULTO_MAYOR'])
  categoria?: 'GENERAL' | 'ESCOLAR' | 'UNIVERSITARIO' | 'ADULTO_MAYOR';

  @IsOptional() @IsString()
  codigoRude?: string;

  @IsOptional() @IsString()
  codEst?: string;

  @IsOptional() @IsEmail({}, { message: 'Debe ser un formato de correo válido' })
  emailUpds?: string;

  @IsOptional() @IsString()
  fotoCredencialUrl?: string;
}
