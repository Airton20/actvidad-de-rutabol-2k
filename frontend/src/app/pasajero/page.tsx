'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/RoleGuard';
import type { Micro, Pago, Notificacion, Linea } from '@/lib/types';

export default function PasajeroPage() {
  const [tab, setTab] = useState('cercanos');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [cercanos, setCercanos] = useState<Micro[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [lat, setLat] = useState('-17.7833'); const [lng, setLng] = useState('-63.1821');
  const [pago, setPago] = useState({ microId: '', numeroTarjeta: '', nombreTitular: '', fechaVencimiento: '', cvv: '' });
  const [ticket, setTicket] = useState(''); const [verif, setVerif] = useState<any>(null);
  const [msg, setMsg] = useState(''); const [error, setError] = useState('');

  const cargar = async () => { try { const [l,p,n] = await Promise.all([api.lineas(), api.misPagos(), api.notificaciones()]); setLineas(l); setPagos(p); setNotifs(n); } catch(e:any){ setError(e.message); } };
  useEffect(() => { void cargar(); }, []);
  const buscar = async () => { setError(''); try { setCercanos(await api.microsCercanos(parseFloat(lat), parseFloat(lng), 5)); } catch(e:any){ setError(e.message);} };
  const pagar = async (e: React.FormEvent) => { e.preventDefault(); setError(''); setMsg('');
    try { const r = await api.pagar({ microId: Number(pago.microId), numeroTarjeta: pago.numeroTarjeta, nombreTitular: pago.nombreTitular, fechaVencimiento: pago.fechaVencimiento, cvv: pago.cvv }); setMsg(`Pago exitoso. Ticket: ${r.codigoTicket} - Bs. ${r.monto}`); setPago({ microId:'', numeroTarjeta:'', nombreTitular:'', fechaVencimiento:'', cvv:'' }); await cargar(); } catch(e:any){ setError(e.message);} };
  const verificar = async () => { setError(''); setVerif(null); try { setVerif(await api.verificarTicket(ticket)); } catch(e:any){ setError(e.message);} };
  const leer = async (id:number) => { await api.marcarNotificacionLeida(id); await cargar(); };

  return <RoleGuard roles={['PASAJERO']}><main className="contenedor"><section className="seccion"><h1>Panel Pasajero</h1>
    <div className="tabs">{['cercanos','pagar','mis-pagos','verificar','notificaciones'].map(t => <button key={t} className={`tab ${tab===t?'activa':''}`} onClick={()=>setTab(t)}>{t}</button>)}</div>
    {error && <div className="alerta error">{error}</div>} {msg && <div className="alerta exito">{msg}</div>}
    {tab==='cercanos' && <><div className="filtros"><input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Lat" /><input value={lng} onChange={e=>setLng(e.target.value)} placeholder="Lng" /><button className="boton principal" onClick={buscar}>Buscar 5km</button></div>
      <div className="tablaWrap"><table><thead><tr><th>Interno</th><th>Línea</th><th>Distancia</th><th>Ocupación</th></tr></thead><tbody>{cercanos.map(m=><tr key={m.id}><td>{m.interno}</td><td>{lineas.find(l=>l.id===m.lineaId)?.nombre}</td><td>{m.distanciaKm} km</td><td>{m.pasajerosActuales}/{m.capacidad}</td></tr>)}{!cercanos.length&&<tr><td colSpan={4} className="vacio">Sin resultados</td></tr>}</tbody></table></div></>}
    {tab==='pagar' && <form className="formulario" onSubmit={pagar}><label>Micro ID<input value={pago.microId} onChange={e=>setPago({...pago,microId:e.target.value})} required /></label><label>Número tarjeta<input value={pago.numeroTarjeta} onChange={e=>setPago({...pago,numeroTarjeta:e.target.value})} required /></label><label>Titular<input value={pago.nombreTitular} onChange={e=>setPago({...pago,nombreTitular:e.target.value})} required /></label><label>Vencimiento<input value={pago.fechaVencimiento} onChange={e=>setPago({...pago,fechaVencimiento:e.target.value})} placeholder="MM/YY" required /></label><label>CVV<input value={pago.cvv} onChange={e=>setPago({...pago,cvv:e.target.value})} required /></label><div className="formAcciones"><button className="boton principal">Pagar</button></div></form>}
    {tab==='mis-pagos' && <div className="tablaWrap"><table><thead><tr><th>Ticket</th><th>Monto</th><th>Micro</th><th>Fecha</th><th>Trasbordo</th></tr></thead><tbody>{pagos.map(p=><tr key={p.id}><td>{p.codigoTicket}</td><td>Bs. {p.monto}</td><td>{p.microInterno}</td><td>{new Date(p.fechaPago).toLocaleString()}</td><td>{p.esTrasbordoGratuito?'Sí':'No'}</td></tr>)}{!pagos.length&&<tr><td colSpan={5} className="vacio">Sin pagos</td></tr>}</tbody></table></div>}
    {tab==='verificar' && <><div className="filtros"><input value={ticket} onChange={e=>setTicket(e.target.value)} placeholder="Código ticket" /><button className="boton principal" onClick={verificar}>Verificar</button></div>{verif && <pre className="seccion">{JSON.stringify(verif.detalle,null,2)}</pre>}</>}
    {tab==='notificaciones' && <div className="tablaWrap"><table><thead><tr><th>Título</th><th>Mensaje</th><th>Tipo</th><th></th></tr></thead><tbody>{notifs.map(n=><tr key={n.id}><td>{n.titulo}</td><td>{n.mensaje}</td><td>{n.tipo}</td><td>{!n.leido && <button className="boton secundario" onClick={()=>leer(n.id)}>Marcar leída</button>}</td></tr>)}{!notifs.length&&<tr><td colSpan={4} className="vacio">Sin notificaciones</td></tr>}</tbody></table></div>}
  </section></main></RoleGuard>;
}
