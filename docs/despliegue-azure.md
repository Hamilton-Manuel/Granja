# Azure: infraestructura y operación de producción

Estado informado por el responsable del proyecto al 8 de septiembre de 2026.
Este inventario no representa una auditoría mediante consultas a Azure.
El repositorio es `Hamilton-Manuel/Granja` y la rama de producción es `master`.
El CI/CD está **implementado en el repositorio local** en
[deploy-azure.yml](../.github/workflows/deploy-azure.yml). Se activará al publicar
el workflow en GitHub; esta implementación no acredita una ejecución en Azure.

Este documento es el runbook de infraestructura y operación. Los targets,
contenidos de imágenes, requisitos de build y validaciones Docker se describen
en [Contenedores de producción](contenedores-produccion.md).
Los comandos siguientes son instrucciones para un operador autorizado; no se
ejecutan por crear o actualizar esta documentación.

## Inventario de infraestructura Azure

### 1. Resource Group

- **`rg-granja-el-chiflon`**: contiene toda la infraestructura del proyecto.
- Es el ámbito del permiso Contributor de la identidad de despliegue GitHub.

### 2. Azure Container Registry

- **`acrgranjaelchiflon26`**, South Central US, SKU Basic.
- Almacena los repositorios `granja/backend`, `granja/frontend` y `granja/operaciones`.
- Admin user deshabilitado; no utilizar usuario/contraseña del registro.
- La identidad GitHub tiene **AcrPush**. Las identidades que consumen imágenes
  requieren **AcrPull** sobre este ACR.
- Usa **TenantReuse**: el login server contiene un hash. Consultar siempre
  `loginServer`; no construirlo concatenando el nombre con `.azurecr.io` ni
  inferir el nombre del recurso desde el hostname.

### 3. Container Apps Environment

- **`cae-granja-el-chiflon`**, West US 3, Consumption.
- Aloja frontend, backend y Job de migraciones.
- Asociado al workspace `workspacegranjaelchiflon8f2a` para logs.

### 4. Backend Container App

- **`ca-granja-backend`**, West US 3; imagen `granja/backend`.
- Puerto **3000**, **0.5 CPU / 1 GiB**, ingress HTTPS público.
- Escalado inicial **recomendado**: mínimo 1 / máximo 1; no se presenta esta
  recomendación como comprobación del escalado configurado actualmente.
- Readiness: `/api/health`; liveness: `/api/health/live`.
- Usuario SQL runtime: **`granja_runtime`**.
- Managed Identity de sistema para Blob, con **Storage Blob Data Contributor**
  sobre `stgranjaelchiflon26`. La identidad que descarga su imagen necesita AcrPull.

| Variable del backend | Configuración |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `SESSION_DURATION_HOURS` | `8` |
| `TRUST_PROXY_HOPS` | `1` |
| `AZURE_BLOB_CONTAINER_ANIMALES` | `animales` |
| `AZURE_STORAGE_ACCOUNT_URL` | `https://stgranjaelchiflon26.blob.core.windows.net` |
| `CORS_FRONTEND_ORIGIN` | Origen HTTPS real del frontend, sin barra final |
| `DATABASE_URL` | Referencia al secret `database-url` del backend; valor omitido |

La identidad de sistema evita credenciales de Storage en la aplicación.
No configurar connection strings de Storage ni Shared Key.

### 5. Frontend Container App

- **`ca-granja-frontend`**, West US 3; imagen `granja/frontend`.
- Puerto **8080**, Nginx no privilegiado, ingress HTTPS público.
- Health check: `/healthz`.
- `VITE_API_ORIGIN` se incorpora durante `docker build` y apunta al origen
  HTTPS real del backend. Cambiar una variable runtime no modifica ese build.
- La identidad que descarga su imagen necesita AcrPull sobre el ACR.

### 6. Container Apps Job

- **`job-granja-migraciones`**, West US 3, trigger **Manual**.
- `parallelism=1`, `replicaCompletionCount=1`, `replicaRetryLimit=0`,
  `replicaTimeout=900` segundos; **0.5 CPU / 1 GiB**.
- Imagen `granja/operaciones`, argumento **`migrate`**.
- `DATABASE_URL` referencia al secret `database-url` propio del Job, con el
  usuario SQL **`granja_migraciones`**; no es la credencial runtime.
- `BASE_DATOS_ESPERADA=sqldb-granja-el-chiflon`.
- Managed Identity de sistema y **AcrPull** sobre el ACR.
- Una ejecución manual de validación ya terminó en **Succeeded**.
- No ejecutar bootstrap automáticamente. `parallelism=1` limita réplicas de
  una ejecución; los operadores también deben evitar ejecuciones simultáneas.

### 7. Azure SQL Server

- **`sql-granja-el-chiflon-26`**, West US 3, autenticación SQL configurada.
- Red pública con firewall: permite recursos Azure y una regla específica para
  la IP del cliente cuando se necesita administración local.
- La opción de permitir recursos Azure no equivale a restringir el acceso al
  resource group del proyecto; sigue siendo necesaria la autenticación SQL.
- Agregar únicamente la IP pública necesaria para administración local y retirar
  la regla temporal al terminar. No abrir rangos generales como solución a fallos.

### 8. Azure SQL Database

- **`sqldb-granja-el-chiflon`**, West US 3, **Basic / 5 DTU / 2 GB**.
- **11 migraciones oficiales aplicadas** en el estado inicial informado.
- Producción inició limpia, sin copiar datos de desarrollo; bootstrap inicial
  ya ejecutado. Las nuevas migraciones cambiarán ese conteo histórico.
- Usuarios separados: `granja_runtime` para lectura/escritura de la aplicación;
  `granja_migraciones` para migraciones/DDL.
- Las credenciales y las URLs reales de conexión no se documentan en Git.

### 9. Storage Account

- **`stgranjaelchiflon26`**, South Central US, **Standard LRS**, nivel **Hot**.
- Contenedor privado **`animales`**; acceso anónimo deshabilitado.
- **Shared Key deshabilitado**, TLS mínimo **1.2**.
- Almacena fotografías mediante la Managed Identity del backend y su permiso
  Storage Blob Data Contributor.
- ACR y Storage permanecen en South Central US: **no se recrearon** al ubicar
  SQL, Container Apps y Job en West US 3.

### 10. Log Analytics Workspace

- **`workspacegranjaelchiflon8f2a`**, West US 3.
- Recibe logs del Container Apps Environment; permite correlacionar eventos
  del backend, frontend y ejecuciones del Job.

### 11. Managed Identity GitHub

- **`id-github-granja-deploy`**, West US 3, identidad administrada con federación OIDC.
- Repositorio federado: **`Hamilton-Manuel/Granja`**, rama **`master`**.
- Sujeto de rama: `repo:Hamilton-Manuel/Granja:ref:refs/heads/master`.
- **Contributor** sobre `rg-granja-el-chiflon` y **AcrPush** sobre `acrgranjaelchiflon26`.
- Sin client secret. Contributor no concede por sí mismo administración de
  asignaciones RBAC; los cambios de permisos requieren un operador habilitado.

## Relaciones y permisos

```text
GitHub Hamilton-Manuel/Granja · master
  └─ OIDC → id-github-granja-deploy
       ├─ Contributor → rg-granja-el-chiflon
       └─ AcrPush → acrgranjaelchiflon26 (South Central US)
                    ├─ granja/backend ──────→ ca-granja-backend
                    ├─ granja/frontend ─────→ ca-granja-frontend
                    └─ granja/operaciones ──→ job-granja-migraciones
                         descarga mediante identidades con AcrPull

cae-granja-el-chiflon (West US 3)
  ├─ ca-granja-frontend → navegador → HTTPS ca-granja-backend
  ├─ ca-granja-backend
  │    ├─ granja_runtime → sql-granja-el-chiflon-26 / sqldb-granja-el-chiflon
  │    └─ Managed Identity + Storage Blob Data Contributor
  │         → stgranjaelchiflon26 / animales (privado, South Central US)
  ├─ job-granja-migraciones
  │    └─ granja_migraciones → misma base SQL (DDL)
  └─ logs → workspacegranjaelchiflon8f2a

GitHub Actions: workflow implementado; publicación y primera ejecución pendientes.
```

## Repository Variables de GitHub

Son configuración de despliegue, no secretos. Los identificadores concretos de
tenant, suscripción y cliente se mantienen en GitHub; no se repiten aquí.

| Variable | Propósito |
| --- | --- |
| `AZURE_CLIENT_ID` | Client ID de la identidad administrada federada de GitHub |
| `AZURE_TENANT_ID` | Tenant de Microsoft Entra para autenticación OIDC |
| `AZURE_SUBSCRIPTION_ID` | Suscripción que contiene los recursos |
| `AZURE_RESOURCE_GROUP` | Nombre del resource group de destino |
| `AZURE_ACR_NAME` | Nombre del recurso ACR, nunca su login server |
| `AZURE_BACKEND_APP` | Nombre de la Container App backend |
| `AZURE_FRONTEND_APP` | Nombre de la Container App frontend |
| `AZURE_MIGRATION_JOB` | Nombre del Job existente de migraciones |
| `BACKEND_FQDN` | Hostname real del backend, sin `https://` ni rutas |

La autenticación del workflow utiliza OIDC con `azure/login@v2`, las tres
variables de identidad y permisos `contents: read` / `id-token: write`.
No utiliza passwords Azure, service principal secrets, credenciales ACR o SQL
de producción en GitHub. No usa un GitHub Environment que cambie el sujeto
federado de rama existente.

## CI/CD de producción con GitHub Actions

### Disparadores y detección

- **Push a `master`**: valida y despliega automáticamente los componentes
  cambiados entre `github.event.before` y `github.sha`, con `fetch-depth: 0`.
  Un primer push con SHA anterior cero se compara con el árbol vacío. Si Git
  no puede resolver la base, el workflow falla; no adivina un commit alternativo.
- **`workflow_dispatch`**: únicamente en `master`, con `desplegar=false` por
  defecto. Sin `base_sha`, valida ambos proyectos comparando con el árbol vacío,
  sin autenticarse en Azure, publicar imágenes o ejecutar el Job.
- Con `base_sha`, compara esa base con el SHA de `master` seleccionado para la
  ejecución y valida solo lo cambiado. Debe ser un SHA completo de 40 caracteres,
  existente y ancestro del destino. Con `desplegar=true`, la base es obligatoria;
  nunca se asume el commit anterior. Una base igual al destino produce un diff vacío.
- `git diff --no-renames --name-only -z` incluye altas, modificaciones, borrados
  y ambas rutas de un traslado; trata de forma segura nombres con espacios.
  `backend/**` y `frontend/**` seleccionan sus componentes;
  `backend/prisma/migrations/**` activa migraciones y
  `backend/prisma/schema.prisma` activa la comprobación de esquema.
- Si cambia el esquema sin cambios bajo migraciones, falla con
  **«schema.prisma cambió sin una migración versionada»** antes de publicar.
  Esta comprobación de rutas no demuestra por sí sola que el SQL sea correcto:
  las migraciones requieren revisión y no deben editar historial ya aplicado.
- Si solo cambian docs, README o el propio workflow, se informa
  **«No hay componentes desplegables»**. No hay login Azure, builds de imágenes
  ni despliegues. Para comprobar ambos proyectos tras modificar CI, usar la
  ejecución manual de validación sin base.

### Jobs y orden

| Job | Dependencias y comportamiento |
| --- | --- |
| `detectar-cambios` | Siempre; calcula cuatro flags y si está habilitado desplegar |
| `validar-backend` | Detección correcta y backend cambiado; Node 24, SQL temporal y suite existente |
| `validar-frontend` | Detección correcta y frontend cambiado; Node 24 y origen HTTPS de `BACKEND_FQDN` |
| `desplegar-backend` | Detección y validaciones necesarias correctas; publica, migra si corresponde, actualiza backend y verifica health |
| `desplegar-frontend` | Validación frontend correcta; además espera éxito completo del backend si cambió; publica, actualiza y verifica health |
| `resultado` | Se ejecuta incluso ante fallos/omisiones; resume resultados y falla si faltó una validación o despliegue esperado |

Las validaciones pueden correr en paralelo. Los jobs de despliegue utilizan
`always() && !cancelled()` y comprueban resultados explícitos para aceptar
`skipped` solo cuando el componente dependiente no cambió. Si cambian ambos,
las dos validaciones deben aprobar antes de empezar a publicar backend, y todo
el procesamiento backend termina antes de publicar frontend.

### SQL temporal y builds

Backend ejecuta `npm ci`, generación del cliente Prisma necesaria para un
checkout limpio, `npm run typecheck`, `npm test` y `npm run build`. El propio
runner inicia SQL Server 2022 CU25 Developer Linux/amd64 en Docker, accesible
solo por `127.0.0.1:1433`, y crea una base vacía `granja_ci`. La suite actual
conserva su comprobación de conectividad real con `SELECT 1`.
Cuando `migrations_changed=true`, después de generar el cliente Prisma y antes
de typecheck/tests/build, ejecuta **`npx prisma migrate deploy`** y
**`npx prisma migrate status`** contra esa misma base efímera, usando exclusivamente
la `DATABASE_URL` temporal del proceso. Este preflight comprueba la aplicación
del historial versionado desde cero. Sin cambios de migraciones, se omite.
Si cualquiera de ambos comandos falla, falla `validar-backend`: no hay login
Azure, publicación backend ni ejecución del Job de producción; frontend también
queda bloqueado cuando backend forma parte de la entrega.

La contraseña se genera con OpenSSL durante el job. Contraseña y URL se
enmascaran y se mantienen en el entorno efímero del proceso/contenedor; no se
escriben a `GITHUB_ENV`, outputs, archivos o artefactos. No se usa Azure SQL.
Un trap y un paso `always()` eliminan el contenedor y sus volúmenes anónimos;
el runner alojado en GitHub también es descartable.

Frontend ejecuta `npm ci`, typecheck, tests y build, con
`VITE_API_ORIGIN=https://${BACKEND_FQDN}`. Las imágenes de publicación usan los
Dockerfiles existentes, Linux/amd64 y el tag completo `github.sha`, nunca
`latest`. El login server se consulta con `az acr show` por nombre del recurso
y se usa `az acr login`. Si una imagen con ese SHA ya existe, se reutiliza sin
sobrescribirla; no se impone una política de bloqueo de tags sobre el registro.
Un cambio del origen incorporado en frontend requiere un nuevo commit/build.

### Migraciones, despliegue y health

Cuando cambian migraciones, el backend publica `granja/backend` y
`granja/operaciones` con el mismo SHA. Actualiza únicamente la imagen del Job
existente, lo inicia y conserva el nombre devuelto. Consulta **esa ejecución**
cada 10 segundos durante hasta 20 minutos, con límite de 60 segundos por consulta.
Solo `Running` y `Processing` permiten esperar; únicamente `Succeeded` permite
continuar. `Failed`, cualquier estado inesperado, timeout o error CLI fallan el
paso y bloquean la actualización backend y el frontend de la misma entrega.
El paso tiene además un límite total de 25 minutos.

Sin cambios en migraciones no se construye operaciones ni se ejecuta el Job.
El workflow no ejecuta bootstrap, no cambia secretos ni argumentos del Job y
no copia datos locales. Actualiza cada Container App mediante
`az containerapp update --name ... --resource-group ... --image ...`, sin
opciones que cambien variables, secretos, ingress, identidad, escalado o probes.

Después de cada actualización de imagen, el workflow captura
`properties.latestRevisionName` **de la respuesta de esa actualización**. Fija
ese nombre y consulta `az containerapp revision show` para esa app y esa revisión,
sin cambiar de revisión durante la espera. Comprueba su nombre y que contiene
la referencia de imagen exacta `granja/backend:${GITHUB_SHA}` o
`granja/frontend:${GITHUB_SHA}`, incluido el login server consultado del ACR.
Una revisión con imagen de otro commit falla aunque el hostname público esté saludable.

Exige simultáneamente `provisioningState=Provisioned`, `healthState=Healthy` y
`runningState=Running`. `Provisioning`, `Processing` y salud `None` (también
ausente/null) permiten continuar esperando, cada 10 segundos durante hasta
10 minutos, con límite de 60 segundos por consulta y 12 minutos para el paso.
`Failed`, `Degraded`, `Unhealthy`, `Stopped`, cualquier estado no admitido,
un `provisioningError` no vacío, error CLI o timeout fallan el despliegue.
Si falla esta comprobación backend, no se ejecuta su health público ni se
habilita el job frontend.

Solo después de verificar la revisión, backend debe responder HTTP 2xx en
`https://${BACKEND_FQDN}/api/health` antes de habilitar frontend. Este consulta
su FQDN real y exige HTTP 2xx en `/healthz`.
Ambos reintentan cada 10 segundos durante aproximadamente 5 minutos, con 5 segundos
para conexión y 15 por solicitud. No siguen redirecciones como señal de salud.
La salud de la revisión concreta ya no depende de la respuesta de una revisión
anterior en el FQDN estable. El workflow no modifica el reparto de tráfico;
para operación manual siguen aplicando las comprobaciones de tráfico del runbook.

### Operación, concurrencia y recuperación

Consultar **GitHub → Hamilton-Manuel/Granja → Actions → Producción Azure**:
grafo de jobs, logs de cada paso y resumen con flags, SHA, ejecución de migración
y resultados. El procedimiento normal es revisar el cambio, publicarlo en
`master` y supervisar esa ejecución; no se requiere un dispatch adicional.

`concurrency.group=granja-produccion`, **`queue=max`** y
`cancel-in-progress=false` mantienen una sola ejecución activa de producción
y encolan las siguientes, sin reemplazar deliberadamente ejecuciones pendientes
ni cancelar la ejecución activa. GitHub admite hasta **100 ejecuciones pendientes**;
si se llena la cola, cancela las adicionales. El orden FIFO corresponde al ingreso
en la cola, no garantiza el orden cronológico de los pushes. Esta concurrencia
no coordina comandos manuales externos ni recupera automáticamente los cambios
de un despliegue anterior fallido, porque el diff es el del push.
Ante fallos o ejecuciones que no llegaron a completarse, revisar el último
despliegue completo y usar un dispatch explícito con su SHA como base para
incluir todos los cambios pendientes. Si los componentes
quedaron en SHAs diferentes, elegir una base común anterior que cubra ambos.

Después de una cancelación manual o timeout, comprobar el Job en Azure antes
de reintentar: la ejecución remota puede continuar. No hay rollback automático.
Seguir el apartado **Rollback** para restaurar una imagen anterior compatible
con el esquema actual; revertir una imagen no revierte SQL. Para una emergencia,
seguir **Despliegue manual y de emergencia**, coordinando que no haya una
ejecución de Actions ni una migración en curso. Una primera ejecución real de
OIDC/ACR/Container Apps queda pendiente hasta publicar este workflow.

Referencias operativas: [consulta de una ejecución concreta del Job](https://learn.microsoft.com/en-us/cli/azure/containerapp/job/execution),
[estados de ejecución de Container Apps](https://learn.microsoft.com/en-us/java/api/com.azure.resourcemanager.appcontainers.models.jobexecutionrunningstate),
[consulta de una revisión concreta](https://learn.microsoft.com/en-us/cli/azure/containerapp/revision#az-containerapp-revision-show)
y [concurrencia de GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

## Despliegue manual y de emergencia

Los ejemplos son **Bash**, desde la raíz del repositorio, para un operador ya
autenticado con Azure CLI en la suscripción correcta y con permisos necesarios.
Las Repository Variables no se exportan automáticamente a la terminal local.
Coordinar una sola operación de producción a la vez, incluidas migraciones.

Preparar los nombres y consultar el registro real:

```bash
set -euo pipefail
AZURE_RESOURCE_GROUP=rg-granja-el-chiflon
AZURE_ACR_NAME=acrgranjaelchiflon26
AZURE_BACKEND_APP=ca-granja-backend
AZURE_FRONTEND_APP=ca-granja-frontend
AZURE_MIGRATION_JOB=job-granja-migraciones
SHA=$(git rev-parse HEAD)
ACR_LOGIN_SERVER=$(az acr show --name "$AZURE_ACR_NAME" --query loginServer -o tsv)
test -n "$ACR_LOGIN_SERVER"
az acr login --name "$AZURE_ACR_NAME"
BACKEND_FQDN=$(az containerapp show --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_BACKEND_APP" --query properties.configuration.ingress.fqdn -o tsv)
test -n "$BACKEND_FQDN"
```

Antes de construir, confirmar que el checkout corresponde al commit aprobado y
no tiene cambios locales. Consultar y guardar las imágenes actuales sin exportar
la configuración completa ni secretos:

```bash
az containerapp show -g "$AZURE_RESOURCE_GROUP" -n "$AZURE_BACKEND_APP" \
  --query 'properties.template.containers[].image' -o tsv
az containerapp show -g "$AZURE_RESOURCE_GROUP" -n "$AZURE_FRONTEND_APP" \
  --query 'properties.template.containers[].image' -o tsv
```

Ejecutar solo los bloques de los componentes que se desplegarán. Si el tag ya
existe, reutilizar la imagen publicada y verificada; no reconstruir sobre él.

```bash
# Backend runtime.
docker build --platform linux/amd64 --target runtime \
  -t "$ACR_LOGIN_SERVER/granja/backend:$SHA" backend
docker push "$ACR_LOGIN_SERVER/granja/backend:$SHA"

# Solo si hay migraciones versionadas nuevas: publicar operaciones con el mismo SHA.
docker build --platform linux/amd64 --target operaciones \
  -t "$ACR_LOGIN_SERVER/granja/operaciones:$SHA" backend
docker push "$ACR_LOGIN_SERVER/granja/operaciones:$SHA"

# Frontend: el origen se incorpora durante el build.
docker build --platform linux/amd64 --target runtime \
  --build-arg "VITE_API_ORIGIN=https://$BACKEND_FQDN" \
  -t "$ACR_LOGIN_SERVER/granja/frontend:$SHA" frontend
docker push "$ACR_LOGIN_SERVER/granja/frontend:$SHA"
```

Si corresponde, completar primero el procedimiento de migración de la sección
siguiente. Después, actualizar **únicamente la imagen** del backend:

```bash
az containerapp update --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_BACKEND_APP" --image "$ACR_LOGIN_SERVER/granja/backend:$SHA" \
  --output none
```

Con la revisión nueva saludable y el backend verificado, actualizar frontend:

```bash
az containerapp update --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_FRONTEND_APP" --image "$ACR_LOGIN_SERVER/granja/frontend:$SHA" \
  --output none
```

Estos comandos no solicitan cambios de secretos, variables, identidad, ingress
o escalado. No usar exportaciones completas de configuración para sustituir una
actualización de imagen. Un despliegue solo de frontend no requiere actualizar backend.

## Migraciones de producción

El único mecanismo de aplicación en producción es el **Job existente**. Su
entrypoint verifica `DB_NAME()` contra `BASE_DATOS_ESPERADA` y el argumento
`migrate` ejecuta `prisma migrate deploy`. El runtime no migra al arrancar.

No utilizar `prisma migrate dev`, `prisma migrate reset` ni `prisma db push`.
No modificar migraciones ya aplicadas. No ejecutar migraciones si no hay cambios
bajo `backend/prisma/migrations/`; no ejecutar bootstrap, ya realizado inicialmente.

Antes de iniciar, revisar el SQL nuevo y su compatibilidad con el backend que
seguirá atendiendo mientras corre el Job. Confirmar que no hay otra ejecución en
curso y que el Job conserva `args: migrate`, sus referencias a secretos y la base
esperada. Actualizar únicamente su imagen e iniciar una ejecución:

```bash
az containerapp job update --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_MIGRATION_JOB" --image "$ACR_LOGIN_SERVER/granja/operaciones:$SHA" \
  --output none
EJECUCION=$(az containerapp job start --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_MIGRATION_JOB" --query name -o tsv)
test -n "$EJECUCION"
printf 'Ejecución de migración: %s\n' "$EJECUCION"
az containerapp job execution show --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_MIGRATION_JOB" --job-execution-name "$EJECUCION" \
  --query properties.status -o tsv
```

Consultar **esa ejecución**, no simplemente la última del Job, cada 10 segundos
durante un máximo operativo de 20 minutos. `Running` permite seguir esperando;
solo **Succeeded** autoriza actualizar backend. Ante **Failed**, un estado
inesperado, un error de consulta o el agotamiento del tiempo, detener el despliegue.
No iniciar una segunda ejecución sin investigar la primera. Un timeout de espera
del operador no demuestra que el Job haya terminado: comprobar su estado antes
de cualquier reintento. No desplegar frontend de esa entrega si backend quedó bloqueado.

No leer, reemplazar o recrear el secret `database-url`. Los 900 segundos del Job
limitan la réplica; la ventana del operador también contempla el arranque.

### Incidente TenantReuse y AcrPull

El login server del ACR contiene un hash por TenantReuse. Azure CLI intentó
inferir incorrectamente el nombre del ACR al asignar AcrPull al Job. Se solucionó
asignando **AcrPull manualmente con el resource ID real del ACR** como ámbito.
Después, `job-granja-migraciones` fue probado manualmente y terminó **Succeeded**.

Para identificar el ámbito correcto, consultar el recurso por su nombre:

```bash
az acr show --name "$AZURE_ACR_NAME" --query id -o tsv
az acr show --name "$AZURE_ACR_NAME" --query loginServer -o tsv
```

Una reparación RBAC debe hacerla un operador con permiso de asignar roles,
usando ese ID y el principal de la identidad del consumidor. No activar el admin
user ni agregar contraseñas ACR como alternativa.

## Verificación de salud

Consultar el FQDN real del frontend y comprobar los tres endpoints:

```bash
FRONTEND_FQDN=$(az containerapp show --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_FRONTEND_APP" --query properties.configuration.ingress.fqdn -o tsv)
test -n "$FRONTEND_FQDN"
curl --fail --silent --show-error --connect-timeout 5 --max-time 15 \
  "https://$BACKEND_FQDN/api/health"
curl --fail --silent --show-error --connect-timeout 5 --max-time 15 \
  "https://$BACKEND_FQDN/api/health/live"
curl --fail --silent --show-error --connect-timeout 5 --max-time 15 \
  "https://$FRONTEND_FQDN/healthz"
```

- `/api/health` comprueba SQL Server; se espera HTTP 200 y JSON con `estado: ok`
  y `baseDatos: conectada`.
- `/api/health/live` comprueba vida de la API sin depender de SQL.
- `/healthz` comprueba Nginx; no demuestra acceso a SQL, login o Blob.

Durante un despliegue, reintentar cada 10 segundos durante hasta 5 minutos,
manteniendo límites por solicitud. Si no se recupera, detener la entrega y
diagnosticar. En el Portal, verificar además que la revisión nueva usa la imagen
esperada, está saludable y recibe el tráfico previsto: un 200 del hostname
público podría proceder de una revisión anterior. El modo actual de revisiones y
la distribución de tráfico no fueron especificados en el inventario.

Después de la salud técnica, comprobar carga del frontend, login y CORS desde
el navegador. SQL saludable no garantiza disponibilidad de fotografías; Blob
tiene diagnóstico separado. No crear datos de producción solo para probar la UI.

## Rollback

1. Detener la entrega y registrar el error, las revisiones y el estado exacto
   de cualquier ejecución de migración; evitar operaciones concurrentes.
2. Seleccionar la imagen anterior conocida y conservar su referencia completa
   con tag SHA o digest. No sobrescribir tags para simular rollback.
3. Comprobar compatibilidad de esa versión con el esquema **actual**. Revertir
   una imagen no revierte una migración SQL.
4. Actualizar solo la imagen de la app afectada con los comandos siguientes y
   repetir verificaciones de revisión, tráfico y salud.

```bash
# Definir previamente estas variables con referencias verificadas del registro.
az containerapp update -g "$AZURE_RESOURCE_GROUP" -n "$AZURE_BACKEND_APP" \
  --image "${IMAGEN_BACKEND_ANTERIOR:?Falta imagen anterior verificada}" --output none
az containerapp update -g "$AZURE_RESOURCE_GROUP" -n "$AZURE_FRONTEND_APP" \
  --image "${IMAGEN_FRONTEND_ANTERIOR:?Falta imagen anterior verificada}" --output none
```

Ejecutar únicamente el comando de cada componente que necesita rollback. Si se
restauran ambos, verificar backend antes de frontend. La imagen anterior del
frontend conserva el `VITE_API_ORIGIN` incorporado en su build.

Si el esquema impide usar la imagen anterior, preparar una corrección compatible
y una migración nueva revisada. Una recuperación de base de datos requiere un
procedimiento separado, autorización y evaluación de pérdida de datos; comprobar
primero los backups y puntos de restauración disponibles en Azure. Este inventario
no confirma una política de retención ni una restauración ensayada. No ejecutar
reset, editar el historial aplicado ni copiar una base local sobre producción.

## Diagnóstico y logs

| Síntoma | Revisar |
| --- | --- |
| Fallo de descarga de imagen | Login server real, existencia del tag, identidad del consumidor y AcrPull en el resource ID correcto |
| Fallo de publicación ACR | Suscripción, `az acr login` por nombre del recurso y AcrPush de la identidad publicadora |
| Fallo OIDC al utilizar la identidad preparada | Repositorio/rama del sujeto federado, tenant y client ID; no agregar client secrets |
| Job Failed o timeout | Ejecución concreta, logs de réplica, descarga de imagen, argumento `migrate`, base esperada, firewall y permisos DDL |
| Liveness 200 pero readiness falla | Conexión SQL, firewall, disponibilidad de SQL y referencia al secret runtime; no imprimir su valor |
| Revisión no saludable | Eventos de sistema, puerto 3000/8080, arranque, recursos y probes |
| Frontend carga pero API falla | Origen incorporado en build, FQDN backend, HTTPS y `CORS_FRONTEND_ORIGIN` exacto |
| Fallo de sesión en navegador | Cookies Secure/HttpOnly/SameSite Strict, hostnames y Origin; no relajar SameSite como arreglo improvisado |
| Fotografías fallan con API saludable | Managed Identity backend, Storage Blob Data Contributor, contenedor privado y URL de Storage |
| Lentitud SQL | Métricas DTU, conexiones, consultas y límite Basic de 5 DTU / 2 GB |

En Azure Portal:

- **Container Apps → app → revisiones y réplicas / flujo de logs**: consola y
  eventos de sistema de la revisión afectada.
- **Container Apps Job → historial de ejecuciones → ejecución y réplica**:
  salida y errores de la migración identificada por su nombre.
- **Log Analytics → `workspacegranjaelchiflon8f2a` → Logs**: historial centralizado
  del entorno; filtrar por app/Job, revisión y ventana temporal del incidente.
- **SQL Database → métricas** y **Storage → métricas**: disponibilidad, capacidad
  y errores. No asumir que se habilitaron diagnósticos adicionales de SQL/Storage.
- **Resource Group → Activity log**: cambios de configuración y operaciones de
  administración; **Access control (IAM)** para comprobar asignaciones.

Compartir solo extractos depurados de logs. No volcar variables de entorno,
configuraciones completas o secretos para diagnosticar una conexión.

## Recursos que generan costos

- SQL Database Basic: capacidad provisionada de 5 DTU y almacenamiento según su
  nivel; revisar uso y límites sin asumir costos nulos durante inactividad.
- ACR Basic: registro y almacenamiento de imágenes; revisar acumulación de tags
  conservando las versiones necesarias para rollback.
- Container Apps Consumption: cómputo y solicitudes según uso; mantener una réplica
  mínima puede generar consumo aun con poco tráfico. Los Jobs consumen al ejecutarse.
- Storage: capacidad LRS Hot, operaciones y transferencias aplicables.
- Log Analytics: ingestión y retención según configuración y volumen.
- Transferencias entre regiones y salida de datos pueden generar cargos;
  ACR/Storage están en South Central US y las aplicaciones en West US 3.

El resource group y las identidades son agrupación y control de acceso, no
instancias de cómputo. Consultar Cost Management de la suscripción para importes,
medidores y presupuestos reales; este runbook no fija precios ni confirma alertas.

## Secretos y datos que nunca deben almacenarse en Git

| Información | Ubicación / tratamiento |
| --- | --- |
| Conexión SQL runtime (`DATABASE_URL`) | Secret `database-url` de `ca-granja-backend`, referenciado como variable |
| Conexión SQL de migraciones (`DATABASE_URL`) | Secret `database-url` del Job, con usuario separado |
| Passwords SQL de administración y usuarios | Custodia segura del administrador; no documentar sus valores ni presumir un vault no inventariado |
| Contraseña inicial WEBMASTER | Custodia segura; bootstrap ya realizado, no conservarla en imágenes o archivos del repositorio |
| Secret temporal de bootstrap, si se usó | Debe retirarse tras el bootstrap; su eliminación actual no fue verificada aquí |
| Contraseñas de usuarios de la aplicación | Hash Argon2id en la base, nunca texto plano ni exportaciones versionadas |
| Tokens de sesión | Cookie HttpOnly y hash en BD según la autenticación existente; no logs ni almacenamiento web local |

OIDC no requiere client secret; Blob usa Managed Identity y el ACR tiene admin
user deshabilitado. No crear claves o contraseñas para sustituir esos mecanismos.
No se ha informado un Key Vault como recurso existente.

Nunca versionar `.env` reales, `DATABASE_URL` real, passwords SQL, contraseña
WEBMASTER, valores de secretos de Container Apps/Jobs, tokens Azure/GitHub,
cookies de sesión, connection strings de Storage, claves de cuenta, SAS,
exports de configuración con secretos, dumps de producción o backups con datos
personales. Tampoco incluirlos en argumentos de build, capas Docker, artefactos
de CI, capturas o logs. Los ejemplos de configuración deben usar únicamente
marcadores sin credenciales reales.
