export type EstadoMicro = 'ACTIVO' | 'MANTENIMIENTO' | 'INACTIVO' | 'EMERGENCIA';

export interface Micro {
  id: number;
  placa: string;
  interno: string;
  capacidad: number;
  pasajerosActuales: number;
  estado: EstadoMicro;
  lineaId: number;
  conductorId?: number | null;
  latitud: number;
  longitud: number;
  ultimaActualizacionGeo?: Date;
  distanciaKm?: number;
}
