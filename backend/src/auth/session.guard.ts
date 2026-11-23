import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.session?.usuarioId) throw new UnauthorizedException('Debe iniciar sesión');
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.session?.usuarioId) throw new UnauthorizedException('Debe iniciar sesión');
    if (req.session.rol !== 'ADMIN') throw new ForbiddenException('Requiere rol de Administrador');
    return true;
  }
}
