'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './SessionProvider';
import type { Rol } from '@/lib/types';

export function RoleGuard({ roles, children }: { roles: Rol[]; children: React.ReactNode }) {
  const { usuario, cargando } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (cargando) return;
    if (!usuario) router.replace('/login');
    else if (!roles.includes(usuario.rol)) router.replace(usuario.rol === 'ADMIN' ? '/admin' : usuario.rol === 'CONDUCTOR' ? '/conductor' : '/pasajero');
  }, [usuario, cargando, roles, router]);
  if (cargando) return <p className="contenedor">Cargando sesión...</p>;
  if (!usuario || !roles.includes(usuario.rol)) return null;
  return <>{children}</>;
}
