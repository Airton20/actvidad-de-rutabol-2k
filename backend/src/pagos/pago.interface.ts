export interface Pago {
  id: number;
  usuarioId: number;
  microId: number;
  monto: number;
  metodo: string;
  codigoTicket: string;
  estado: 'EXITOSO' | 'FALLIDO' | 'PENDIENTE';
  esTrasbordoGratuito: boolean;
  fechaPago: Date;
  microInterno?: string;
  microPlaca?: string;
  lineaNombre?: string;
}
