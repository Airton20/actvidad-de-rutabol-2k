# Rutabol 1 - Diseño de Implementación Completa

**Fecha:** 2026-11-23  
**Proyecto:** `H:\Rutabol-1-main\Rutabol-1-main`  
**Estado:** Aprobado para spec por el usuario (Secciones 1-3 aprobadas)  
**Alcance:** Implementación completa (backend + frontend + docs)

## 1. Objetivo y entendimiento compartido

Completar el proyecto Rutabol-SCZ para que la implementación local quede alineada con lo descrito en `README.md` (sus 5 secciones) y con `GUIA_CLASE.md`, cubriendo la funcionalidad faltante de forma funcional y completa.

### Resultado esperado
- Backend NestJS alineado a contratos, reglas de negocio y permisos por rol.
- Frontend Next.js (App Router) con rutas por rol y flujos funcionales completos.
- Documentación (`README.md`, `GUIA_CLASE.md`) actualizada al estado real del sistema.
- Entorno local reproducible con **PostgreSQL en Docker** y **backend/frontend ejecutándose localmente**.

### Fuera de alcance (YAGNI)
- Mapa pesado/tiempo real con librerías externas complejas; se permite solución funcional (geolocalización, lat/lng manual, lista por distancia).
- Despliegue productivo, CI/CD, pagos reales con pasarela externa.
- Reescritura de arquitectura o cambio de stack.

## 2. Contexto actual (brechas observadas)

### Ya existe
- Backend con módulos: `auth`, `lineas`, `micros`, `tarifas`, `pagos`, `trasbordos`, `notificaciones`.
- DB schema `database/01_init.sql` con tablas y seeds principales.
- Frontend básico en una sola página (`/`) con login admin y CRUD simple de micros/líneas.
- `compose.yaml` para PostgreSQL local.
- README con las 5 secciones requeridas; `GUIA_CLASE.md` como stub.

### Brechas principales
- **Permisos**: algunos endpoints usan `SessionGuard` donde README exige Admin; faltan restricciones claras para conductor en GPS/pasajeros.
- **Frontend**: faltan registro, paneles por rol y flujos de pagos/cercanos/tarifas/validación estudiante/trasbordos/notificaciones.
- **Docs**: README tiene datos sensibles y posibles desalineamientos; GUIA_CLASE.md no está completa.

## 3. Arquitectura y decisiones

### Arquitectura
- **Frontend**: Next.js 15 + React 19, App Router, `fetch` a `http://localhost:3001/api` con `credentials: 'include'`.
- **Backend**: NestJS 11, ValidationPipe global, sesiones `express-session` + `connect-pg-simple`, PostgreSQL via `pg` Pool.
- **DB**: PostgreSQL en Docker local por defecto; compatible con Supabase por `DATABASE_URL` con SSL condicional.

### Docker (aprobado)
- `compose.yaml` levanta solo PostgreSQL.
- Backend y frontend se ejecutan localmente con npm.
- `.env.example` y docs deben priorizar configuración Docker local; Supabase queda como alternativa documentada.

## 4. Permisos y contratos por rol

| Rol | Capacidades |
|---|---|
| ADMIN | Gestión micros (CRUD), tarifas (PATCH), validar estudiantes, crear/listar trasbordos, ver notificaciones, operaciones administrativas |
| CONDUCTOR | Actualizar ubicación/pasajeros de micros, verificar tickets, crear/listar trasbordos operativos, ver notificaciones operativas |
| PASAJERO | Registro/login, ver líneas/micros/cercanos, pagar, ver mis pagos, verificar ticket, ver notificaciones propias/globales según modelo |

### Matriz de endpoints objetivo

- **Auth (`/api/auth`)**
  - `POST /register` - público
  - `POST /login` - público
  - `GET /me` - sesión
  - `POST /logout` - sesión
  - `PATCH /validar-estudiante/:id` - ADMIN
- **Líneas (`/api/lineas`)**
  - `GET /`, `GET /:id` - público
- **Micros (`/api/micros`)**
  - `GET /`, `GET /:id`, `GET /cercanos` - público
  - `POST /`, `PATCH /:id`, `DELETE /:id` - ADMIN
  - `PATCH /:id/pasajeros`, `PATCH /:id/ubicacion` - CONDUCTOR o ADMIN
- **Tarifas (`/api/tarifas`)**
  - `GET /` - público
  - `PATCH /:id` - ADMIN
- **Pagos (`/api/pagos`)**
  - `POST /pagar` - sesión (pasajero autenticado)
  - `GET /mis-pagos` - sesión
  - `GET /verificar/:codigoTicket` - público (verificación operativa)
- **Trasbordos (`/api/trasbordos`)**
  - `POST /` - CONDUCTOR o ADMIN
  - `GET /` - CONDUCTOR o ADMIN
- **Notificaciones (`/api/notificaciones`)**
  - `GET /` - sesión (devuelve notificaciones recientes; alcance global según esquema actual)
  - `PATCH /:id/leido` - sesión

> Nota: la UI ocultará acciones no autorizadas, pero la autorización efectiva se aplica en backend.

## 5. Reglas de negocio a preservar

- **Haversine en SQL** para cercanos; radio por defecto 5km.
- **Capacidad**: `capacidad BETWEEN 18 AND 25`, `pasajeros_actuales <= capacidad`; backend rechaza exceso con 400.
- **Trasbordo gratuito**: pago reciente del mismo usuario en micro origen + trasbordo a micro destino dentro de 2 horas => `monto 0.00`, `es_trasbordo_gratuito=true`.
- **Pagos seguros**: no persistir número completo de tarjeta ni CVV; guardar método enmascarado y ticket.
- **Validación estudiante**: UNIVERSITARIO requiere `@upds.edu.bo` y `codEst`; ESCOLAR requiere `codigoRude`; admin valida/revoca.

## 6. Diseño frontend (App Router)

### Rutas
- `/` - público: líneas, micros, micros cercanos (geolocalización o lat/lng manual), CTA login/registro.
- `/login` - login, redirección por rol.
- `/registro` - registro con campos dinámicos por categoría/rol.
- `/pasajero` - panel: cercanos, pagar boleto, mis pagos, verificar ticket, notificaciones.
- `/conductor` - panel: actualizar GPS/pasajeros, capacidad, verificar ticket, trasbordos/notificaciones operativas.
- `/admin` - panel: CRUD micros, tarifas, validar estudiantes, trasbordos, notificaciones.

### Organización frontend
- `src/lib/api.ts` - cliente API completo.
- `src/lib/types.ts` - tipos/DTOs UI.
- `src/components/` - `SessionProvider/useSession`, `RoleGuard`, `Nav`, tablas/formularios/feedback.
- `src/app/*` - rutas por rol.
- Estilo funcional, responsive básico, estados loading/error/empty/success.

## 7. Cambios por área

### Backend
- Agregar `ConductorOrAdminGuard` (y reutilizar `AdminGuard`) para aplicar la matriz de permisos por rol.
- Ajustar controladores para matriz de permisos.
- Revisar DTOs/validaciones y respuestas para consumo frontend.
- Revisar `notificaciones` para alcance por sesión (mínimo coherente con esquema).
- Mantener compatibilidad DB/init SQL; cambios aditivos si necesarios.

### Frontend
- Reemplazar UI de una sola página por rutas por rol.
- Implementar formularios y vistas para todos los flujos del README.
- Manejo de sesión global y redirecciones por rol.

### Docs
- **README.md**: mantener 5 secciones, alinear con implementación real, eliminar credenciales sensibles reales, documentar Docker local + envs seguros + endpoints/permisos exactos.
- **GUIA_CLASE.md**: guía completa (setup Docker, ejecución backend/frontend, flujos por rol, pruebas, troubleshooting, defensa).

## 8. Manejo de errores y validación

- Backend: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`; errores HTTP semánticos.
- Frontend: mostrar mensajes de API, bloquear submit en curso, manejar 401/403 con redirección/mensaje.
- No registrar secretos/tarjetas/CVV.

## 9. Verificación y pruebas

### Automatizada / build
- `backend`: `npm run build`
- `frontend`: `npm run lint` (si configurado) y `npm run build`
- DB: `docker compose up -d` con init SQL aplicado.

### Smoke manual mínimo
- Auth: register/login/me/logout/validar-estudiante.
- Roles: admin-only y conductor-only rechazan no autorizados.
- Micros: CRUD, cercanos, pasajeros, ubicación.
- Pagos: pagar, trasbordo gratuito, mis pagos, verificar ticket.
- Trasbordos/notificaciones: crear/listar/marcar leída.
- Frontend: navegación por rol y flujos principales.

## 10. Riesgos y mitigaciones

- **Desalineamiento contrato frontend-backend**: definir tipos API y probar smoke flows por rol.
- **Cambio de permisos rompe UI antigua**: actualizar frontend en la misma implementación.
- **Credenciales sensibles en docs**: reemplazar por placeholders y advertencia.
- **DB existente con datos previos**: cambios aditivos y SQL compatible; documentar reset de volumen solo si necesario.

## 11. Criterios de aceptación

- Se cumplen los flujos y endpoints descritos en README secciones 1-4, con permisos coherentes.
- GUIA_CLASE.md deja de ser stub y sirve como guía completa del proyecto actual.
- El proyecto corre con DB en Docker + apps locales siguiendo la documentación.
- Builds de backend y frontend pasan; smoke tests manuales de flujos críticos pasan.
