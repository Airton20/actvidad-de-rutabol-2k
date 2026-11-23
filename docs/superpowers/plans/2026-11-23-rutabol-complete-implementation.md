# Rutabol 1 Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar Rutabol-SCZ para que backend, frontend y documentación coincidan con el README/GUIA_CLASE, con rutas por rol, permisos alineados y ejecución local con DB en Docker.

**Architecture:** Mantener monorepo existente (`backend` NestJS, `frontend` Next.js App Router, `database` PostgreSQL). Backend es fuente de verdad con sesiones cookie y guards por rol; frontend consume `/api` con `credentials: 'include'` y protege rutas por rol en UI. DB local por Docker Compose; Supabase sigue soportado por `DATABASE_URL` SSL condicional.

**Tech Stack:** NestJS 11, TypeScript, pg, express-session/connect-pg-simple, bcryptjs, class-validator; Next.js 15, React 19, TypeScript; PostgreSQL 17 Docker.

**Spec:** `docs/superpowers/specs/2026-11-23-rutabol-complete-implementation-design.md`

## Global Constraints

- DB en Docker (`compose.yaml`) + backend/frontend locales con npm.
- No guardar tarjeta completa ni CVV; solo método enmascarado/ticket.
- Capacidad micro: DB `CHECK (capacidad BETWEEN 18 AND 25)` y `pasajeros_actuales <= capacidad`.
- Haversine para cercanos en SQL, radio por defecto 5 km.
- Trasbordo gratuito: mismo usuario, pago reciente en micro origen, trasbordo a micro destino dentro de 2 horas => `monto 0.00`, `es_trasbordo_gratuito=true`.
- Autorización real en backend; UI solo oculta/guía.
- Mantener endpoints del README y alinear permisos: micros CRUD/tarifas PATCH/validar estudiante = ADMIN; pasajeros/ubicacion/trasbordos = CONDUCTOR o ADMIN.

## Review Focus

- **Sesión/rol perdido en UI**: tras refresh, `GET /auth/me` debe restaurar sesión; rutas protegidas redirigen a `/login` sin bucles.
- **Permisos backend**: un PASAJERO no debe poder crear micros, editar tarifas, validar estudiantes, ni modificar pasajeros/ubicación; esperar 401/403.
- **Trasbordo gratuito**: pago en micro origen + trasbordo a destino dentro de 2h debe generar siguiente pago en destino con `monto 0` y `esTrasbordoGratuito=true`.
- **Capacidad**: subir pasajeros por encima de capacidad o crear/editar micro fuera de 18-25 debe fallar con 400/validación, no corromper datos.
- **Credenciales sensibles en docs/env**: README/GUIA no deben incluir DATABASE_URL real, SESSION_SECRET real ni contraseñas reales; `.env.example` usa placeholders.

---

### Task 1: Guardas de rol y matriz de permisos backend

**Files:**
- Modify: `backend/src/auth/session.guard.ts`
- Modify: `backend/src/micros/micros.controller.ts`
- Modify: `backend/src/tarifas/tarifas.controller.ts`
- Modify: `backend/src/trasbordos/trasbordos.controller.ts`
- Modify: `backend/src/notificaciones/notificaciones.controller.ts`

**Interfaces:**
- Consumes: `req.session.usuarioId`, `req.session.rol` de express-session.
- Produces: `AdminGuard`, `SessionGuard`, `ConductorOrAdminGuard` exportados desde `session.guard.ts`; controllers aplican matriz de permisos del spec.

- [ ] **Step 1: Actualizar `backend/src/auth/session.guard.ts`**

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

function requireSession(req: Request) {
  if (!req.session?.usuarioId) throw new UnauthorizedException('Debe iniciar sesión');
}

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    requireSession(req);
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    requireSession(req);
    if (req.session.rol !== 'ADMIN') throw new ForbiddenException('Requiere rol de Administrador');
    return true;
  }
}

@Injectable()
export class ConductorOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    requireSession(req);
    if (req.session.rol !== 'ADMIN' && req.session.rol !== 'CONDUCTOR') {
      throw new ForbiddenException('Requiere rol de Conductor o Administrador');
    }
    return true;
  }
}
```

- [ ] **Step 2: Actualizar `backend/src/micros/micros.controller.ts`**

```ts
import { Body, Controller, Delete, Get, HttpCode, Param, ParseFloatPipe, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MicrosService } from './micros.service';
import { CreateMicroDto } from './dto/create-micro.dto';
import { UpdateMicroDto } from './dto/update-micro.dto';
import { ActualizarPasajerosDto } from './dto/actualizar-pasajeros.dto';
import { ActualizarUbicacionDto } from './dto/actualizar-ubicacion.dto';
import { AdminGuard, ConductorOrAdminGuard } from '../auth/session.guard';

@Controller('micros')
export class MicrosController {
  constructor(private readonly service: MicrosService) {}

  @Get('cercanos')
  findCercanos(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radio') radio?: string,
  ) {
    const radioKm = radio ? parseFloat(radio) : 5;
    return this.service.findCercanos(lat, lng, radioKm);
  }

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Patch(':id/pasajeros')
  @UseGuards(ConductorOrAdminGuard)
  actualizarPasajeros(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarPasajerosDto) {
    return this.service.actualizarPasajeros(id, dto);
  }

  @Patch(':id/ubicacion')
  @UseGuards(ConductorOrAdminGuard)
  actualizarUbicacion(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarUbicacionDto) {
    return this.service.actualizarUbicacion(id, dto);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateMicroDto) { return this.service.create(dto); }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMicroDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
```

- [ ] **Step 3: Actualizar `backend/src/tarifas/tarifas.controller.ts`**

```ts
import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { IsNumber, Min } from 'class-validator';
import { TarifasService } from './tarifas.service';
import { AdminGuard } from '../auth/session.guard';

class UpdateTarifaDto {
  @IsNumber()
  @Min(0)
  monto!: number;
}

@Controller('tarifas')
export class TarifasController {
  constructor(private readonly service: TarifasService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTarifaDto) {
    return this.service.update(id, dto.monto);
  }
}
```

- [ ] **Step 4: Actualizar `backend/src/trasbordos/trasbordos.controller.ts`**

```ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TrasbordosService } from './trasbordos.service';
import { CreateTrasbordoDto } from './dto/create-trasbordo.dto';
import { ConductorOrAdminGuard } from '../auth/session.guard';

@Controller('trasbordos')
export class TrasbordosController {
  constructor(private readonly service: TrasbordosService) {}

  @Post()
  @UseGuards(ConductorOrAdminGuard)
  crear(@Body() dto: CreateTrasbordoDto) { return this.service.crear(dto); }

  @Get()
  @UseGuards(ConductorOrAdminGuard)
  findAll() { return this.service.findAll(); }
}
```

- [ ] **Step 5: Actualizar `backend/src/notificaciones/notificaciones.controller.ts`**

```ts
import { Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { SessionGuard } from '../auth/session.guard';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}

  @Get()
  @UseGuards(SessionGuard)
  findAll() { return this.service.findAll(); }

  @Patch(':id/leido')
  @UseGuards(SessionGuard)
  marcarLeida(@Param('id', ParseIntPipe) id: number) { return this.service.marcarLeida(id); }
}
```

- [ ] **Step 6: Verificar compilación backend**

Run: `cd H:\Rutabol-1-main\Rutabol-1-main\backend; npm run build`  
Expected: build exitoso sin errores TypeScript.

- [ ] **Step 7: Commit**

```bash
git add backend/src/auth/session.guard.ts backend/src/micros/micros.controller.ts backend/src/tarifas/tarifas.controller.ts backend/src/trasbordos/trasbordos.controller.ts backend/src/notificaciones/notificaciones.controller.ts
git commit -m "feat: alinear guards y permisos por rol"
```

### Task 2: Contratos auth/frontend y endpoint de usuarios pendientes

**Files:**
- Modify: `backend/src/auth/auth.service.ts`
- Modify: `backend/src/auth/auth.controller.ts`
- Modify: `backend/src/auth/dto/register.dto.ts`
- Modify: `backend/src/types/express-session.d.ts`

**Interfaces:**
- Produces: `GET /api/auth/me` devuelve `{id, username, rol, categoria, nombreCompleto, estudianteValidado}`; `GET /api/auth/pendientes` (ADMIN) lista estudiantes no validados.

- [ ] **Step 1: Actualizar `backend/src/types/express-session.d.ts`**

```ts
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    usuarioId: number;
    username: string;
    rol: 'ADMIN' | 'CONDUCTOR' | 'PASAJERO';
    categoria: 'GENERAL' | 'ESCOLAR' | 'UNIVERSITARIO' | 'ADULTO_MAYOR';
    nombreCompleto?: string;
    estudianteValidado?: boolean;
  }
}
```

- [ ] **Step 2: Actualizar `backend/src/auth/auth.service.ts`**

```ts
import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/register.dto';

export interface UsuarioInfo {
  id: number;
  username: string;
  rol: 'ADMIN' | 'CONDUCTOR' | 'PASAJERO';
  nombreCompleto?: string;
  categoria: 'GENERAL' | 'ESCOLAR' | 'UNIVERSITARIO' | 'ADULTO_MAYOR';
  estudianteValidado: boolean;
}

interface UsuarioRow {
  id: number;
  username: string;
  password_hash: string;
  rol: 'ADMIN' | 'CONDUCTOR' | 'PASAJERO';
  nombre_completo?: string;
  categoria: 'GENERAL' | 'ESCOLAR' | 'UNIVERSITARIO' | 'ADULTO_MAYOR';
  estudiante_validado: boolean;
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'Admin123456!';
    try {
      const hashSeguro = await hash(password, 12);
      await this.db.query(
        `INSERT INTO usuarios (username, password_hash, rol, nombre_completo, categoria, estudiante_validado)
         VALUES ($1, $2, 'ADMIN', 'Administrador General', 'GENERAL', TRUE)
         ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [username, hashSeguro],
      );
    } catch {
      // Ignorar si la base de datos no está levantada al arrancar
    }
  }

  async register(dto: RegisterDto): Promise<UsuarioInfo> {
    const categoria = dto.categoria || 'GENERAL';
    if (categoria === 'UNIVERSITARIO') {
      if (!dto.emailUpds || !dto.emailUpds.toLowerCase().endsWith('@upds.edu.bo')) {
        throw new BadRequestException('Para categoría universitaria, el correo debe terminar en @upds.edu.bo');
      }
      if (!dto.codEst) throw new BadRequestException('Para categoría universitaria, debe registrar su código de estudiante codEst');
    }
    if (categoria === 'ESCOLAR' && !dto.codigoRude) {
      throw new BadRequestException('Para categoría escolar, debe registrar su código RUDE');
    }

    const hashPassword = await hash(dto.password, 10);
    try {
      const rows = await this.db.query<UsuarioRow>(
        `INSERT INTO usuarios
         (username, password_hash, rol, nombre_completo, categoria, codigo_rude, cod_est, email_upds, foto_credencial_url, estudiante_validado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, username, rol, nombre_completo, categoria, estudiante_validado`,
        [
          dto.username.trim(), hashPassword, dto.rol || 'PASAJERO', dto.nombreCompleto || null,
          categoria, dto.codigoRude || null, dto.codEst || null, dto.emailUpds || null,
          dto.fotoCredencialUrl || null, categoria === 'GENERAL' || categoria === 'ADULTO_MAYOR',
        ],
      );
      const u = rows[0];
      return { id: u.id, username: u.username, rol: u.rol, nombreCompleto: u.nombre_completo, categoria: u.categoria, estudianteValidado: u.estudiante_validado };
    } catch (error: any) {
      if (error?.code === '23505') throw new ConflictException('El nombre de usuario ya está registrado');
      throw error;
    }
  }

  async validar(username: string, password: string): Promise<UsuarioInfo> {
    const rows = await this.db.query<UsuarioRow>(
      `SELECT id, username, password_hash, rol, nombre_completo, categoria, estudiante_validado
       FROM usuarios WHERE username = $1`,
      [username],
    );
    const usuario = rows[0];
    if (!usuario || !(await compare(password, usuario.password_hash))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    return { id: usuario.id, username: usuario.username, rol: usuario.rol, nombreCompleto: usuario.nombre_completo, categoria: usuario.categoria, estudianteValidado: usuario.estudiante_validado };
  }

  async obtenerUsuario(id: number): Promise<UsuarioInfo> {
    const rows = await this.db.query<UsuarioRow>(
      `SELECT id, username, password_hash, rol, nombre_completo, categoria, estudiante_validado FROM usuarios WHERE id = $1`,
      [id],
    );
    const u = rows[0];
    if (!u) throw new UnauthorizedException('No existe sesión activa');
    return { id: u.id, username: u.username, rol: u.rol, nombreCompleto: u.nombre_completo, categoria: u.categoria, estudianteValidado: u.estudiante_validado };
  }

  async pendientesValidacion(): Promise<UsuarioInfo[]> {
    const rows = await this.db.query<UsuarioRow>(
      `SELECT id, username, '' as password_hash, rol, nombre_completo, categoria, estudiante_validado
       FROM usuarios WHERE categoria IN ('ESCOLAR','UNIVERSITARIO') AND estudiante_validado = FALSE ORDER BY id DESC`,
    );
    return rows.map((u) => ({ id: u.id, username: u.username, rol: u.rol, nombreCompleto: u.nombre_completo, categoria: u.categoria, estudianteValidado: u.estudiante_validado }));
  }

  async validarEstudiante(id: number, aprobado: boolean): Promise<{ mensaje: string }> {
    const rows = await this.db.query('UPDATE usuarios SET estudiante_validado = $1 WHERE id = $2 RETURNING id', [aprobado, id]);
    if (!rows[0]) throw new NotFoundException('Usuario no encontrado');
    return { mensaje: aprobado ? 'Estudiante validado con éxito' : 'Estudiante revocado/rechazado' };
  }
}
```

- [ ] **Step 3: Actualizar `backend/src/auth/auth.controller.ts`**

```ts
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AdminGuard } from './session.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const usuario = await this.auth.validar(dto.username, dto.password);
    await new Promise<void>((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
    req.session.usuarioId = usuario.id;
    req.session.username = usuario.username;
    req.session.rol = usuario.rol;
    req.session.categoria = usuario.categoria;
    req.session.nombreCompleto = usuario.nombreCompleto;
    req.session.estudianteValidado = usuario.estudianteValidado;
    await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));
    return usuario;
  }

  @Get('me')
  async me(@Req() req: Request) {
    if (!req.session?.usuarioId) throw new UnauthorizedException('No existe sesión activa');
    return this.auth.obtenerUsuario(req.session.usuarioId);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await new Promise<void>((resolve, reject) => req.session.destroy((err) => (err ? reject(err) : resolve())));
    res.clearCookie('micros.sid', { path: '/', httpOnly: true, sameSite: 'lax', secure: false });
    return { mensaje: 'Sesión finalizada' };
  }

  @Get('pendientes')
  @UseGuards(AdminGuard)
  pendientes() { return this.auth.pendientesValidacion(); }

  @Patch('validar-estudiante/:id')
  @UseGuards(AdminGuard)
  validarEstudiante(@Param('id', ParseIntPipe) id: number, @Body('aprobado') aprobado: boolean = true) {
    return this.auth.validarEstudiante(id, aprobado);
  }
}
```

- [ ] **Step 4: Verificar build backend**

Run: `cd H:\Rutabol-1-main\Rutabol-1-main\backend; npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth backend/src/types/express-session.d.ts
git commit -m "feat: completar contratos auth y validacion de estudiantes"
```

### Task 3: Alineación de env/examples y Docker local

**Files:**
- Modify: `backend/.env.example`
- Modify: `frontend/.env.local.example`
- Create: `.env.example`
- Modify: `compose.yaml` (sin cambios funcionales, solo verificar)

**Interfaces:**
- Produces: ejemplos de entorno seguros con placeholders, por defecto Docker local.

- [ ] **Step 1: Escribir `.env.example` raíz**

```env
POSTGRES_PASSWORD=cambiar_esta_contrasena
```

- [ ] **Step 2: Escribir `backend/.env.example`**

```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://micros:cambiar_esta_contrasena@localhost:5433/micros_scz
SESSION_SECRET=reemplazar_con_un_secreto_aleatorio_de_al_menos_32_caracteres
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CambiarEstaContrasena123!
```

- [ ] **Step 3: Escribir `frontend/.env.local.example`**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

- [ ] **Step 4: Commit**

```bash
git add .env.example backend/.env.example frontend/.env.local.example
git commit -m "chore: alinear env examples para docker local"
```

### Task 4: Fundación frontend (tipos, API, sesión, guards, layout)

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/components/SessionProvider.tsx`
- Create: `frontend/src/components/RoleGuard.tsx`
- Create: `frontend/src/components/Nav.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/globals.css`

**Interfaces:**
- Produces: `useSession()` hook, `<RoleGuard roles={[...]}>`, `api` completo para endpoints README, layout con Nav y provider.

- [ ] **Step 1: Reemplazar `frontend/src/lib/types.ts`**

```ts
export type Rol = 'ADMIN' | 'CONDUCTOR' | 'PASAJERO';
export type Categoria = 'GENERAL' | 'ESCOLAR' | 'UNIVERSITARIO' | 'ADULTO_MAYOR';
export type EstadoMicro = 'ACTIVO' | 'MANTENIMIENTO' | 'INACTIVO' | 'EMERGENCIA';

export interface Usuario {
  id: number;
  username: string;
  rol: Rol;
  nombreCompleto?: string;
  categoria: Categoria;
  estudianteValidado?: boolean;
}

export interface Linea { id: number; nombre: string; zona: string; descripcion: string; color: string; }
export interface Micro {
  id: number; placa: string; interno: string; capacidad: number; pasajerosActuales: number;
  estado: EstadoMicro; lineaId: number; latitud: number; longitud: number; distanciaKm?: number;
}
export interface Tarifa { id: number; categoria: Categoria; monto: number; descripcion: string; }
export interface Pago {
  id: number; usuarioId?: number; microId?: number; monto: number; metodo: string;
  codigoTicket: string; estado: string; esTrasbordoGratuito: boolean; fechaPago: string;
  microInterno?: string; microPlaca?: string; lineaNombre?: string;
}
export interface Trasbordo {
  id: number; microOrigenId: number; microDestinoId: number; motivo: string;
  cantidadPasajeros: number; estado: string; fecha: string;
  microOrigenInterno?: string; microDestinoInterno?: string;
}
export interface Notificacion {
  id: number; usuarioId?: number; microId?: number; titulo: string; mensaje: string;
  tipo: 'INFO' | 'EMERGENCIA' | 'TRASBORDO'; leido: boolean; fecha: string;
}

export interface MicroInput { placa: string; interno: string; capacidad: number; estado: EstadoMicro; lineaId: number; latitud?: number; longitud?: number; }
export interface RegisterInput { username: string; password: string; nombreCompleto?: string; rol?: Rol; categoria?: Categoria; codigoRude?: string; codEst?: string; emailUpds?: string; fotoCredencialUrl?: string; }
export interface PagoInput { microId: number; numeroTarjeta: string; nombreTitular: string; fechaVencimiento: string; cvv: string; }
```

- [ ] **Step 2: Reemplazar `frontend/src/lib/api.ts`**

```ts
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
```

- [ ] **Step 3: Crear `frontend/src/components/SessionProvider.tsx`**

```tsx
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
```

- [ ] **Step 4: Crear `frontend/src/components/RoleGuard.tsx`**

```tsx
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
```

- [ ] **Step 5: Crear `frontend/src/components/Nav.tsx`**

```tsx
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
```

- [ ] **Step 6: Actualizar `frontend/src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/SessionProvider';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = { title: 'Rutabol SCZ', description: 'Sistema Inteligente de Transporte Urbano' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body><SessionProvider><Nav />{children}</SessionProvider></body>
    </html>
  );
}
```

- [ ] **Step 7: Reemplazar `frontend/src/app/globals.css`**

```css
:root { --bg:#f4f7fb; --card:#fff; --text:#182230; --muted:#5b6572; --primary:#0b6b3a; --danger:#b42318; --border:#dbe3ee; }
*{box-sizing:border-box} body{margin:0;font-family:system-ui,Arial,sans-serif;background:var(--bg);color:var(--text)}
a{color:inherit;text-decoration:none} .contenedor{max-width:1100px;margin:0 auto;padding:1rem}
.cabecera{background:#fff;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10}
.nav{display:flex;gap:1rem;align-items:center;justify-content:space-between}.nav nav{display:flex;gap:.75rem;align-items:center;flex-wrap:wrap}
.marca{display:flex;gap:.6rem;align-items:center}.simbolo{width:36px;height:36px;border-radius:10px;background:var(--primary);color:#fff;display:grid;place-items:center;font-weight:700}
.marca small{display:block;color:var(--muted)} .hero{background:linear-gradient(135deg,#0b6b3a,#134e4a);color:#fff;padding:2.5rem 0}
.hero p,.hero .advertencia{max-width:700px} .heroacciones{display:flex;gap:.75rem;margin:1rem 0;flex-wrap:wrap}
.boton{border:1px solid var(--border);background:#fff;padding:.6rem .9rem;border-radius:8px;cursor:pointer;font:inherit}
.boton.principal{background:var(--primary);color:#fff;border-color:var(--primary)} .boton.secundario{background:#fff}
.boton.peligro,.peligro{color:var(--danger);border-color:#f1b0ab} .boton:disabled{opacity:.6;cursor:not-allowed}
.seccion{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1rem;margin:1rem 0}
.seccionTitulo{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap}
.sobre,.etiqueta,.contador,.chip,.zona{font-size:.78rem;color:var(--muted)} .contador,.chip{background:#eef3f8;padding:.2rem .5rem;border-radius:999px}
.tarjetas{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}.tarjeta{border:1px solid var(--border);border-top:4px solid var(--primary);border-radius:10px;padding:1rem;background:#fff}
.tarjetaIcono{width:42px;height:42px;border-radius:10px;color:#fff;display:grid;place-items:center;font-weight:700;margin-bottom:.5rem}
.alerta{padding:.75rem 1rem;border-radius:8px;margin:1rem 0}.alerta.error{background:#fff1f0;color:#7a271a}.alerta.exito{background:#ecfdf3;color:#14532d}
.filtros{display:flex;gap:.75rem;flex-wrap:wrap;margin:.75rem 0}.filtros input,.filtros select{padding:.6rem;border:1px solid var(--border);border-radius:8px}
.tablaWrap{overflow:auto} table{width:100%;border-collapse:collapse} th,td{padding:.6rem;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
.formulario,.panelAcceso{display:grid;gap:.75rem}.formulario{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.formulario label,.panelAcceso label,.campo{display:grid;gap:.35rem;font-size:.95rem}
input,select,textarea{padding:.6rem;border:1px solid var(--border);border-radius:8px;font:inherit;width:100%}
.formAcciones,.acciones{display:flex;gap:.5rem;flex-wrap:wrap}.ancho{grid-column:1/-1}
.estado{padding:.2rem .5rem;border-radius:999px;font-size:.75rem;font-weight:600}.estado.activo{background:#dcfce7;color:#166534}
.estado.mantenimiento,.estado.emergencia{background:#fee2e2;color:#991b1b}.estado.inactivo{background:#e5e7eb;color:#374151}
.vacio{color:var(--muted);text-align:center}.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem}
.tabs{display:flex;gap:.5rem;flex-wrap:wrap;margin:.75rem 0}.tab{padding:.5rem .75rem;border:1px solid var(--border);border-radius:999px;background:#fff;cursor:pointer}
.tab.activa{background:var(--primary);color:#fff;border-color:var(--primary)} .mensajeError{color:var(--danger)}
@media (max-width:700px){.nav{flex-direction:column;align-items:flex-start}}
```

- [ ] **Step 8: Verificar frontend compila**

Run: `cd H:\Rutabol-1-main\Rutabol-1-main\frontend; npm run build`  
Expected: puede fallar por páginas aún no creadas; si falla solo por imports antiguos de `page.tsx`, continuar con Task 5. Registrar error.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/lib frontend/src/components frontend/src/app/layout.tsx frontend/src/app/globals.css
git commit -m "feat: base frontend con sesion, roles y api completa"
```

### Task 5: Páginas públicas y auth (/, /login, /registro)

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/login/page.tsx`
- Create: `frontend/src/app/registro/page.tsx`

**Interfaces:**
- Produces: Home con líneas + micros cercanos; login con redirección por rol; registro con campos dinámicos por categoría.

- [ ] **Step 1: Reemplazar `frontend/src/app/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Crear `frontend/src/app/login/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Crear `frontend/src/app/registro/page.tsx`**

```tsx
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
```
- [ ] **Step 4: Build frontend**

Run: `cd H:\Rutabol-1-main\Rutabol-1-main\frontend; npm run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/app/login/page.tsx frontend/src/app/registro/page.tsx
git commit -m "feat: paginas publicas, login y registro"
```

### Task 6: Panel pasajero

**Files:**
- Create: `frontend/src/app/pasajero/page.tsx`

**Interfaces:**
- Consumes: `api.microsCercanos`, `api.pagar`, `api.misPagos`, `api.verificarTicket`, `api.notificaciones`, `api.marcarNotificacionLeida`, `api.micros`, `api.lineas`.
- Produces: panel protegido `RoleGuard roles={['PASAJERO']}` con tabs/secciones: Cercanos, Pagar, Mis pagos, Verificar ticket, Notificaciones.

- [ ] **Step 1: Crear `frontend/src/app/pasajero/page.tsx`**

```tsx
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
```
- [ ] **Step 2: Build frontend** - Run: `npm run build` en frontend. Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/pasajero/page.tsx
git commit -m "feat: panel pasajero con pagos y notificaciones"
```

### Task 7: Panel conductor

**Files:**
- Create: `frontend/src/app/conductor/page.tsx`

**Interfaces:**
- Consumes: `api.micros`, `api.actualizarPasajeros`, `api.actualizarUbicacion`, `api.verificarTicket`, `api.trasbordos`, `api.crearTrasbordo`, `api.notificaciones`.
- Produces: panel `RoleGuard roles={['CONDUCTOR','ADMIN']}` para operación: seleccionar micro, subir/bajar pasajeros, actualizar GPS, verificar ticket, crear/listar trasbordos.

- [ ] **Step 1: Crear `frontend/src/app/conductor/page.tsx`**

```tsx
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
```
- [ ] **Step 2: Build frontend** - Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/conductor/page.tsx
git commit -m "feat: panel conductor para operacion y trasbordos"
```

### Task 8: Panel admin

**Files:**
- Create: `frontend/src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `api.micros`, `api.crearMicro`, `api.actualizarMicro`, `api.eliminarMicro`, `api.tarifas`, `api.actualizarTarifa`, `api.pendientes`, `api.validarEstudiante`, `api.trasbordos`, `api.notificaciones`.
- Produces: panel `RoleGuard roles={['ADMIN']}` con CRUD micros, tarifas, validación estudiantes, trasbordos/notificaciones.

- [ ] **Step 1: Crear `frontend/src/app/admin/page.tsx`**

```tsx
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
```
- [ ] **Step 2: Build frontend** - Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/page.tsx
git commit -m "feat: panel admin con gestion completa"
```

### Task 9: Documentación README y GUIA_CLASE

**Files:**
- Modify: `README.md`
- Modify: `GUIA_CLASE.md`

**Interfaces:**
- Produces: README alineado al sistema real (Docker local default, env seguro, permisos reales, endpoints reales, 5 secciones preservadas/mejoradas); GUIA_CLASE completa (setup, ejecución, flujos por rol, pruebas, troubleshooting, defensa).

- [ ] **Step 1: Actualizar `README.md`** conservando las 5 secciones pero corrigiendo: setup Docker local primero; `.env` con placeholders; remover credenciales reales/DB URL real; matriz permisos precisa; notas de seguridad; indicar frontend rutas por rol.
- [ ] **Step 2: Reescribir `GUIA_CLASE.md`** con guía completa del proyecto actual: prerrequisitos, docker compose, envs, instalar/ejecutar backend y frontend, flujos por rol, smoke tests, troubleshooting, defensa.
- [ ] **Step 3: Verificar docs no contienen secretos**

Run: `cd H:\Rutabol-1-main\Rutabol-1-main; Select-String -Path README.md,GUIA_CLASE.md -Pattern "Rutabol12345|supabase.co|rutabol_secret_desarrollo|Admin12"`  
Expected: sin coincidencias.

- [ ] **Step 4: Commit**

```bash
git add README.md GUIA_CLASE.md
git commit -m "docs: alinear README y completar guia de clase"
```

### Task 10: Verificación integrada

**Files:**
- No code changes expected unless bugs found.

- [ ] **Step 1: Build backend**

Run: `cd H:\Rutabol-1-main\Rutabol-1-main\backend; npm run build`  
Expected: PASS.

- [ ] **Step 2: Build frontend**

Run: `cd H:\Rutabol-1-main\Rutabol-1-main\frontend; npm run build`  
Expected: PASS.

- [ ] **Step 3: Smoke manual (si Docker/DB disponible)**

Run: `docker compose up -d` en raíz; iniciar backend y frontend; probar:
- register/login/me/logout
- admin crea micro/tarifa/valida estudiante
- conductor actualiza pasajeros/ubicacion y crea trasbordo
- pasajero ve cercanos, paga, ve mis pagos, verifica ticket
- PASAJERO recibe 403 en endpoints admin/conductor

Expected: comportamientos alineados al spec.

- [ ] **Step 4: Commit final si hubo fixes**

```bash
git add -A
git commit -m "chore: fixes de verificacion integrada"
```
