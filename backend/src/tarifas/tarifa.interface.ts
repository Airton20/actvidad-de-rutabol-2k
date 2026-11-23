export type CategoriaPasajero = 'GENERAL' | 'ESCOLAR' | 'UNIVERSITARIO' | 'ADULTO_MAYOR';

export interface Tarifa {
  id: number;
  categoria: CategoriaPasajero;
  monto: number;
  descripcion: string;
}
