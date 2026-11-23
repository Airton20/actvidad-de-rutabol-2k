'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { RoleGuard } from '@/components/RoleGuard';
import type { Linea, Micro, Tarifa, Trasbordo, Notificacion, Usuario, EstadoMicro } from '@/lib/types';

const empty = { placa:'', interno:'', capacidad:20, estado:'ACTIVO' as EstadoMicro, lineaId:1 };
export default function AdminPage() {
  const [lineas, setLineas] = useState<Linea[]>([]); const [micros, setMicros] = useState<Micro[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]); const [pendientes, setPendientes] = useState<Usuario[]>([]);
  const [trasbordos, setTrasbordos] = useState<Trasbordo[]>([]); const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [form, setForm] = useState(empty); const [editId, setEditId] = useState<number|null>(null);
  const [msg, setMsg] = useState(''); const [error, setError] = useState('');
  const cargar = async () => { try { const [l,m,t,p,tr,n] = await Promise.all([api.lineas(), api.micros(), api.tarifas(), api.pendientes(), api.trasbordos(), api.notificaciones()]); setLineas(l); setMicros(m); setTarifas(t); setPendientes(p); setTrasbordos(tr); setNotifs(n); if(!form.lineaId && l[0]) setForm(f=>({...f,lineaId:l[0].id})); } catch(e:any){ setError(e.message); } };
  useEffect(() => { void cargar(); }, []);
  const run = async (fn:()=>Promise<any>, ok:string) => { setError(''); setMsg(''); try { await fn(); setMsg(ok); await cargar(); } catch(e:any){ setError(e.message); } };
  const guardarMicro = async (e: React.FormEvent) => { e.preventDefault(); await run(() => editId ? api.actualizarMicro(editId, form) : api.crearMicro(form), editId ? 'Micro actualizado' : 'Micro creado'); setEditId(null); setForm({ ...empty, lineaId: lineas[0]?.id ?? 1 }); };
  return <RoleGuard roles={['ADMIN']}><main className="contenedor"><section className="seccion"><h1>Panel Administrador</h1>
    {error && <div className="alerta error">{error}</div>} {msg && <div className="alerta exito">{msg}</div>}
    <h2>Micros</h2>
    <form className="formulario" onSubmit={guardarMicro}>
      <label>Placa<input value={form.placa} onChange={e=>setForm({...form,placa:e.target.value})} required /></label>
      <label>Interno<input value={form.interno} onChange={e=>setForm({...form,interno:e.target.value})} required /></label>
      <label>Capacidad<input type="number" min={18} max={25} value={form.capacidad} onChange={e=>setForm({...form,capacidad:Number(e.target.value)})} required /></label>
      <label>Estado<select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value as EstadoMicro})}><option>ACTIVO</option><option>MANTENIMIENTO</option><option>INACTIVO</option><option>EMERGENCIA</option></select></label>
      <label>Línea<select value={form.lineaId} onChange={e=>setForm({...form,lineaId:Number(e.target.value)})}>{lineas.map(l=><option key={l.id} value={l.id}>{l.nombre}</option>)}</select></label>
      <div className="formAcciones"><button className="boton principal">{editId?'Guardar':'Crear'}</button>{editId && <button type="button" className="boton secundario" onClick={()=>{setEditId(null);setForm({ ...empty, lineaId: lineas[0]?.id ?? 1 });}}>Cancelar</button>}</div>
    </form>
    <div className="tablaWrap"><table><thead><tr><th>Interno</th><th>Placa</th><th>Cap</th><th>Ocup.</th><th>Estado</th><th></th></tr></thead><tbody>{micros.map(m=><tr key={m.id}><td>{m.interno}</td><td>{m.placa}</td><td>{m.capacidad}</td><td>{m.pasajerosActuales}</td><td>{m.estado}</td><td className="acciones"><button className="boton secundario" onClick={()=>{setEditId(m.id);setForm({placa:m.placa,interno:m.interno,capacidad:m.capacidad,estado:m.estado,lineaId:m.lineaId});}}>Editar</button><button className="boton peligro" onClick={()=>run(()=>api.eliminarMicro(m.id),'Micro eliminado')}>Eliminar</button></td></tr>)}</tbody></table></div>
    <h2>Tarifas</h2>
    <div className="tablaWrap"><table><thead><tr><th>Categoría</th><th>Monto</th><th></th></tr></thead><tbody>{tarifas.map(t=><tr key={t.id}><td>{t.categoria}</td><td><input type="number" step="0.5" defaultValue={t.monto} onBlur={e=>run(()=>api.actualizarTarifa(t.id,Number(e.target.value)),'Tarifa actualizada')} /></td><td>{t.descripcion}</td></tr>)}</tbody></table></div>
    <h2>Estudiantes pendientes</h2>
    <div className="tablaWrap"><table><thead><tr><th>Usuario</th><th>Nombre</th><th>Categoría</th><th></th></tr></thead><tbody>{pendientes.map(u=><tr key={u.id}><td>{u.username}</td><td>{u.nombreCompleto}</td><td>{u.categoria}</td><td className="acciones"><button className="boton principal" onClick={()=>run(()=>api.validarEstudiante(u.id,true),'Estudiante validado')}>Aprobar</button><button className="boton peligro" onClick={()=>run(()=>api.validarEstudiante(u.id,false),'Estudiante rechazado')}>Rechazar</button></td></tr>)}{!pendientes.length&&<tr><td colSpan={4} className="vacio">Sin pendientes</td></tr>}</tbody></table></div>
    <div className="grid2"><div><h2>Trasbordos</h2><div className="tablaWrap"><table><thead><tr><th>Origen</th><th>Destino</th><th>Motivo</th></tr></thead><tbody>{trasbordos.map(t=><tr key={t.id}><td>{t.microOrigenInterno}</td><td>{t.microDestinoInterno}</td><td>{t.motivo}</td></tr>)}</tbody></table></div></div>
    <div><h2>Notificaciones</h2><div className="tablaWrap"><table><thead><tr><th>Título</th><th>Tipo</th></tr></thead><tbody>{notifs.map(n=><tr key={n.id}><td>{n.titulo}</td><td>{n.tipo}</td></tr>)}</tbody></table></div></div></div>
  </section></main></RoleGuard>;
}
