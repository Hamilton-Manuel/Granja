# Concentrados — fase 2

## SQL local y migraciones

Docker Desktop usa el endpoint local `npipe:////./pipe/dockerDesktopLinuxEngine`.
El contenedor `granja-database` tiene las etiquetas del proyecto y de su servicio
`database`, con directorio de trabajo igual al repositorio. `compose.yaml` y
`HostConfig.PortBindings` declaran 1433, pero `NetworkSettings.Ports` devuelve
`{"1433/tcp":[]}`: la declaración no acredita una publicación efectiva. No se
reinició el servidor, no se recreó el contenedor ni se cambió la publicación.
No se atribuye una causa interna específica de Docker Desktop sin evidencia.

El ejecutor `npm run test:concentrados:integration` usa una imagen de operaciones
ya disponible (`granja/operaciones:azure-prep`), fija su ID y exige las versiones
del lockfile para las dependencias relevantes. No descarga imágenes. Crea un
contenedor desechable con `--network container:<ID verificado>` y conecta a
`127.0.0.1:1433` desde esa red. El repositorio se monta en solo lectura; los
archivos se copian a `/tmp` dentro del contenedor de pruebas. Se monta también,
en solo lectura, el helper de fechas que requiere la regresión existente de
Alimentación; no se modifica frontend.

Antes de crear cada base comprueba `SERVERPROPERTY('MachineName')` contra el ID
del contenedor, `EngineEdition=3` y `DB_NAME()='master'`. Solo entonces crea un
nombre aleatorio `granja_test_concentrados_<24 caracteres hexadecimales>`.
Antes de migrar verifica `DB_NAME()` sobre esa conexión temporal. Antes de
eliminar reverifica servidor, edición y nombre exacto. Solo borra bases y
directorios creados por esa ejecución. No utiliza `DATABASE_URL` del entorno
local para elegir el servidor ni se conecta con Azure SQL.

En cada base nueva se aplicó el historial previo de 11 migraciones, se insertó
historia sintética y luego se aplicaron separadamente:

1. `20260922120000_concentrados_fase1`, sin modificar su SQL.
2. `20260922140000_concentrados_permisos`, nueva migración aditiva del catálogo.

Se compararon movimientos, lotes, saldos agregados y por lote antes y después:
la historia y sus costos de 18 decimales permanecieron idénticos. El estado
final fue de 13 migraciones aplicadas, sin pendientes. Se verificaron las seis
tablas, 20 claves foráneas habilitadas/confiables, CHECK, índices únicos y escalas
Decimal. No se aplicaron migraciones a bases persistentes.

## Funcionalidad y contratos

Prefijo: `/api/alimentacion/concentrados`.

| Método y ruta | Permiso | Función |
| --- | --- | --- |
| `GET /` y `GET /:concentradoId` | `ALIMENTACION_CONCENTRADOS_CONSULTAR` | Listado y detalle. |
| `POST /` | `ALIMENTACION_RECETAS_GESTIONAR` | Clasificar un `productoId` existente. |
| `PATCH /:concentradoId/estado` | `ALIMENTACION_RECETAS_GESTIONAR` | Activar/inactivar clasificación. |
| `GET /recetas` y `GET /recetas/:recetaId` | `ALIMENTACION_CONCENTRADOS_CONSULTAR` | Recetas con composición actual. |
| `POST /recetas` | `ALIMENTACION_RECETAS_GESTIONAR` | Crear receta, versión 1. |
| `PATCH /recetas/:recetaId` | `ALIMENTACION_RECETAS_GESTIONAR` | Editar composición completa con `versionEsperada`. |
| `PATCH /recetas/:recetaId/estado` | `ALIMENTACION_RECETAS_GESTIONAR` | Cambiar estado con `versionEsperada`. |

Las consultas aceptan `pagina`, `limite`, `busqueda`; recetas también
`concentradoId`. La receta recibe `concentradoId`, `nombre`, `descripcion`
opcional, `cantidadBase`, `unidadBase` y `detalles` con `productoId`, `cantidad`
y `unidadMedida`. Cantidades como cadenas decimales. No se admite reasignar una
receta existente a otro concentrado: se crea otra receta, preservando referencias.

Clasificar exige producto activo y unidad activa de dimensión `PESO`, con factor
positivo del catálogo. No duplica productos ni modifica sus antecedentes. Los
nuevos ingresos por compra/inventario inicial verifican la clasificación dentro
de la transacción serializable. Inactivar la clasificación no permite eludir el
veto. Transferencias, ajustes y reversiones existentes conservan sus contratos.
Crear productos continúa usando `INVENTARIO_PRODUCTOS_CREAR`.

Crear/editar/activar recetas valida referencias, productos, unidades de masa y
factores activos. No admite ingredientes repetidos ni cantidades no positivas.
Cada edición/cambio de estado incrementa la versión; una versión obsoleta
responde 409. Recetas y auditoría se guardan atómicamente, sin movimientos ni
cambios de existencias. Se inactivan detalles sustituidos; no se editan snapshots
de elaboraciones anteriores.

Todas las modificaciones del grafo usan `sp_getapplock` exclusivo y propiedad
de la transacción, antes de leerlo. La detección iterativa considera la unión de
todas las recetas, incluidas las inactivas, con sus ingredientes actuales. Se
rechazan ciclos directos, indirectos, al editar/reactivar y por concurrencia.

Se incorporaron los cinco permisos aprobados al catálogo/bootstrap. La migración
no concede nuevos vínculos a roles o usuarios existentes. La autorización HTTP
usa únicamente los permisos del middleware. Los tres permisos de elaboraciones
quedan registrados sin rutas de registro, consulta o reversión de elaboraciones.

## Precisión y compatibilidad

La integración reveló pérdida de precisión del adaptador MSSQL con
`9007199254740993.123456`. Las cantidades de recetas se escriben mediante SQL
parametrizado como texto y se leen con `CONVERT(NVARCHAR(100), ...)`, devolviendo
Decimal. Las escrituras usan un marcador positivo dentro de la misma transacción
antes de asignar el valor exacto; nunca es visible como estado confirmado. Se
probó también `999999999999999999.999999` al editar, listar y cambiar estado.

El wrapper serializable mantiene sus tres intentos para `P2034` y admite opciones
de transacción, con timeout predeterminado de 30 segundos. La regresión real de
consumos concurrentes vencía con el default de Prisma de cinco segundos antes de
completarse la resolución del deadlock. No cambian selección de fuentes,
cantidades, costos ni reglas de las fórmulas de Alimentación.

El mock de salud de fase 1 sigue limitado a `app.test.ts`. La integración nueva
ejecutó `/api/health` sin mocks contra la base SQL temporal y recibió 200. Las
pruebas unitarias existentes también comprueban la respuesta degradada; no se
modificó el código de salud de producción.

## Verificación y límites

Integración final: **26/26**, cero omisiones, mediante SQL Server real temporal.
Incluye Concentrados, Inventario y Alimentación; concurrencia, rollback,
precisión, permisos HTTP con sesiones reales, salud y preservación histórica.
Cada base creada en la ejecución final fue eliminada con identidad reverificada.

Verificación local final: **146/146 pruebas unitarias**, cero omisiones;
`npm run typecheck`, `npm run build` (incluye `prisma generate`), `prisma validate`
y `git diff --check` correctos. Las verificaciones locales usaron una URL ficticia
y el chequeo HTTP unitario simulado; los resultados SQL anteriores corresponden
a la ejecución de integración separada, sin simular la base de datos.

El ejecutor requiere Docker Desktop local, la imagen cacheada compatible y la
credencial local `DB_SA_PASSWORD`; falla de forma cerrada si no puede verificarlos.
La publicación de 1433 sigue sin acreditarse: las pruebas no dependen de ella.

No hay frontend nuevo ni endpoints de elaboración/reversión. La siguiente fase,
pendiente de autorización, será resolver fuentes y costos en vista previa y
confirmar elaboraciones con idempotencia y revalidación atómica. No hay commit,
push, despliegue ni autorización para producción.

## Archivos de esta fase

Nuevos: `concentrados.constants.ts`, `concentrados.politicas.ts`, la migración de
permisos, `testing/concentrados-docker.mjs`, `testing/concentrados-docker-interno.mjs`,
`testing/concentrados-temporal-interno.ts` y este documento.

Modificados: schemas/controller/routes/service/repository y pruebas de
`modules/alimentacion/concentrados`, router de Alimentación, repository y prueba
ConTx de Inventario, bootstrap de usuarios, helpers temporales de pruebas y
`backend/package.json`. El modelo Prisma, la migración de fase 1 y el test de
salud no necesitaron cambios adicionales en esta fase.
