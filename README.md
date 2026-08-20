# Granja El Chiflón

Sistema web para la administración de registros y trazabilidad de la Granja El Chiflón.

## Backend

La API utiliza Node.js, Express, TypeScript, Prisma 7 y Microsoft SQL Server. Su fundación inicial expone:

```text
GET /api/health
```

El modulo Usuarios utiliza una sesion opaca en una cookie `HttpOnly`.
SQL Server conserva solamente el hash SHA-256 del token y las contrasenas se
protegen con Argon2id.

El endpoint comprueba la conexión real siguiendo el flujo Route → Controller → Service → Repository → Prisma → SQL Server.

### Configuración local

1. Copiar `.env.example` como `.env` y sustituir exclusivamente los valores de ejemplo por valores locales seguros.
2. Iniciar SQL Server con Docker Compose desde la raíz del repositorio.
3. Ejecutar desde `backend/`:

```bash
npm install
npx prisma migrate status
npx prisma generate
npm run dev
```

Variables del backend:

- `DATABASE_URL`: obligatoria; cadena de conexión de SQL Server.
- `PORT`: opcional; utiliza `3000` de forma predeterminada.
- `NODE_ENV`: `development`, `test` o `production`; utiliza `development` de forma predeterminada.
- `SESSION_DURATION_HOURS`: duracion absoluta de una sesion; utiliza `8` de forma predeterminada.

`DB_SA_PASSWORD` es consumida por Docker Compose y `DB_NAME` documenta el nombre local esperado. No deben versionarse credenciales reales.

### Bootstrap de Usuarios

La base vacia se inicializa mediante un script idempotente. Las variables
`BOOTSTRAP_ADMIN_NOMBRE_COMPLETO`, `BOOTSTRAP_ADMIN_USUARIO`,
`BOOTSTRAP_ADMIN_CORREO` y `BOOTSTRAP_ADMIN_CONTRASENA` deben proporcionarse
solo al ejecutar:

```bash
npm run usuarios:bootstrap
```

Una ejecucion posterior no reemplaza credenciales ni duplica permisos. No se
deben guardar los valores reales en archivos versionados, documentacion o logs.

Las sesiones vencidas pueden cerrarse sin eliminar historial mediante:

```bash
npm run usuarios:expirar-sesiones
```

Tanto el bootstrap como el cierre de sesiones vencidas requieren
`BASE_DATOS_ESPERADA`, que debe coincidir exactamente con la base configurada.
Esta comprobación evita ejecutar escrituras administrativas contra una base
distinta de la prevista.

El backend no configura CORS todavia. Si React se sirve desde otro origen,
debe definirse un origen permitido concreto y habilitar credenciales; nunca se
debe combinar `Access-Control-Allow-Origin: *` con cookies autenticadas.

El login aplica temporalmente un limite en memoria por la IP observada por
Express. Antes de produccion en Azure Container Apps se debe verificar la
topologia del proxy inverso, el manejo real de `X-Forwarded-For`, una
configuracion restringida de `trust proxy` y un store distribuido para varias
replicas. La aplicacion no confia manualmente en encabezados enviados por el
cliente.

### Política temporal

La zona funcional única del sistema es `America/Guatemala`, equivalente a
`Central America Standard Time` en SQL Server.

- `DATETIME2(7)` almacena componentes de hora civil Guatemala.
- `DATE` almacena una fecha civil sin hora ni conversión de zona.
- `Fecha_`, en `backend/src/datetime/fecha.ts`, es la frontera obligatoria
  entre instantes reales de JavaScript y valores `DATETIME2` de Prisma.
- Un `Date` leído desde un `DATETIME2` Guatemala no debe tratarse directamente
  como instante mediante `getTime()` o `toISOString()` sin pasar por `Fecha_`.
- La política no depende del timezone configurado en Windows, Docker, Node o
  Azure SQL.
- No se deben restar o sumar seis horas manualmente en Controllers, Services o
  Repositories.

### Frontend local

El frontend utiliza React, TypeScript y Vite. En desarrollo se sirve en
`http://localhost:5173` y reenvía las solicitudes `/api` a la API local en
`http://localhost:3000`. Este proxy permite conservar el flujo same-origin de
la cookie de sesión sin habilitar CORS.

```bash
cd frontend
npm install
npm run dev
```

La autenticación permanece únicamente en memoria y se recupera mediante
`GET /api/usuarios/sesion`. El frontend nunca almacena tokens, utiliza
`credentials: "include"` en todas las solicitudes y no intenta leer la cookie
`HttpOnly`.

Comandos de validación del frontend:

```bash
npm run typecheck
npm run build
npm test
npm audit
```

### Validación

```bash
npm test
npm run typecheck
npm run build
npx prisma validate
npx prisma migrate status
```
