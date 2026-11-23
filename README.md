# RUTABOL-SCZ — Sistema Inteligente de Transporte Urbano

Sistema web integral para la gestión y monitoreo del transporte público de Santa Cruz de la Sierra. La solución permite a los pasajeros explorar líneas, localizar micros en tiempo real en un radio de 5 km, adquirir boletos electrónicos mediante pasarela de pago y gestionar trasbordos sin cobro duplicado; a los conductores administrar su capacidad operativa; y a los administradores supervisar la flota y validar credenciales estudiantiles.

---

## 1. Arquitectura del Sistema

La arquitectura está dividida en tres capas desacopladas que se comunican mediante estándares web:

```text
  [ CLIENTE / FRONTEND ]                [ SERVIDOR / BACKEND ]               [ BASE DE DATOS ]
       Next.js (React)                      NestJS (Node.js)               PostgreSQL (Supabase)
    http://localhost:3000                 http://localhost:3001                Nube (Puerto 5432)
              │                                    │                                    │
              │  HTTP REST / JSON                  │  Pool SQL ('pg')                   │
              │  credentials: 'include'            │  Conexión cifrada SSL              │
              └───────────────────────────────────►│───────────────────────────────────►│
                                                   │                                    │
                                                   │◄───────────────────────────────────┘
              │◄───────────────────────────────────┘
```

### Tecnologías y Herramientas Utilizadas
* **NestJS 11:** Framework de Node.js modular y tipado con TypeScript.
* **PostgreSQL 17 en Supabase:** Base de datos relacional alojada en la nube con soporte SSL, evitando la dependencia obligatoria de Docker local.
* **`pg` (node-postgres):** Controlador nativo con Connection Pool para transacciones SQL de alto rendimiento.
* **`express-session` + `connect-pg-simple`:** Autenticación por sesiones con almacenamiento persistente de cookies en PostgreSQL.
* **`bcryptjs`:** Algoritmo de hashing criptográfico unidireccional para proteger las contraseñas de los usuarios.
* **`class-validator` y `class-transformer`:** Validación estricta en tiempo de ejecución de las peticiones HTTP mediante Data Transfer Objects (DTOs).

---

## 2. Credenciales y Configuración de Acceso

### Usuario Administrador Inicial
* **Usuario:** `admin`
* **Contraseña:** `Admin12`
* **Rol:** `ADMIN`

### Usuarios Regulares (Pasajeros y Conductores)
Los usuarios se registran a través del endpoint `POST /api/auth/register`.
* **Estudiantes Universitarios:** Al registrarse como `UNIVERSITARIO`, deben ingresar un correo con dominio `@upds.edu.bo` y su código estudiantil (`codEst`).
* **Estudiantes Escolares:** Al registrarse como `ESCOLAR`, deben ingresar su código `RUDE`.
* **Conductores:** Al registrarse con rol `CONDUCTOR`, tienen permisos para actualizar el GPS y registrar la subida/bajada de pasajeros.

### Variables de Entorno (`backend/.env`)
```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
DATABASE_URL="postgresql://postgres:Rutabol12345¿@db.mxnofnbhxzxhmyzcawlz.supabase.co:5432/postgres"
SESSION_SECRET=rutabol_secret_desarrollo_scz_2026_super_seguro
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin12
```

---

## 3. Lo que se Realizó en el Backend y Base de Datos

### A. Base de Datos Relacional (`database/01_init.sql`)
1. **`lineas`:** Almacena las rutas troncales de Santa Cruz (Línea 17, Línea 18, Línea 72, Línea 8) con sus colores y descripciones.
2. **`usuarios`:** Gestiona los roles (`ADMIN`, `CONDUCTOR`, `PASAJERO`), categorías de descuento y datos estudiantiles.
3. **`tarifas`:** Fija los precios oficiales para evitar cobros arbitrarios (General: Bs. 2.00, Universitario: Bs. 1.00, Escolar: Bs. 1.00, Adulto Mayor: Bs. 1.50).
4. **`micros`:** Almacena placa, número interno, coordenadas de geolocalización (`latitud`, `longitud`), y aplica restricciones de integridad:
   * `CHECK (capacidad BETWEEN 18 AND 25)`
   * `CHECK (pasajeros_actuales <= capacidad)`
5. **`pagos`:** Almacena los tickets emitidos, montos y métodos de pago. No almacena números de tarjeta completos por seguridad.
6. **`trasbordos`:** Registra las transferencias de pasajeros entre unidades por cambio de turno o emergencias mecánicas.
7. **`notificaciones`:** Sistema de alertas para pasajeros y administradores.

### B. Módulos y Lógica de Negocio en NestJS
* **Búsqueda Geoespacial a 5 km:** Implementada en `MicrosService` con la **Fórmula Haversine** ejecutada directamente en SQL, filtrando únicamente los micros activos cuya distancia es $\le 5\text{ km}$ desde la ubicación del usuario.
* **Control de Capacidad:** El endpoint de pasajeros valida que la suma de pasajeros a bordo nunca exceda el límite autorizado del micro (entre 18 y 25).
* **Garantía de No Doble Cobro en Trasbordos:** Al procesar un pago, el servicio verifica si el pasajero cuenta con un boleto emitido dentro de las últimas 2 horas en un micro que haya registrado un trasbordo hacia la unidad actual. Si califica, el monto cobrado es **Bs. 0.00**.
* **Pasarela de Pagos Segura:** Procesa transacciones de tarjeta validando la estructura del plástico sin guardar números sensibles ni CVV en la base de datos, emitiendo un código de ticket único.

---

## 4. Guía Detallada para el Desarrollador Frontend (Next.js)

Para consumir la API desde Next.js, toda petición `fetch` debe apuntar a `http://localhost:3001/api` e incluir `credentials: 'include'` para que el navegador envíe la cookie de sesión automáticamente.

```typescript
// Ejemplo de configuración de llamada
const res = await fetch('http://localhost:3001/api/auth/me', {
  credentials: 'include'
});
```

### Catálogo de Endpoints

#### 1. Autenticación (`/api/auth`)
| Método | Endpoint | Descripción | Body (JSON) |
|---|---|---|---|
| `POST` | `/api/auth/register` | Registrar nuevo usuario | `{ "username": "...", "password": "...", "nombreCompleto": "...", "categoria": "UNIVERSITARIO", "codEst": "...", "emailUpds": "...@upds.edu.bo" }` |
| `POST` | `/api/auth/login` | Iniciar sesión y fijar cookie | `{ "username": "admin", "password": "Admin12" }` |
| `GET` | `/api/auth/me` | Obtener datos del usuario activo | Ninguno |
| `POST` | `/api/auth/logout` | Cerrar sesión y limpiar cookie | Ninguno |
| `PATCH` | `/api/auth/validar-estudiante/:id` | Validar credencial (Solo Admin) | `{ "aprobado": true }` |

#### 2. Líneas y Micros (`/api/lineas` y `/api/micros`)
| Método | Endpoint | Descripción | Parámetros / Body |
|---|---|---|---|
| `GET` | `/api/lineas` | Catálogo público de líneas | Ninguno |
| `GET` | `/api/lineas/:id` | Detalle de una línea | ID en ruta |
| `GET` | `/api/micros` | Listado general de micros | Ninguno |
| `GET` | `/api/micros/cercanos` | Micros a menos de 5 km | Query: `?lat=-17.7833&lng=-63.1821&radio=5` |
| `PATCH`| `/api/micros/:id/pasajeros` | Subir o bajar pasajeros | `{ "accion": "SUBIR", "cantidad": 2 }` |
| `PATCH`| `/api/micros/:id/ubicacion` | Actualizar GPS del micro | `{ "latitud": -17.7850, "longitud": -63.1810 }` |
| `POST` | `/api/micros` | Crear micro (Solo Admin) | `{ "placa": "3045-XYZ", "interno": "17-01", "capacidad": 22, "lineaId": 1 }` |

#### 3. Tarifas (`/api/tarifas`)
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/tarifas` | Devuelve tarifas oficiales (General, Universitario, Escolar, Adulto Mayor) |
| `PATCH`| `/api/tarifas/:id` | Modificar tarifa oficial (Solo Admin) |

#### 4. Pagos y Boletos (`/api/pagos`)
| Método | Endpoint | Descripción | Body (JSON) |
|---|---|---|---|
| `POST` | `/api/pagos/pagar` | Procesar pago con tarjeta | `{ "microId": 1, "numeroTarjeta": "4500123456789012", "nombreTitular": "...", "fechaVencimiento": "12/28", "cvv": "123" }` |
| `GET` | `/api/pagos/mis-pagos` | Historial de pagos del usuario | Ninguno (Usa la sesión) |
| `GET` | `/api/pagos/verificar/:codigoTicket` | Chofer valida boleto del pasajero | Código de ticket en la ruta |

#### 5. Trasbordos y Notificaciones (`/api/trasbordos` y `/api/notificaciones`)
| Método | Endpoint | Descripción | Body (JSON) |
|---|---|---|---|
| `POST` | `/api/trasbordos` | Realizar trasbordo de pasajeros | `{ "microOrigenId": 1, "microDestinoId": 2, "motivo": "FALLA_MECANICA" }` |
| `GET` | `/api/trasbordos` | Historial de trasbordos | Ninguno |
| `GET` | `/api/notificaciones` | Lista de avisos y emergencias | Ninguno |
| `PATCH`| `/api/notificaciones/:id/leido` | Marcar aviso como leído | ID en ruta |

---

## 5. Guía de Defensa para el Examen con el Ingeniero

Para explicar con solvencia el funcionamiento del sistema ante el docente:

### 1. ¿Cómo se conectan el Frontend, Backend y Base de Datos?
> *"El frontend en Next.js no se conecta directamente a la base de datos por seguridad. El navegador hace peticiones HTTP REST en formato JSON a nuestro servidor NestJS (puerto 3001). NestJS valida la sesión mediante cookies seguras (`connect-pg-simple`) y ejecuta consultas SQL nativas con `pg.Pool` hacia nuestra base de datos PostgreSQL alojada en Supabase bajo conexión cifrada SSL."*

### 2. ¿Cómo resolvieron la persistencia si no tenían Docker instalado?
> *"Para garantizar la alta disponibilidad y evitar depender de Docker en local, desplegamos la base de datos PostgreSQL en Supabase. Configuramos el Connection Pool en NestJS con soporte SSL (`rejectUnauthorized: false`), lo que permite que el backend mantenga la persistencia en la nube 24/7."*

### 3. ¿Cómo funciona la búsqueda de micros a 5 km (Haversine)?
> *"En lugar de descargar todos los micros a la memoria de Node.js y calcular distancias en JavaScript, delegamos el cálculo directamente al motor PostgreSQL mediante la fórmula trigonométrica de Haversine dentro de la cláusula WHERE. Esto permite filtrar en milisegundos los vehículos que están dentro del radio de 5 km respecto a la latitud y longitud enviadas por el usuario."*

### 4. ¿Cómo controlan que el micro no supere su capacidad autorizada?
> *"Aplicamos una doble validación: a nivel de base de datos tenemos un `CHECK (capacidad BETWEEN 18 AND 25)` y un `CHECK (pasajeros_actuales <= capacidad)`. A nivel de backend, el servicio `MicrosService` verifica que si `pasajeros_actuales + cantidad > capacidad`, arroje una excepción HTTP `400 Bad Request` indicando el espacio disponible restante."*

### 5. ¿Cómo garantizan que el pasajero no pague doble en un trasbordo?
> *"Cuando un micro registra un trasbordo hacia otra unidad (sea por cambio de turno o emergencia mecánica), queda registrado en la tabla `trasbordos`. Al procesar un pago en la unidad de destino, el backend busca si el usuario tiene un pago reciente en el micro de origen. Si existe un trasbordo vinculado, el sistema emite el boleto con un monto de Bs. 0.00 y marca `es_trasbordo_gratuito = true`."*

### 6. ¿Cómo cumplen con la seguridad en los pagos con tarjeta?
> *"Cumplimos con las normas de seguridad evitando almacenar números de tarjeta completos o códigos CVV en las tablas. El sistema procesa la transacción simulando una pasarela certificada y solo persiste el identificador de boleto, los últimos 4 dígitos y el estado del cobro."*
