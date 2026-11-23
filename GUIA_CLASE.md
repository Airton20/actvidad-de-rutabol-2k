# GUIA_CLASE — RUTABOL-SCZ

Guía completa para ejecutar, probar y defender el proyecto **RUTABOL-SCZ** en entorno local.

## 1. Objetivo del proyecto

RUTABOL-SCZ es un sistema web de transporte urbano con:

* **Backend:** NestJS + PostgreSQL (`pg`, sesiones en BD).
* **Frontend:** Next.js (App Router) con rutas por rol.
* **Base de datos:** PostgreSQL en Docker (configuración local por defecto).

El sistema cubre autenticación, roles, micros/líneas, cercanía por Haversine, pagos con ticket, trasbordos gratuitos, notificaciones y validación estudiantil.

---

## 2. Prerrequisitos

Instala/verifica:

* **Node.js** 20+ (recomendado LTS reciente) y **npm**.
* **Docker Desktop** (o Docker Engine + Docker Compose v2).
* **Git** (opcional, para clonar/gestionar cambios).
* Navegador moderno (Chrome/Edge/Firefox).

Verificación rápida (PowerShell):

```powershell
node -v
npm -v
docker --version
docker compose version
```

---

## 3. Configuración de entorno (.env)

> No uses credenciales reales en documentación ni las subas a git. Los `.env` locales deben permanecer fuera del control de versiones.

### 3.1 Archivo raíz para Docker (`.env`)

```powershell
Copy-Item .env.example .env
```

Contenido esperado:

```env
POSTGRES_PASSWORD=<contraseña_segura_postgres>
```

### 3.2 Backend (`backend/.env`)

```powershell
Copy-Item backend/.env.example backend/.env
```

Configura valores locales:

```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://micros:<contraseña_segura_postgres>@localhost:5433/micros_scz
SESSION_SECRET=<secreto_aleatorio_de_al_menos_32_caracteres>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<contraseña_segura_admin>
```

Notas:

* `SESSION_SECRET` debe tener **al menos 32 caracteres**.
* `DATABASE_URL` debe apuntar al PostgreSQL de Docker local por defecto.
* Si usas una BD administrada compatible, configura su `DATABASE_URL`; el backend habilita SSL automáticamente cuando detecta una URL compatible con SSL.

### 3.3 Frontend (`frontend/.env.local`)

```powershell
Copy-Item frontend/.env.local.example frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 4. Levantar base de datos con Docker

Desde la raíz del proyecto:

```powershell
docker compose up -d
docker compose ps
```

Qué hace:

* Levanta `postgres:17-alpine` en `127.0.0.1:5433`.
* Crea BD `micros_scz`, usuario `micros`.
* Ejecuta automáticamente `database/01_init.sql` **solo la primera vez** que se crea el volumen.

Comprobación opcional:

```powershell
docker compose logs postgres --tail=50
```

### Reset de base de datos (solo si es necesario)

Esto elimina datos locales del volumen:

```powershell
docker compose down -v
docker compose up -d
```

---

## 5. Instalar dependencias y ejecutar apps

### 5.1 Backend (NestJS)

```powershell
cd backend
npm install
npm run start:dev
```

Backend disponible en: `http://localhost:3001/api`

### 5.2 Frontend (Next.js)

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend disponible en: `http://localhost:3000`

---

## 6. Flujos por rol

### Público / Anónimo

* **`/`**: ver líneas, ver micros, buscar micros cercanos por lat/lng o geolocalización.
* **`/registro`**: crear cuenta como PASAJERO o CONDUCTOR; categorías GENERAL/ESCOLAR/UNIVERSITARIO/ADULTO_MAYOR.
* **`/login`**: iniciar sesión.

### Pasajero (`/pasajero`)

* Buscar micros cercanos (radio 5 km).
* Pagar boleto (genera ticket).
* Ver historial de pagos (`mis-pagos`).
* Verificar ticket por código.
* Ver y marcar notificaciones como leídas.

### Conductor (`/conductor`)

* Seleccionar micro y gestionar ocupación: subir/bajar pasajeros.
* Actualizar ubicación GPS del micro.
* Verificar ticket de pasajero.
* Crear y listar trasbordos operativos.
* Ver notificaciones operativas.

> La ruta `/conductor` permite acceso a CONDUCTOR y ADMIN.

### Administrador (`/admin`)

* CRUD de micros (crear, editar, eliminar).
* Actualizar tarifas por categoría.
* Ver estudiantes pendientes y aprobar/rechazar validación.
* Ver trasbordos.
* Ver notificaciones.

---

## 7. Smoke tests (verificación rápida)

### 7.1 Builds / checks automatizados

```powershell
# Backend
cd backend
npm run build

# Frontend
cd ..\frontend
npm run lint
npm run build
```

### 7.2 Smoke manual por API/UI

1. **Auth**
   - Registrar un pasajero y un conductor desde `/registro`.
   - Iniciar sesión en `/login`; confirmar redirección por rol.
   - `GET /api/auth/me` con sesión activa devuelve usuario.
   - Cerrar sesión desde UI o `POST /api/auth/logout`.

2. **Permisos**
   - Como PASAJERO, intentar acción ADMIN (ej. crear micro) debe fallar con 403.
   - Como PASAJERO, intentar actualizar pasajeros/ubicación debe fallar con 403.
   - Endpoints CONDUCTOR/ADMIN deben aceptar CONDUCTOR y ADMIN.

3. **Micros y cercanía**
   - ADMIN crea/edita/elimina micro.
   - `GET /api/micros/cercanos?lat=-17.7833&lng=-63.1821&radio=5` devuelve resultados con `distanciaKm`.
   - CONDUCTOR/ADMIN actualiza pasajeros y ubicación.

4. **Pagos y trasbordo gratuito**
   - PASAJERO realiza `POST /api/pagos/pagar`.
   - Consultar `GET /api/pagos/mis-pagos`.
   - Verificar ticket en `GET /api/pagos/verificar/:codigoTicket`.
   - Escenario trasbordo: crear trasbordo origen->destino y pagar en destino dentro de 2 horas; el pago debe salir con monto 0.00 y `esTrasbordoGratuito=true` (según flujo implementado).

5. **Trasbordos y notificaciones**
   - CONDUCTOR/ADMIN crea trasbordo y lista trasbordos.
   - Usuario autenticado lista notificaciones y marca una como leída.

6. **Validación estudiantil**
   - Registrar UNIVERSITARIO con email `@upds.edu.bo` y `codEst` o ESCOLAR con `codigoRude`.
   - ADMIN revisa pendientes y aprueba/rechaza.

---

## 8. Troubleshooting

### Docker no levanta PostgreSQL

* Verifica Docker Desktop activo: `docker info`.
* Revisa logs: `docker compose logs postgres`.
* Puerto ocupado (`5433`): cambia el mapeo en `compose.yaml` y actualiza `DATABASE_URL`.

### Backend falla al iniciar

* **`SESSION_SECRET debe tener al menos 32 caracteres`**: define un secreto largo en `backend/.env`.
* **`Falta DATABASE_URL`**: revisa `backend/.env`.
* **Error de conexión DB**: confirma `docker compose ps` y credenciales de `DATABASE_URL`.
* **CORS/cookies**: confirma `FRONTEND_ORIGIN=http://localhost:3000` y frontend usando `credentials: 'include'`.

### Frontend no conecta con API

* Verifica `frontend/.env.local` con `NEXT_PUBLIC_API_URL=http://localhost:3001/api`.
* Reinicia `npm run dev` después de cambiar `.env.local`.
* Confirma backend activo en puerto 3001.

### El init SQL no se vuelve a aplicar

* `database/01_init.sql` se ejecuta solo al crear el volumen por primera vez.
* Para re-aplicar desde cero: `docker compose down -v` y luego `docker compose up -d` (borra datos locales).

### 401/403 en endpoints protegidos

* 401: no hay sesión válida; inicia sesión nuevamente.
* 403: rol insuficiente; verifica la matriz de permisos.

---

## 9. Defensa del proyecto (guion corto)

1. **Arquitectura:** Next.js consume API REST NestJS; NestJS valida DTOs, aplica guards y consulta PostgreSQL con `pg`. DB en Docker, apps locales.
2. **Seguridad:** bcrypt para contraseñas, sesiones HTTP-only persistidas en PostgreSQL, guards por rol, no se guardan datos sensibles de tarjeta.
3. **Integridad de negocio:** checks SQL de capacidad, validación backend, Haversine en SQL para cercanos.
4. **Trasbordo gratuito:** regla de negocio en servicio de pagos basada en pago reciente + trasbordo válido en ventana de 2 horas.
5. **Reproducibilidad:** `compose.yaml` + `.env.example` + scripts npm; documentación sin secretos reales.

---

## 10. Referencias rápidas

* README principal: `README.md`
* Compose DB: `compose.yaml`
* SQL inicial: `database/01_init.sql`
* API base local: `http://localhost:3001/api`
* Frontend local: `http://localhost:3000`
