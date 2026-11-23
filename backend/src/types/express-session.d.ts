import 'express-session';

declare module 'express-session' {
  interface SessionData {
    usuarioId: number;
    username: string;
    rol: 'ADMIN' | 'CONDUCTOR' | 'PASAJERO';
    categoria: 'GENERAL' | 'ESCOLAR' | 'UNIVERSITARIO' | 'ADULTO_MAYOR';
    nombreCompleto?: string;
    estudianteValidado?: boolean;
  }
}
