'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import type { Usuario } from '@/lib/types';

type SessionCtx = { usuario: Usuario | null; cargando: boolean; refrescar: () => Promise<void>; logout: () => Promise<void>; };
const Ctx = createContext<SessionCtx>({ usuario: null, cargando: true, refrescar: async () => {}, logout: async () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const refrescar = async () => {
    try { setUsuario(await api.me()); } catch { setUsuario(null); } finally { setCargando(false); }
  };
  useEffect(() => { void refrescar(); }, []);
  const logout = async () => { try { await api.logout(); } finally { setUsuario(null); } };
  return <Ctx.Provider value={{ usuario, cargando, refrescar, logout }}>{children}</Ctx.Provider>;
}
export const useSession = () => useContext(Ctx);
