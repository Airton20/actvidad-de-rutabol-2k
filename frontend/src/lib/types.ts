export type Rol = 'ADMIN' | 'CONDUCTOR' | 'PASAJERO';
export type Categoria = 'GENERAL' | 'ESCOLAR' | 'UNIVERSITARIO' | 'ADULTO_MAYOR';
export type EstadoMicro = 'ACTIVO' | 'MANTENIMIENTO' | 'INACTIVO' | 'EMERGENCIA';

export interface Usuario {
  id: number;
  username: string;
  rol: Rol;
  nombreCompleto?: string;
  categoria: Categoria;
  estudianteValidado?: boolean;
}

export interface Linea { id: number; nombre: string; zona: string; descripcion: string; color: string; }
export interface Micro {
  id: number; placa: string; interno: string; capacidad: number; pasajerosActuales: number;
  estado: EstadoMicro; lineaId: number; latitud: number; longitud: number; distanciaKm?: number;
}
export interface Tarifa { id: number; categoria: Categoria; monto: number; descripcion: string; }
export interface Pago {
  id: number; usuarioId?: number; microId?: number; monto: number; metodo: string;
  codigoTicket: string; estado: string; esTrasbordoGratuito: boolean; fechaPago: string;
  microInterno?: string; microPlaca?: string; lineaNombre?: string;
}
export interface Trasbordo {
  id: number; microOrigenId: number; microDestinoId: number; motivo: string;
  cantidadPasajeros: number; estado: string; fecha: string;
  microOrigenInterno?: string; microDestinoInterno?: string;
}
export interface Notificacion {
  id: number; usuarioId?: number; microId?: number; titulo: string; mensaje: string;
  tipo: 'INFO' | 'EMERGENCIA' | 'TRASBORDO'; leido: boolean; fecha: string;
}

export interface MicroInput { placa: string; interno: string; capacidad: number; estado: EstadoMicro; lineaId: number; latitud?: number; longitud?: number; }
export interface RegisterInput { username: string; password: string; nombreCompleto?: string; rol?: Rol; categoria?: Categoria; codigoRude?: string; codEst?: string; emailUpds?: string; fotoCredencialUrl?: string; }
export interface PagoInput { microId: number; numeroTarjeta: string; nombreTitular: string; fechaVencimiento: string; cvv: string; }
