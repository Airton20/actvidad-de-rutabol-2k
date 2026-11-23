'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Categoria, Rol } from '@/lib/types';

export default function RegistroPage() {
  const [form, setForm] = useState({ username: '', password: '', nombreCompleto: '', rol: 'PASAJERO' as Rol, categoria: 'GENERAL' as Categoria, codigoRude: '', codEst: '', emailUpds: '' });
  const [error, setError] = useState(''); const [ok, setOk] = useState(''); const [loading, setLoading] = useState(false);
  const router = useRouter();
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setOk(''); setLoading(true);
    try {
      await api.register({ ...form, codigoRude: form.codigoRude || undefined, codEst: form.codEst || undefined, emailUpds: form.emailUpds || undefined });
      setOk('Registro exitoso. Ahora puedes iniciar sesión.');
      setTimeout(() => router.push('/login'), 1000);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return <main className="contenedor"><section className="seccion" style={{maxWidth:560,margin:'2rem auto'}}>
    <h1>Registro</h1>
    <form className="panelAcceso" onSubmit={submit}>
      <label>Usuario<input value={form.username} onChange={e=>set('username',e.target.value)} required /></label>
      <label>Contraseña<input type="password" value={form.password} onChange={e=>set('password',e.target.value)} required /></label>
      <label>Nombre completo<input value={form.nombreCompleto} onChange={e=>set('nombreCompleto',e.target.value)} /></label>
      <label>Rol<select value={form.rol} onChange={e=>set('rol',e.target.value)}><option value="PASAJERO">PASAJERO</option><option value="CONDUCTOR">CONDUCTOR</option></select></label>
      <label>Categoría<select value={form.categoria} onChange={e=>set('categoria',e.target.value)}><option value="GENERAL">GENERAL</option><option value="ESCOLAR">ESCOLAR</option><option value="UNIVERSITARIO">UNIVERSITARIO</option><option value="ADULTO_MAYOR">ADULTO_MAYOR</option></select></label>
      {form.categoria === 'ESCOLAR' && <label>Código RUDE<input value={form.codigoRude} onChange={e=>set('codigoRude',e.target.value)} required /></label>}
      {form.categoria === 'UNIVERSITARIO' && <><label>Código Estudiante<input value={form.codEst} onChange={e=>set('codEst',e.target.value)} required /></label><label>Email UPDS<input value={form.emailUpds} onChange={e=>set('emailUpds',e.target.value)} required /></label></>}
      {error && <div className="alerta error">{error}</div>} {ok && <div className="alerta exito">{ok}</div>}
      <button className="boton principal" disabled={loading}>{loading ? 'Registrando...' : 'Registrarse'}</button>
    </form>
  </section></main>;
}
