# Concentrados — fase 3B: confirmación atómica

## Contrato y alcance

`POST /api/alimentacion/concentrados/elaboraciones` recibe los mismos campos de la
vista previa, más `claveIdempotencia` UUID y `huellaPrevisualizacion` SHA-256.
El esquema cerrado rechaza costos, fuentes y movimientos proporcionados por el cliente.
Requiere sesión y `ALIMENTACION_ELABORACIONES_REGISTRAR`; dentro de la transacción
se revalida usuario activo, rol activo y permisos efectivos con el resolvedor existente,
incluidos ALLOW/DENY directos. No existe autorización por nombre de rol.

Primera confirmación: HTTP 201 `{ datos: elaboracion, reutilizada: false }`.
Reintento idéntico: HTTP 200 `{ datos: elaboracion, reutilizada: true }`.
Los importes y cantidades históricos se devuelven como strings exactos; las fechas
usan el formato civil de Guatemala del proyecto.

No se implementan frontend, edición de elaboraciones ni reversión. El endpoint de
reversión continúa ausente. Inventario rechaza la reversión individual de movimientos
`ELABORACION_CONSUMO` y `ELABORACION_INGRESO`, para impedir correcciones parciales.

## Transacción

1. Validar la solicitud y calcular hash de contenido y usuario. Normalizar mayúsculas
   del UUID y orden de propiedades mediante el esquema existente.
2. Abrir la transacción serializable existente, con su timeout de 30 segundos y
   política de reintentos sin cambios.
3. Revalidar usuario/permisos y consultar la clave con `UPDLOCK,HOLDLOCK`.
   La restricción única de `clave_idempotencia` permanece como garantía de BD.
4. Si ya existe, comprobar usuario/hash y devolver los datos persistidos; no volver
   a exigir una receta o vista previa actuales para un reintento ya confirmado.
   Cualquier cambio de usuario o contenido devuelve HTTP 409.
5. Reutilizar `Alimentacion_previsualizarConTx` en el mismo TransactionClient.
   Validar disponibilidad y comparar íntegramente la huella. Cambios de receta,
   fuentes, saldos, costos o datos inválidos devuelven 409 y solicitan nueva vista previa.
6. Consumir las fuentes previstas en orden de producto ID y, dentro de cada producto,
   almacén ID, código de lote e ID físico, tal como fueron seleccionadas.
7. Releer cantidades y costos de los movimientos realmente creados, comprobarlos
   contra la vista previa y conciliar total, costo unitario y residual.
8. Crear un lote nuevo, existencia física y movimiento de ingreso del terminado.
   Aplicar la fecha efectiva a los movimientos y al ingreso del lote.
9. Guardar encabezado, snapshots de receta/productos/unidades/factores, detalles y
   fuentes, enlazando las salidas e ingreso reales. Auditar y devolver la elaboración.
10. Commit único. Cualquier excepción revierte movimientos, saldos, lotes, snapshots,
    encabezado y bitácoras; no consume la clave de idempotencia.

No se abre ninguna transacción anidada. No se sustituye silenciosamente una fuente.
La clave es globalmente única: su uso por otro usuario autorizado también genera 409.
Las lecturas con bloqueo de rango pueden serializar claves ausentes cercanas; la garantía
prioriza integridad y se debe medir bajo carga antes del despliegue.

## Precisión y valoración

Se reutilizan las primitivas públicas `Inventario_aplicarMovimientoConTx` y
`Inventario_registrarEntradaConLoteConTx`. Los nuevos subtipos se encaminan internamente
a escrituras exactas con parámetros de texto y `CAST(... AS DECIMAL)`; las rutas
existentes de compras, iniciales, Alimentación y otros consumos mantienen su lógica.
Los descuentos condicionados comprueban saldo físico y agregado; ningún descuento
que afecte cero filas puede confirmar. El estado y vencimiento se revalidan en la
vista previa compartida dentro de la transacción serializable.

Prisma crea marcadores válidos para los Decimal que MSSQL podría convertir a Number;
en la misma transacción se reemplazan con valores exactos antes de retornar/confirmar.
Los importes persistidos se releen mediante conversión SQL a NVARCHAR, incluido el
resultado de reintentos. Las actualizaciones de fechas se agrupan para no exceder el
límite de parámetros SQL al utilizar numerosas fuentes.

`Alimentacion_leerCostoConsumoConTx` obtiene la cantidad realmente descontada y el
costo histórico correspondiente a su unidad. `Alimentacion_calcularValoracionElaboracion`
calcula el total, divide entre cantidad real operativa y conserva el residual firmado.
Cada fuente guarda su importe exacto; las elaboraciones posteriores crean otro lote
y no cambian los costos anteriores.

El ingreso usa `precioTotalIngreso: null` y el subtipo de transformación; no se crea
una compra ni un segundo gasto. Los reportes actuales de costos de Alimentación y
Sanidad se basan en sus consumos específicos y no suman estas transformaciones.

## Modelo y archivos

Sin cambios de esquema ni nuevas migraciones. Se aprovechan las seis tablas y las
restricciones únicas/foráneas de fase 1. Los snapshots de nombres de producto, código,
receta, composición, unidades y factores son independientes de ediciones posteriores.
Los almacenes y lotes se conservan mediante las referencias físicas exactas.

Nuevos en `backend/src/modules/alimentacion/concentrados/`:

- `concentrados.confirmacion.ts`: validación, hash e invariantes de idempotencia.
- `concentrados.elaboraciones.service.ts`: operación atómica.
- `concentrados.elaboraciones.repository.ts`: acceso de persistencia y Decimal exacto.
- `concentrados.confirmacion.test.ts` y `concentrados.confirmacion.integration.test.ts`.

Modificados:

- `concentrados.service.ts`: extracción de la consulta compartida ConTx.
- `concentrados.controller.ts`, `concentrados.routes.ts`, `concentrados.integration.test.ts`.
- `backend/src/modules/inventario/inventario.repository.ts` y su test de entrada ConTx.
- `backend/package.json`: unitarias nuevas y comando específico de confirmación.
- `backend/src/testing/concentrados-docker.mjs` y `concentrados-docker-interno.mjs`:
  selección cerrada `--confirmacion` para pruebas focalizadas; misma verificación de servidor.
- Este documento.

## Verificación y pendientes

Primero se ejecutan `npm run test:concentrados:confirmacion` y
`npm run test:concentrados:integration -- --confirmacion`; al finalizar, suite general,
typecheck, Prisma validate/generate, build y diff check.

La integración usa únicamente nuevas bases `granja_test_concentrados_*` en SQL Server
Developer del contenedor Docker Desktop local verificado. Los triggers que provocan
fallos se crean únicamente en esa base temporal, se eliminan en finally y nunca se
incluyen en migraciones. Se compara el estado real SQL antes/después del rollback.

Casos: confirmación multi-fuente, relaciones y saldos, obsolescencia por stock/costo/receta,
insuficiencia, fallo tras segundo descuento, fallo en lote e ingreso, reintento tras rollback,
idempotencia secuencial/concurrente, claves diferentes compitiendo, competencia con salida
de Inventario, snapshots tras editar receta/nombres, costos diferentes por lote,
cantidades mayores que Number seguro, merma y residual. El contrato HTTP prueba 401/403,
201/200, fechas y Decimal serializados. La regresión conserva las fórmulas de Alimentación.

Pendientes para 3C: reversión integral con verificación de consumos dependientes y saldo
disponible; continúa bloqueada la reversión aislada de movimientos. Sigue pendiente la
causa del bloqueo concurrente histórico de fase 2. Las pruebas no equivalen a una prueba
de carga con miles de fuentes; no se amplió el timeout para compensarlo.

Durante la validación 3B se observó un deadlock real entre confirmaciones con claves
distintas: SQL Server eligió una víctima y el adaptador lo expuso desde `$executeRaw`
como `P2010/EREQUEST`, no como `P2034`. Inicialmente eso escapaba como error interno.
Se reconoce ahora `TransactionWriteConflict` anidado, código 1205 o el mensaje específico
de víctima de deadlock, y se devuelve HTTP 409 tras rollback. Los demás errores SQL
siguen propagándose; los tests con triggers comprueban esa distinción. No se alteraron
los reintentos compartidos ni el timeout. Esto resuelve el contrato de conflicto, no
demuestra la eliminación del deadlock; no se capturó su grafo de bloqueos.

No se accede a Azure SQL ni se modifica una base persistente. Sin commit, push ni despliegue.

### Resultados finales — 22/09/2026

| Verificación | Ejecutadas | Aprobadas | Fallidas | Omitidas |
| --- | ---: | ---: | ---: | ---: |
| Unitarias (`npm test`) | 161 | 161 | 0 | 0 |
| Integración general temporal | 43 | 43 | 0 | 0 |

Son los resultados de las últimas ejecuciones, sin sumar reintentos. La integración
incluye los 13 casos específicos 3B y los 30 casos de regresión. Las ejecuciones
intermedias fallaron en el tratamiento del deadlock descrito arriba; tras corregirlo,
la suite específica y la general finalizaron correctamente. Rollback real, idempotencia
concurrente, saldos y ausencia de movimientos parciales quedaron verificados.

`typecheck`, `build`, `prisma validate`, `prisma generate` y `git diff --check` correctos.
Las 13 migraciones existentes fueron aplicadas exclusivamente a bases temporales,
con historia sintética y costos conservados. El runner reverificó servidor y nombre
antes de eliminar todas las bases creadas por cada ejecución, incluidas las fallidas.
