'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Linea, Micro } from '@/lib/types';

export default function Home() {
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [micros, setMicros] = useState<Micro[]>([]);
  const [cercanos, setCercanos] = useState<Micro[]>([]);
  const [lat, setLat] = useState('-17.7833');
  const [lng, setLng] = useState('-63.1821');
  const [radio, setRadio] = useState('5');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { Promise.all([api.lineas(), api.micros()]).then(([l, m]) => { setLineas(l); setMicros(m); }).catch((e) => setError(e.message)); }, []);
  const buscarCercanos = async () => {
    setError(''); setMsg('');
    try { const data = await api.microsCercanos(parseFloat(lat), parseFloat(lng), parseFloat(radio) || 5); setCercanos(data); setMsg(`${data.length} micro(s) encontrados.`); }
    catch (e: any) { setError(e.message); }
  };
  const miUbicacion = () => navigator.geolocation.getCurrentPosition((p) => { setLat(String(p.coords.latitude)); setLng(String(p.coords.longitude)); }, () => setError('No se pudo obtener tu ubicación'));

  return <main className="contenedor">
    <section className="hero" style={{borderRadius:12,marginTop:'1rem'}}><div className="contenedor">
      <div className="etiqueta">RUTABOL SCZ</div><h1>Sistema Inteligente de Transporte Urbano</h1>
      <p>Explora líneas, localiza micros cercanos y gestiona tus boletos.</p>
      <div className="heroacciones"><Link className="boton principal" href="/registro">Registrarse</Link><Link className="boton claro" href="/login">Ingresar</Link></div>
    </div></section>
    {error && <div className="alerta error">{error}</div>} {msg && <div className="alerta exito">{msg}</div>}
    <section className="seccion"><div className="seccionTitulo"><h2>Líneas disponibles</h2><span className="contador">{lineas.length} líneas</span></div>
      <div className="tarjetas">{lineas.map((l) => <article className="tarjeta" key={l.id} style={{borderTopColor:l.color}}><div className="tarjetaIcono" style={{backgroundColor:l.color}}>L{l.id}</div><h3>{l.nombre}</h3><div className="zona">{l.zona}</div><p>{l.descripcion}</p><span className="chip">{micros.filter(m=>m.lineaId===l.id).length} micros</span></article>)}</div>
    </section>
    <section className="seccion"><h2>Micros cercanos (radio 5 km)</h2>
      <div className="filtros">
        <label className="campo">Latitud<input value={lat} onChange={e=>setLat(e.target.value)} /></label>
        <label className="campo">Longitud<input value={lng} onChange={e=>setLng(e.target.value)} /></label>
        <label className="campo">Radio km<input value={radio} onChange={e=>setRadio(e.target.value)} /></label>
        <button className="boton secundario" onClick={miUbicacion} type="button">Usar mi ubicación</button>
        <button className="boton principal" onClick={buscarCercanos} type="button">Buscar</button>
      </div>
      <div className="tablaWrap"><table><thead><tr><th>Interno</th><th>Placa</th><th>Línea</th><th>Capacidad</th><th>Pasajeros</th><th>Distancia</th></tr></thead><tbody>
        {cercanos.map(m => <tr key={m.id}><td>{m.interno}</td><td>{m.placa}</td><td>{lineas.find(l=>l.id===m.lineaId)?.nombre ?? m.lineaId}</td><td>{m.capacidad}</td><td>{m.pasajerosActuales}</td><td>{m.distanciaKm} km</td></tr>)}
        {!cercanos.length && <tr><td colSpan={6} className="vacio">Busca micros cercanos por ubicación.</td></tr>}
      </tbody></table></div>
    </section>
  </main>;
}
