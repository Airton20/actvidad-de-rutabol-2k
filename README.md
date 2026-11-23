# RUTABOL-SCZ — Sistema Inteligente de Transporte Urbano

Sistema web integral para la gestión y monitoreo del transporte público de Santa Cruz de la Sierra. La solución permite a los pasajeros explorar líneas, localizar micros en un radio configurable (5 km por defecto), adquirir boletos electrónicos, gestionar trasbordos sin cobro duplicado y recibir notificaciones; a los conductores administrar operación en ruta; y a los administradores supervisar la flota, tarifas y validaciones estudiantiles.

---

## 1. Arquitectura del Sistema

La arquitectura está dividida en tres capas desacopladas que se comunican mediante estándares web:

```text
  [ CLIENTE / FRONTEND ]                [ SERVIDOR / BACKEND ]               [ BASE DE DATOS ]
       Next.js (React)                      NestJS (Node.js)                PostgreSQL (Docker local)
    http://localhost:3000                 http://localhost:3001                 127.0.0.1:5433
              │                                    │                                    │
              │  HTTP REST / JSON                  │  Pool SQL ('pg')                   │
              │  credentials: 'include'            │  Sesión en PostgreSQL              │
              └───────────────────────────────────►│───────────────────────────────────►│
                                                   │                                    │
                                                   │◄───────────────────────────────────┘
              │◄───────────────────────────────────┘
```

### Tecnologías y herramientas

* **Next.js 15 + React 19:** Frontend con App Router, rutas por rol y consumo de API con `fetch`.
* **NestJS 11 + TypeScript:** Backend modular con `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`).
* **PostgreSQL 17 (Docker):** Base de datos local por defecto, inicializada con `database/01_init.sql`.
* **`pg` (node-postgres):** Acceso SQL con pool de conexiones; SSL condicional para compatibilidad con proveedores administrados.
* **`express-session` + `connect-pg-simple`:** Sesiones persistidas en PostgreSQL (cookie `micros.sid`, `httpOnly`, `sameSite=lax`).
* **`bcryptjs`:** Hash de contraseñas.
* **`class-validator` y `class-transformer`:** Validación de DTOs en tiempo de ejecución.

### Ejecución local (configuración por defecto)

* **Base de datos:** contenedor Docker PostgreSQL (`compose.yaml`).
* **Backend y frontend:** ejecutados localmente con npm.
* **Alternativa compatible:** se puede usar otra instancia PostgreSQL (incluido un proveedor administrado) configurando `DATABASE_URL` en `backend/.env`; si la URL requiere SSL, el backend habilita SSL automáticamente.

---

## 2. Credenciales y Configuración de Acceso

### Usuario administrador inicial

El backend NestJS realiza el bootstrap del administrador al iniciar (`AuthService.onModuleInit`), leyendo `ADMIN_USERNAME` y `ADMIN_PASSWORD` desde `backend/.env`:

* **Usuario:** valor de `ADMIN_USERNAME`
* **Contraseña:** valor de `ADMIN_PASSWORD` (define una contraseña segura en tu `.env`)
* **Rol:** `ADMIN`
* **Comportamiento actual:** si el usuario no existe, lo crea; si ya existe, sincroniza el `password_hash` con el valor configurado al arrancar.

> No uses contraseñas de ejemplo en entornos compartidos. Define credenciales propias en los archivos `.env` locales, que no deben commitearse.

### Registro de usuarios

Los usuarios se registran desde `POST /api/auth/register` o desde la pantalla `/registro`.

* **PASAJERO:** categoría `GENERAL`, `ESCOLAR`, `UNIVERSITARIO` o `ADULTO_MAYOR`.
* **UNIVERSITARIO:** requiere correo institucional `@upds.edu.bo` y `codEst`.
* **ESCOLAR:** requiere `codigoRude`.
* **CONDUCTOR:** se registra con rol `CONDUCTOR`; su cuenta puede requerir validación administrativa según flujo de negocio.
* **Validación estudiantil:** un ADMIN aprueba/rechaza con `PATCH /api/auth/validar-estudiante/:id`.

### Variables de entorno

Usa archivos de ejemplo y completa valores locales:

```bash
# Raíz (Docker PostgreSQL)
Copy-Item .env.example .env

# Backend
Copy-Item backend/.env.example backend/.env

# Frontend
Copy-Item frontend/.env.local.example frontend/.env.local
```

**`.env` (raíz, usado por Docker Compose):**

```env
POSTGRES_PASSWORD=<contraseña_segura_postgres>
```

**`backend/.env`:**

```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://micros:<contraseña_segura_postgres>@localhost:5433/micros_scz
SESSION_SECRET=<secreto_aleatorio_de_al_menos_32_caracteres>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<contraseña_segura_admin>
```

**`frontend/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

> Importante: `SESSION_SECRET` debe tener al menos 32 caracteres. No publiques credenciales reales, cadenas de conexión privadas ni secretos en documentación o commits.

---

## 3. Lo que se Realizó en el Backend y Base de Datos

### A. Base de datos relacional (`database/01_init.sql`)

1. **`lineas`:** rutas troncales (incluye líneas de ejemplo) con nombre, zona, descripción y color.
2. **`usuarios`:** cuentas con rol (`ADMIN`, `CONDUCTOR`, `PASAJERO`), categoría, datos estudiantiles y estado de validación.
3. **`tarifas`:** precios oficiales por categoría (General, Universitario, Escolar, Adulto Mayor).
4. **`micros`:** placa, interno, capacidad, ocupación, estado, línea y coordenadas GPS. Restricciones de integridad:
   * `CHECK (capacidad BETWEEN 18 AND 25)`
   * `CHECK (pasajeros_actuales <= capacidad)`
5. **`pagos`:** tickets emitidos, monto, método enmascarado, estado y marca de trasbordo gratuito. No guarda número completo de tarjeta ni CVV.
6. **`trasbordos`:** transferencias entre micro origen y destino, motivo, cantidad y fecha.
7. **`notificaciones`:** avisos con tipo (`INFO`, `EMERGENCIA`, `TRASBORDO`) y estado de lectura.
8. **`session`:** almacenamiento de sesiones de Express para autenticación persistente.

### B. Módulos y lógica de negocio en NestJS

* **Autenticación y sesiones:** registro/login/logout/me; sesión guardada en PostgreSQL; guards por rol (`SessionGuard`, `AdminGuard`, `ConductorOrAdminGuard`).
* **Búsqueda geoespacial:** `GET /api/micros/cercanos` usa fórmula Haversine en SQL con radio configurable (por defecto 5 km).
* **Control de capacidad:** validación DTO + reglas de servicio + checks SQL para impedir sobrecupo.
* **Trasbordo gratuito:** si el usuario tiene pago reciente en micro origen y existe trasbordo al micro destino dentro de la ventana de 2 horas, el pago se registra con `monto 0.00` y `es_trasbordo_gratuito=true`.
* **Pagos seguros:** se valida la estructura de pago, se genera ticket único y solo se persiste información no sensible (por ejemplo, método/tarjeta enmascarada).
* **Validación estudiantil:** reglas por categoría; administración puede aprobar o rechazar credenciales.

### C. Frontend por rutas y rol

* **`/` (público):** líneas, micros, búsqueda de cercanos por lat/lng o geolocalización, accesos a login/registro.
* **`/login`:** inicio de sesión y redirección por rol.
* **`/registro`:** registro con campos dinámicos por categoría/rol.
* **`/pasajero`:** cercanos, pago de boleto, mis pagos, verificación de ticket, notificaciones.
* **`/conductor` (CONDUCTOR/ADMIN):** operación de micro (subir/bajar pasajeros, GPS), verificación de ticket, creación/listado de trasbordos, notificaciones.
* **`/admin`:** CRUD micros, actualización de tarifas, validación de estudiantes, trasbordos y notificaciones.

---

## 4. Guía Detallada para el Desarrollador Frontend (Next.js)

### Configuración de consumo API

Toda petición `fetch` debe apuntar a `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:3001/api`) e incluir `credentials: 'include'` para enviar la cookie de sesión.

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const res = await fetch(`${BASE}/auth/me`, {
  credentials: 'include',
  cache: 'no-store',
});
```

### Matriz de endpoints y permisos

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register` | Público | Registro de usuario |
| `POST` | `/api/auth/login` | Público | Inicia sesión y crea cookie |
| `GET` | `/api/auth/me` | Sesión | Usuario autenticado actual |
| `POST` | `/api/auth/logout` | Sesión | Cierra sesión |
| `GET` | `/api/auth/pendientes` | ADMIN | Lista estudiantes pendientes de validación |
| `PATCH` | `/api/auth/validar-estudiante/:id` | ADMIN | Aprueba/rechaza validación estudiantil |
| `GET` | `/api/lineas` | Público | Lista líneas |
| `GET` | `/api/lineas/:id` | Público | Detalle de línea |
| `GET` | `/api/micros` | Público | Lista micros |
| `GET` | `/api/micros/:id` | Público | Detalle de micro |
| `GET` | `/api/micros/cercanos?lat=&lng=&radio=` | Público | Micros cercanos por Haversine |
| `POST` | `/api/micros` | ADMIN | Crea micro |
| `PATCH` | `/api/micros/:id` | ADMIN | Actualiza micro |
| `DELETE` | `/api/micros/:id` | ADMIN | Elimina micro |
| `PATCH` | `/api/micros/:id/pasajeros` | CONDUCTOR o ADMIN | Sube/baja pasajeros |
| `PATCH` | `/api/micros/:id/ubicacion` | CONDUCTOR o ADMIN | Actualiza GPS |
| `GET` | `/api/tarifas` | Público | Lista tarifas |
| `PATCH` | `/api/tarifas/:id` | ADMIN | Actualiza monto de tarifa |
| `POST` | `/api/pagos/pagar` | Sesión | Procesa pago y genera ticket |
| `GET` | `/api/pagos/mis-pagos` | Sesión | Historial de pagos del usuario |
| `GET` | `/api/pagos/verificar/:codigoTicket` | Público | Verifica ticket |
| `POST` | `/api/trasbordos` | CONDUCTOR o ADMIN | Crea trasbordo |
| `GET` | `/api/trasbordos` | CONDUCTOR o ADMIN | Lista trasbordos |
| `GET` | `/api/notificaciones` | Sesión | Lista notificaciones |
| `PATCH` | `/api/notificaciones/:id/leido` | Sesión | Marca notificación como leída |

### Contratos relevantes (resumen)

* **Registro:** `username`, `password`, `nombreCompleto?`, `rol?`, `categoria?`, `codigoRude?`, `codEst?`, `emailUpds?`, `fotoCredencialUrl?`
* **Pago:** `microId`, `numeroTarjeta`, `nombreTitular`, `fechaVencimiento`, `cvv`
* **Pasajeros:** `accion` (`SUBIR`/`BAJAR`), `cantidad`
* **Ubicación:** `latitud`, `longitud`
* **Trasbordo:** `microOrigenId`, `microDestinoId`, `motivo`, `cantidadPasajeros?`

### Manejo esperado en UI

* Mostrar estados `loading`, `error`, `empty` y `success`.
* En `401/403`, mostrar mensaje claro y redirigir a `/login` cuando corresponda.
* Ocultar acciones no autorizadas en la UI, pero asumir que el backend es la autoridad final.

---

## 5. Guía de Defensa para el Examen con el Ingeniero

### 1. ¿Cómo se conectan Frontend, Backend y Base de Datos?

> "El frontend en Next.js consume la API REST de NestJS en `http://localhost:3001/api` usando JSON y `credentials: 'include'`. NestJS valida datos con DTOs, controla acceso por sesión/rol y ejecuta SQL parametrizado mediante `pg` hacia PostgreSQL. En desarrollo local, PostgreSQL corre en Docker; el backend y frontend corren localmente con npm."

### 2. ¿Por qué Docker para la base de datos y apps locales?

> "Docker nos da un PostgreSQL reproducible con inicialización automática del esquema (`01_init.sql`). Separar DB en contenedor y apps en local simplifica el desarrollo: se reinicia rápido, no depende de instalación manual compleja de PostgreSQL y mantiene la misma configuración para el equipo."

### 3. ¿Cómo funciona la búsqueda de micros a 5 km?

> "Usamos la fórmula de Haversine dentro de la consulta SQL. El backend recibe latitud, longitud y radio; la base filtra micros activos dentro del radio y devuelve la distancia calculada. Así evitamos traer todos los registros a memoria y aprovechamos el motor de BD."

### 4. ¿Cómo se controla la capacidad del micro?

> "Hay validación en capas: DTOs y servicio en backend rechazan operaciones inválidas, y la base tiene constraints `CHECK` para capacidad entre 18 y 25 y para impedir que `pasajeros_actuales` supere la capacidad. Si se excede, se responde con error HTTP adecuado."

### 5. ¿Cómo se evita el doble cobro en trasbordos?

> "Antes de cobrar, el servicio de pagos verifica si existe un pago reciente del mismo usuario en el micro origen y un trasbordo válido hacia el micro destino dentro de la ventana de 2 horas. Si aplica, emite ticket con monto Bs. 0.00 y marca `es_trasbordo_gratuito=true`."

### 6. ¿Cómo se manejan seguridad y credenciales?

> "Las contraseñas se almacenan con hash (`bcryptjs`), la autenticación usa sesiones HTTP-only en PostgreSQL y los endpoints sensibles tienen guards por rol. En pagos no se persiste número completo de tarjeta ni CVV. La documentación usa placeholders `.env.example`; los secretos reales solo van en archivos `.env` locales ignorados por git."