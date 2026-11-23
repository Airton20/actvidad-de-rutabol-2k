'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/RoleGuard';
import type { Micro, Notificacion, Trasbordo } from '@/lib/types';

export default function ConductorPage() {
  const [micros, setMicros] = useState<Micro[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [cantidad, setCantidad] = useState(1);
  const [lat, setLat] = useState(''); const [lng, setLng] = useState('');
  const [ticket, setTicket] = useState(''); const [verif, setVerif] = useState<any>(null);
  const [trasbordos, setTrasbordos] = useState<Trasbordo[]>([]);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [t, setT] = useState({ microOrigenId: '', microDestinoId: '', motivo: 'CAMBIO_TURNO', cantidadPasajeros: '' });
  const [msg, setMsg] = useState(''); const [error, setError] = useState('');
  const cargar = async () => { try { const [m, tr, n] = await Promise.all([api.micros(), api.trasbordos(), api.notificaciones()]); setMicros(m); setTrasbordos(tr); setNotifs(n); if(!selected && m[0]) setSelected(m[0].id); } catch(e:any){ setError(e.message); } };
  useEffect(() => { void cargar(); }, []);
  const micro = micros.find(m => m.id === selected);
  const run = async (fn: () => Promise<any>, ok: string) => { setError(''); setMsg(''); try { await fn(); setMsg(ok); await cargar(); } catch(e:any){ setError(e.message); } };
  return <RoleGuard roles={['CONDUCTOR','ADMIN']}><main className="contenedor"><section className="seccion"><h1>Panel Conductor</h1>
    {error && <div className="alerta error">{error}</div>} {msg && <div className="alerta exito">{msg}</div>}
    <div className="grid2">
      <div><h2>Operación del micro</h2>
        <label className="campo">Micro<select value={selected} onChange={e=>setSelected(Number(e.target.value))}>{micros.map(m=><option key={m.id} value={m.id}>{m.interno} - {m.placa} ({m.pasajerosActuales}/{m.capacidad})</option>)}</select></label>
        <div className="filtros"><input type="number" min={1} value={cantidad} onChange={e=>setCantidad(Number(e.target.value))} /><button className="boton principal" onClick={()=>run(()=>api.actualizarPasajeros(selected,'SUBIR',cantidad),'Pasajeros subidos')}>Subir</button><button className="boton secundario" onClick={()=>run(()=>api.actualizarPasajeros(selected,'BAJAR',cantidad),'Pasajeros bajaron')}>Bajar</button></div>
        <div className="filtros"><input placeholder="Latitud" value={lat} onChange={e=>setLat(e.target.value)} /><input placeholder="Longitud" value={lng} onChange={e=>setLng(e.target.value)} /><button className="boton principal" onClick={()=>run(()=>api.actualizarUbicacion(selected,parseFloat(lat),parseFloat(lng)),'Ubicación actualizada')}>Actualizar GPS</button></div>
        {micro && <p>Estado: <span className={`estado ${micro.estado.toLowerCase()}`}>{micro.estado}</span> | Ocupación: {micro.pasajerosActuales}/{micro.capacidad}</p>}
      </div>
      <div><h2>Verificar ticket</h2><div className="filtros"><input value={ticket} onChange={e=>setTicket(e.target.value)} placeholder="Código ticket" /><button className="boton principal" onClick={async()=>{setError('');try{setVerif(await api.verificarTicket(ticket));}catch(e:any){setError(e.message);}}}>Verificar</button></div>{verif && <pre className="seccion">{JSON.stringify(verif.detalle,null,2)}</pre>}</div>
    </div>
    <h2>Crear trasbordo</h2>
    <div className="formulario"><label>Origen ID<input value={t.microOrigenId} onChange={e=>setT({...t,microOrigenId:e.target.value})} /></label><label>Destino ID<input value={t.microDestinoId} onChange={e=>setT({...t,microDestinoId:e.target.value})} /></label><label>Motivo<select value={t.motivo} onChange={e=>setT({...t,motivo:e.target.value})}><option>CAMBIO_TURNO</option><option>FALLA_MECANICA</option><option>EMERGENCIA</option></select></label><label>Cantidad<input value={t.cantidadPasajeros} onChange={e=>setT({...t,cantidadPasajeros:e.target.value})} /></label><div className="formAcciones"><button className="boton principal" onClick={()=>run(()=>api.crearTrasbordo({microOrigenId:Number(t.microOrigenId),microDestinoId:Number(t.microDestinoId),motivo:t.motivo,cantidadPasajeros:t.cantidadPasajeros?Number(t.cantidadPasajeros):undefined}),'Trasbordo creado')}>Crear trasbordo</button></div></div>
    <h2>Trasbordos / Notificaciones</h2>
    <div className="grid2"><div className="tablaWrap"><table><thead><tr><th>Origen</th><th>Destino</th><th>Motivo</th><th>Cant.</th></tr></thead><tbody>{trasbordos.map(x=><tr key={x.id}><td>{x.microOrigenInterno}</td><td>{x.microDestinoInterno}</td><td>{x.motivo}</td><td>{x.cantidadPasajeros}</td></tr>)}</tbody></table></div>
    <div className="tablaWrap"><table><thead><tr><th>Título</th><th>Mensaje</th></tr></thead><tbody>{notifs.map(n=><tr key={n.id}><td>{n.titulo}</td><td>{n.mensaje}</td></tr>)}</tbody></table></div></div>
  </section></main></RoleGuard>;
}
