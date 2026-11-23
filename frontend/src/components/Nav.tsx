'use client';
import Link from 'next/link';
import { useSession } from './SessionProvider';
import { useRouter } from 'next/navigation';

export function Nav() {
  const { usuario, cargando, logout } = useSession();
  const router = useRouter();
  const panel = usuario?.rol === 'ADMIN' ? '/admin' : usuario?.rol === 'CONDUCTOR' ? '/conductor' : '/pasajero';
  return (
    <header className="cabecera"><div className="contenedor nav">
      <Link href="/" className="marca"><span className="simbolo">R</span><div><strong>Rutabol SCZ</strong><small>Transporte Urbano</small></div></Link>
      <nav>
        <Link href="/">Inicio</Link>
        {!cargando && usuario ? (
          <>
            <Link href={panel}>Panel</Link>
            <button className="boton secundario" onClick={async () => { await logout(); router.push('/'); }}>Salir ({usuario.username})</button>
          </>
        ) : !cargando ? (<><Link href="/login">Ingresar</Link><Link href="/registro">Registro</Link></>) : null}
      </nav>
    </div></header>
  );
}
