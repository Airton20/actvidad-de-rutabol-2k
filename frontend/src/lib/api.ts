import type { Linea, Micro, MicroInput, Notificacion, Pago, PagoInput, RegisterInput, Tarifa, Trasbordo, Usuario } from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...options,
      cache: 'no-store',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new Error('No se puede conectar con NestJS. Comprueba que el backend esté ejecutándose en el puerto 3001.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = Array.isArray(body?.message) ? body.message.join('; ') : body?.message;
    throw new Error(detail || `Error HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string) => request<Usuario>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (data: RegisterInput) => request<Usuario>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<Usuario>('/auth/me'),
  logout: () => request<{ mensaje: string }>('/auth/logout', { method: 'POST' }),
  pendientes: () => request<Usuario[]>('/auth/pendientes'),
  validarEstudiante: (id: number, aprobado: boolean) => request<{ mensaje: string }>(`/auth/validar-estudiante/${id}`, { method: 'PATCH', body: JSON.stringify({ aprobado }) }),

  lineas: () => request<Linea[]>('/lineas'),
  micros: () => request<Micro[]>('/micros'),
  microsCercanos: (lat: number, lng: number, radio = 5) => request<Micro[]>(`/micros/cercanos?lat=${lat}&lng=${lng}&radio=${radio}`),
  crearMicro: (data: MicroInput) => request<Micro>('/micros', { method: 'POST', body: JSON.stringify(data) }),
  actualizarMicro: (id: number, data: Partial<MicroInput>) => request<Micro>(`/micros/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  eliminarMicro: (id: number) => request<void>(`/micros/${id}`, { method: 'DELETE' }),
  actualizarPasajeros: (id: number, accion: 'SUBIR' | 'BAJAR', cantidad: number) => request<Micro>(`/micros/${id}/pasajeros`, { method: 'PATCH', body: JSON.stringify({ accion, cantidad }) }),
  actualizarUbicacion: (id: number, latitud: number, longitud: number) => request<Micro>(`/micros/${id}/ubicacion`, { method: 'PATCH', body: JSON.stringify({ latitud, longitud }) }),

  tarifas: () => request<Tarifa[]>('/tarifas'),
  actualizarTarifa: (id: number, monto: number) => request<Tarifa>(`/tarifas/${id}`, { method: 'PATCH', body: JSON.stringify({ monto }) }),

  pagar: (data: PagoInput) => request<Pago>('/pagos/pagar', { method: 'POST', body: JSON.stringify(data) }),
  misPagos: () => request<Pago[]>('/pagos/mis-pagos'),
  verificarTicket: (codigo: string) => request<{ valido: boolean; detalle: any }>(`/pagos/verificar/${encodeURIComponent(codigo)}`),

  trasbordos: () => request<Trasbordo[]>('/trasbordos'),
  crearTrasbordo: (data: { microOrigenId: number; microDestinoId: number; motivo: string; cantidadPasajeros?: number }) => request<Trasbordo>('/trasbordos', { method: 'POST', body: JSON.stringify(data) }),

  notificaciones: () => request<Notificacion[]>('/notificaciones'),
  marcarNotificacionLeida: (id: number) => request<void>(`/notificaciones/${id}/leido`, { method: 'PATCH' }),
};
