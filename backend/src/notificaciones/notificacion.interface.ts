export interface Notificacion {
  id: number;
  usuarioId?: number | null;
  microId?: number | null;
  titulo: string;
  mensaje: string;
  tipo: 'INFO' | 'EMERGENCIA' | 'TRASBORDO';
  leido: boolean;
  fecha: Date;
}
