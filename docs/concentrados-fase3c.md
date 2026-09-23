# Concentrados — fase 3C: dependencias y reversión integral

## API

- `GET /api/alimentacion/concentrados/elaboraciones/:elaboracionId/dependencias`
  requiere `ALIMENTACION_ELABORACIONES_CONSULTAR`.
- `POST /api/alimentacion/concentrados/elaboraciones/:elaboracionId/revertir`
  requiere `ALIMENTACION_ELABORACIONES_REVERTIR` y `{ "motivo": "..." }`
  de 1–500 caracteres, sin campos adicionales.

Se reutiliza el middleware de sesión/permisos. El servicio revalida usuario y permisos
efectivos en la transacción, sin excepciones por nombre de rol.

La consulta devuelve `reversible`, `bloqueos`, `operaciones`, `dependencias`,
`ubicaciones`, cantidad requerida y referencias de la elaboración/lote. Se incluyen
las operaciones resueltas y sus compensaciones vinculadas; `dependencias` contiene
las pendientes. Una reversión bloqueada responde HTTP 409 con `error` y el diagnóstico
actual en `datos`, permitiendo mostrar los motivos sin una segunda consulta.

Reversión exitosa: HTTP 200 con elaboración histórica, `reutilizada: false` e IDs de
movimientos compensatorios. Una elaboración ya REVERTIDA retorna HTTP 200 con
`reutilizada: true`, sin escribir ni modificar el primer responsable/motivo/fecha.
El reintento sigue requiriendo permiso y un motivo válido; no sustituye el motivo original.

## Dependencias e integridad

Se consulta el lote en **todos** los almacenes y todo su historial, no solo por fecha
posterior al ingreso: las fechas efectivas retroactivas no pueden eludir la validación.
El ingreso original y las propias filas de compensación no son dependencias nuevas.

Un movimiento posterior solo está resuelto si existe su reversión vinculada con cantidad
exactamente opuesta y costo histórico idéntico. Un saldo neto cero producido por otros
ajustes no basta. Alimentación y elaboraciones hijas requieren además que el registro
de dominio esté REVERTIDA. Cada mitad de una transferencia se revisa, incluso en otros
almacenes. Otros movimientos sin compensar también bloquean.

Se exige que el saldo físico original sea exactamente la cantidad real elaborada, que
el agregado del almacén la cubra y que no exista saldo del mismo lote en otra ubicación.
Antes de operar se cotejan movimientos originales, fuentes, unidades, cantidades y
costos con los snapshots de la elaboración. Una inconsistencia bloquea la operación.

No hay cascadas: el usuario debe resolver cada dependencia mediante el módulo
correspondiente y solicitar nuevamente la reversión de la elaboración madre.

## Operación atómica y precisión

La consulta es de solo lectura. La reversión usa una única transacción serializable
existente, con `UPDLOCK,HOLDLOCK` en el encabezado para serializar solicitudes de la
misma elaboración. Se vuelven a leer dependencias y existencias dentro de esa transacción.

Primero se retira el terminado; después se restituyen los ingredientes a sus fuentes
originales en orden estable de producto, almacén, fuente e ID de movimiento. La primitiva
`Inventario_compensarElaboracionConTx` verifica pertenencia a una elaboración confirmada,
ausencia de reversión previa y subtipo/signo, y actualiza saldos físicos/agregados con
condiciones de no negatividad y rango Decimal(24,6).

Los compensatorios son `AJUSTE / REVERSION`, enlazados por `transaccionRevertidaId`,
cuya unicidad existente impide una segunda compensación. Las cantidades se invierten
exactamente y los costos se copian desde el movimiento original mediante texto SQL y
CAST Decimal, sin Number. No se cambia ningún costo de lote, movimiento original,
composición ni residual histórico. No se crean compras ni nuevos lotes para restituir.

Al final se marca el encabezado REVERTIDA, se registra responsable/motivo/hora civil de
Guatemala, se inactiva el lote terminado y se audita. No se reactivan materias primas,
almacenes ni existencias, ni se modifica el vencimiento de las fuentes restituidas.
Un lote vencido conserva las restricciones de selección de Inventario/Alimentación.

Cualquier error revierte la retirada, restituciones, compensatorios, cambios de estado
y bitácoras. Las reversiones individuales de movimientos de elaboración siguen
bloqueadas; la nueva primitiva integral no expone un parámetro HTTP para eludirlo.

## Diagnóstico acotado de concurrencia

Se revisó el adaptador local `@prisma/adapter-mssql`: su `mapDriverError` transforma
el número SQL Server **1205** en `TransactionWriteConflict`. Prisma puede envolverlo
como P2010/EREQUEST al ejecutar SQL raw, en lugar de P2034. Se mantiene el reconocimiento
existente de la causa anidada, código 1205 y mensaje específico de víctima de deadlock.

Una prueba real, únicamente en la base temporal verificada, crea una tabla de dos filas
y dos transacciones que toman esas filas en orden opuesto. El motor devuelve 1205 para
una víctima; el saldo final prueba que su primera escritura también se revirtió. La
tabla se elimina tras verificar nuevamente el nombre de la base. No se modifica la
configuración de bloqueo del servidor ni se consulta información de bases persistentes.

Esto identifica el tipo de error y demuestra rollback en un ciclo controlado. **No
identifica el grafo ni la causa concreta del deadlock observado en fase 3B.** Ese riesgo
sigue abierto para diagnóstico bajo carga. La API devuelve un conflicto de concurrencia,
sin afirmar que la vista previa esté obsoleta. La confirmación también distingue ahora
ese mensaje del rechazo por huella distinta. Timeout de 30 segundos y reintentos
compartidos permanecen sin cambios; no se añaden reintentos indiscriminados.

## Archivos de esta fase

Nuevos en `backend/src/modules/alimentacion/concentrados/`:

- `concentrados.reversion.repository.ts` — lecturas y estado.
- `concentrados.reversion.service.ts` — diagnóstico, permisos y transacción integral.
- `concentrados.reversion.ts` — reglas puras de dependencias y saldo.
- `concentrados.reversion.test.ts` — pruebas unitarias.

Modificados:

- `concentrados.controller.ts`, `concentrados.routes.ts`, `concentrados.schemas.ts`.
- `concentrados.elaboraciones.service.ts` — mensaje de conflicto separado de obsolescencia.
- `concentrados.confirmacion.integration.test.ts` — reutiliza fixtures temporales para 3C.
- `concentrados.integration.test.ts` — permisos y contratos HTTP de consulta/reversión.
- `backend/src/modules/inventario/inventario.repository.ts` — primitiva compensatoria.
- `backend/src/testing/concentrados-docker.mjs` y `concentrados-docker-interno.mjs` —
  opción cerrada `--reversion` para ejecutar solo casos 3C.
- `backend/package.json` y este documento.

Sin cambios de esquema ni migraciones nuevas. Sin frontend, conexiones a Azure,
cambios en bases persistentes, commits, pushes ni despliegues.

## Pruebas

Primero: `npm run test:concentrados:reversion` y
`npm run test:concentrados:integration -- --reversion`.
Después: unitarias generales, integración completa, typecheck, build, Prisma
validate/generate y `git diff --check`.

La integración cubre reversión exitosa con costos de 18 decimales, alimentación y
elaboraciones hijas, transferencias/ajustes, ajustes netos cero, saldos inconsistentes,
simultaneidad/reintentos, fallo SQL real durante la segunda restitución con rollback
completo, fuentes vencidas/inactivas, competencia con consumo y diagnóstico 1205.
El test HTTP verifica permisos, motivo, dependencias en el cuerpo 409 y reversión 200.
No se confunden fixtures/mocks unitarios con las verificaciones de persistencia SQL.

### Resultado final (2026-09-22)

- Unitarias: 165 ejecutadas, 165 aprobadas, 0 fallidas y 0 omitidas.
- Integración SQL Server temporal: 54 ejecutadas, 54 aprobadas, 0 fallidas y
  0 omitidas. Incluyen los 11 casos específicos de 3C.
- Typecheck, build, Prisma validate/generate y `git diff --check`: correctos.
  Git únicamente advierte sobre normalización LF/CRLF.
- Las 13 migraciones existentes se aplicaron en las bases nuevas del runner;
  todas las bases temporales de esta ejecución se eliminaron tras reverificar
  su nombre y servidor. No se crearon migraciones nuevas.
- La primera ejecución focal tuvo 9 aprobadas y 2 fallidas por preparación y
  expectativas de pruebas; se corrigieron los fixtures y la expectativa de
  movimiento ya revertido. La repetición focal aprobó 11/11. Los totales finales
  anteriores corresponden a la validación general, sin sumar repeticiones.
- Se reprodujo SQL Server 1205 con un ciclo controlado y se verificó el rollback
  de la víctima. Esto no determina la causa del deadlock original de 3B: queda
  pendiente capturar su grafo. Se conserva el tratamiento como conflicto de
  concurrencia HTTP 409, sin atribuirlo necesariamente a una vista previa obsoleta.
  No se modificaron timeout ni política de reintentos.
