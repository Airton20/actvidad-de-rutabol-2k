import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AdminGuard } from './session.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const usuario = await this.auth.validar(dto.username, dto.password);
    await new Promise<void>((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
    req.session.usuarioId = usuario.id;
    req.session.username = usuario.username;
    req.session.rol = usuario.rol;
    req.session.categoria = usuario.categoria;
    req.session.nombreCompleto = usuario.nombreCompleto;
    req.session.estudianteValidado = usuario.estudianteValidado;
    await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));
    return usuario;
  }

  @Get('me')
  async me(@Req() req: Request) {
    if (!req.session?.usuarioId) throw new UnauthorizedException('No existe sesiÃ³n activa');
    return this.auth.obtenerUsuario(req.session.usuarioId);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await new Promise<void>((resolve, reject) => req.session.destroy((err) => (err ? reject(err) : resolve())));
    res.clearCookie('micros.sid', { path: '/', httpOnly: true, sameSite: 'lax', secure: false });
    return { mensaje: 'SesiÃ³n finalizada' };
  }

  @Get('pendientes')
  @UseGuards(AdminGuard)
  pendientes() { return this.auth.pendientesValidacion(); }

  @Patch('validar-estudiante/:id')
  @UseGuards(AdminGuard)
  validarEstudiante(@Param('id', ParseIntPipe) id: number, @Body('aprobado') aprobado: boolean = true) {
    return this.auth.validarEstudiante(id, aprobado);
  }
}
