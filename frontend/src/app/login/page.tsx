'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refrescar } = useSession();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const u = await api.login(username, password);
      await refrescar();
      router.push(u.rol === 'ADMIN' ? '/admin' : u.rol === 'CONDUCTOR' ? '/conductor' : '/pasajero');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return <main className="contenedor"><section className="seccion" style={{maxWidth:480,margin:'2rem auto'}}>
    <h1>Iniciar sesión</h1>
    <form className="panelAcceso" onSubmit={submit}>
      <label>Usuario<input value={username} onChange={e=>setUsername(e.target.value)} required /></label>
      <label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
      {error && <div className="alerta error">{error}</div>}
      <button className="boton principal" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
    </form>
  </section></main>;
}
