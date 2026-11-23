export interface Trasbordo {
  id: number;
  microOrigenId: number;
  microDestinoId: number;
  motivo: 'CAMBIO_TURNO' | 'FALLA_MECANICA' | 'EMERGENCIA';
  cantidadPasajeros: number;
  estado: string;
  fecha: Date;
  microOrigenInterno?: string;
  microDestinoInterno?: string;
}
