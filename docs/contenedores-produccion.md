# Contenedores de producción

La preparación del repositorio no crea recursos Azure. `compose.yaml` continúa
siendo exclusivamente desarrollo local. Las imágenes son Linux/amd64, con Node 24
y Nginx sin privilegios; las bases están fijadas por digest y deben actualizarse
deliberadamente con sus validaciones.

## Construcción desde la raíz (PowerShell)

```powershell
$StrOrigenBackend = 'https://<hostname-real-del-backend>'
docker build --platform linux/amd64 --target runtime --build-arg "VITE_API_ORIGIN=$StrOrigenBackend" -t granja/frontend:azure-prep frontend
docker build --platform linux/amd64 --target runtime -t granja/backend:azure-prep backend
docker build --platform linux/amd64 --target operaciones -t granja/operaciones:azure-prep backend
```

Para una publicación, sustituir `azure-prep` por un identificador inmutable de
release/commit aprobado. No reutilizar un tag publicado. No se publica ninguna
imagen automáticamente.

`VITE_API_ORIGIN` es público y se incorpora al build. Debe ser un origen HTTPS,
sin `/api`, credenciales ni query. Cambiarlo requiere reconstruir frontend.
El build falla si está vacío o usa localhost/HTTP. En desarrollo puede omitirse
y Vite mantiene el proxy `/api` a localhost:3000.

## Runtime y Portal

Frontend: target port **8080**, probe `/healthz`, SPA fallback hacia `index.html`.
Backend: target port **3000**, readiness `/api/health`, liveness
`/api/health/live`. Las probes del contenedor no sustituyen las probes configuradas
en Container Apps. Mantener HTTPS obligatorio y una réplica por app inicialmente.

Backend requiere:

| Variable | Valor de producción |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | Secret con usuario runtime, `encrypt=true;trustServerCertificate=false` |
| `CORS_FRONTEND_ORIGIN` | Origen HTTPS exacto del frontend, sin barra final |
| `TRUST_PROXY_HOPS` | `1` para ingress directo; verificar IP efectiva en Azure |
| `SESSION_DURATION_HOURS` | `8` |
| `AZURE_BLOB_CONTAINER_ANIMALES` | `animales` |
| `AZURE_STORAGE_ACCOUNT_URL` | `https://<cuenta>.blob.core.windows.net` |

Omitir `AZURE_STORAGE_CONNECTION_STRING` y
`AZURE_STORAGE_MANAGED_IDENTITY_CLIENT_ID` con identidad de sistema. El backend
usa DefaultAzureCredential y requiere Storage Blob Data Contributor sobre el
contenedor privado precreado. Producción no crea contenedores y rechaza connection
strings. Una mala configuración o caída Blob afecta fotografías, no el arranque.
Se verifica privacidad bajo demanda y se reintenta en la siguiente operación;
las verificaciones concurrentes se comparten y cada solicitud de almacenamiento
tiene límite temporal y reintentos acotados.

CORS lo gestiona Express: no duplicarlo en el ingress. La cookie conserva
HttpOnly, Secure, SameSite Strict, Path=/api y expiración absoluta. El frontend
envía credentials en JSON, fotografías y CSV. Producción rechaza operaciones
mutables sin Origin exacto, incluidas login y multipart. En desarrollo se permite
omitir Origin para las herramientas CLI existentes; un Origin ajeno se rechaza
también localmente. Verificar cookies en navegador con los hostnames Azure reales;
no relajar SameSite para solucionar un problema de dominios.

## Imagen de operaciones

Su entrypoint admite únicamente `status`, `migrate` y `bootstrap`:

- `status`: `prisma migrate status` (predeterminado).
- `migrate`: `prisma migrate deploy`, nunca migrate dev/reset/db push.
- `bootstrap`: `node dist/src/scripts/bootstrap-usuarios.js`.

Todas exigen `DATABASE_URL` y `BASE_DATOS_ESPERADA` y consultan `DB_NAME()` antes
de actuar. Usar credencial separada de migración en un Job manual, sin ingress ni
ejecuciones concurrentes. No ejecutar estos comandos al arrancar la API.
La imagen conserva exactamente las 11 migraciones oficiales.

Bootstrap exige `BOOTSTRAP_WEBMASTER_NOMBRE_COMPLETO`,
`BOOTSTRAP_WEBMASTER_USUARIO`, `BOOTSTRAP_WEBMASTER_CORREO` y, para creación
inicial, `BOOTSTRAP_WEBMASTER_CONTRASENA`. Guardar la contraseña como secret
temporal y retirarla después. Bootstrap sigue siendo transaccional/idempotente,
con timeout explícito de 120 segundos. No importar datos locales.

Ni las credenciales runtime ni las de operaciones deben entrar al build, al
repositorio o a un `.env.production`. Los `.dockerignore` excluyen secretos,
node_modules locales, temporales y backups. Runtime backend excluye fuentes,
tests, scripts de operación y Prisma CLI. La imagen de operaciones conserva
herramientas de desarrollo necesarias para Prisma y se usa solo puntualmente.

## Validación local reproducible

Docker Desktop debe estar en modo Linux. Los dos primeros comandos construyen
targets de pruebas; los siguientes usan Node 24 dentro de esos contenedores.

```powershell
docker build --platform linux/amd64 --target compilacion -t granja-backend-pruebas:azure-prep backend
docker build --platform linux/amd64 --target pruebas -t granja-frontend-pruebas:azure-prep frontend
docker run --rm granja-frontend-pruebas:azure-prep sh -c 'npm run typecheck && npm test'
node backend/docker/validar-local.mjs tests
node backend/docker/validar-local.mjs runtime
node backend/docker/validar-local.mjs operaciones
git diff --check
```

El helper requiere las dependencias backend instaladas en el host para leer dotenv.
Solo admite el SQL de `.env` en localhost:1433; transforma el host para Docker y
no imprime la credencial. `tests` y `runtime` realizan consultas, sin modificar
datos. `operaciones` ejecuta solo status y comprueba rechazo de una BD equivocada.
Nunca ejecuta migrate ni bootstrap. Los contenedores de runtime que crea se
eliminan al terminar.

La prueba HTTP de Blob usa un servidor local simulado y mocks de consultas Prisma;
comprueba 401 sin sesión, 503 fotográfico, health disponible, recuperación sin
reinicio y liveness independiente de SQL. No contacta Azure ni crea datos reales.
La prueba runtime conecta Prisma/MSSQL a SQL local y verifica argon2, sharp,
configuración Blob inválida, ausencia de archivos sensibles y cierre por SIGTERM.

Las pruebas de identidad administrada, certificado SQL Azure, red del ingress y
cookies reales requieren los recursos del Portal y quedan para aceptación Azure.

## Resultados de esta preparación

- Linux/amd64, Node **24.20.0**, Nginx **1.30.4**.
- `npm ci` ejecutado para ambos proyectos dentro de Linux.
- Backend: typecheck, **118 tests**, build y Prisma validate correctos.
- Frontend: typecheck, **158 tests / 40 archivos** y build correctos.
- Build frontend sin `VITE_API_ORIGIN`: rechazo esperado.
- Nginx: configuración válida, `/healthz` 200, ruta profunda con el mismo HTML,
  index con `no-cache`, `/api/...` y asset inexistente con 404, UID 101.
- Runtime backend: argon2, sharp, Prisma/adapter MSSQL con SELECT real a SQL local,
  health/liveness con Blob mal configurado y SIGTERM con salida 0.
- Blob: 503 y recuperación comprobados mediante HTTP simulado local, SDK real y
  repositorio simulado; SQL/liveness permanecen independientes.
- Operaciones: status local **11/11**, sin pendientes; base equivocada rechazada.
- `git diff --check` correcto; schema, migraciones y lockfiles sin cambios.
- Sin Azure CLI, recursos Azure, ACR push, migrate deploy ni bootstrap ejecutados.
- Contenedores temporales retirados; los servicios Compose existentes continúan.

| Imagen local | Tamaño sin comprimir (bytes) | MB decimales aproximados |
| --- | ---: | ---: |
| `granja/frontend:azure-prep` | 61474372 | 61.5 |
| `granja/backend:azure-prep` | 433708265 | 433.7 |
| `granja/operaciones:azure-prep` | 706246056 | 706.2 |

La imagen frontend de validación incorpora `https://backend.example.invalid`;
reconstruirla con el hostname real antes de publicar.

Pendientes conocidos: chunk frontend de aproximadamente 958 kB minificado y
advisories de dependencias existentes. `npm audit` completo reporta 6 (5 high,
1 moderate); el runtime podado conserva 1 moderate (`qs`). Las herramientas
Prisma concentran advisories cuya corrección propuesta incluye downgrade mayor;
no se ejecutó audit fix ni se cambiaron versiones/lockfiles. Revisar esta deuda
de dependencias separadamente antes de habilitar producción.

## Inventario de archivos

**Creados (15):**

- `backend/Dockerfile`, `backend/.dockerignore`.
- `backend/docker/operaciones.mjs`, `backend/docker/validar-local.mjs`.
- `backend/src/middleware/origen.middleware.ts`, `backend/src/middleware/origen.middleware.test.ts`.
- `backend/src/storage/almacenamiento-blob.test.ts`, `backend/src/storage/almacenamiento-http.test.ts`.
- `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/nginx.conf`.
- `frontend/src/services/api-origen.ts`, `frontend/src/services/api-origen.test.ts`, `frontend/src/services/api-archivos.test.ts`.
- `docs/contenedores-produccion.md`.

**Modificados (16):**

- `.env.example`, `backend/package.json`.
- `backend/src/app.ts`, `backend/src/server.ts`.
- `backend/src/config/configuracion-entorno.ts`, `backend/src/config/configuracion-almacenamiento.test.ts`.
- `backend/src/middleware/manejo-errores.middleware.ts`.
- `backend/src/modules/salud/salud.controller.ts`, `backend/src/modules/salud/salud.routes.ts`.
- `backend/src/scripts/bootstrap-usuarios.ts`, `backend/src/storage/almacenamiento-blob.ts`.
- `frontend/src/services/api.service.ts`, `frontend/src/services/produccion.service.ts`, `frontend/src/services/reportes.service.ts`.
- `frontend/vite.config.ts`, `frontend/tsconfig.json`.
