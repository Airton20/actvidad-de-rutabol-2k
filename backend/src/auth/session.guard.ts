import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

function requireSession(req: Request) {
  if (!req.session?.usuarioId) throw new UnauthorizedException('Debe iniciar sesión');
}

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    requireSession(req);
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    requireSession(req);
    if (req.session.rol !== 'ADMIN') throw new ForbiddenException('Requiere rol de Administrador');
    return true;
  }
}

@Injectable()
export class ConductorOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    requireSession(req);
    if (req.session.rol !== 'ADMIN' && req.session.rol !== 'CONDUCTOR') {
      throw new ForbiddenException('Requiere rol de Conductor o Administrador');
    }
    return true;
  }
}
