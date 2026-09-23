# Concentrados: fase 3A — vista previa

## Alcance

`POST /api/alimentacion/concentrados/elaboraciones/previsualizar`, con sesión y permiso
`ALIMENTACION_ELABORACIONES_REGISTRAR`. Respuesta `200 { datos: ... }`, incluso cuando
hay faltantes (`disponible: false`). No se habilitan confirmación ni reversión.
No hay cambios de esquema, migraciones, frontend, timeout ni algoritmo de concurrencia.

Entrada de ejemplo:

```json
{
  "recetaId": 1,
  "versionReceta": 1,
  "fechaEfectiva": "2026-09-22T12:00:00.000-06:00",
  "cantidadTeorica": "500",
  "cantidadReal": "490",
  "unidadCaptura": "lb",
  "inventarioDestinoId": 1,
  "motivoDiferencia": "Merma prevista por secado"
}
```

También admite `fechaVencimiento` civil y `observaciones`. El esquema existente
rechaza campos adicionales, incluidos costos, fuentes o actor enviados por el cliente.
Exige justificación si las cantidades teórica y real difieren y vencimiento no anterior
al día efectivo. No agrega una prohibición de fechas futuras ni reconstruye saldos
históricos: consulta existencias actuales y vencimientos al día efectivo, como Alimentación.

## Lecturas y cálculo

Route → Controller → Service → Repository → Prisma. La transacción serializable
existente mantiene coherencia entre receta, catálogo y fuentes. Solo ejecuta lecturas:
no crea elaboraciones, reservas, movimientos, lotes, saldos ni bitácoras de dominio.
Puede adquirir bloqueos de lectura durante la consulta; no reserva stock al terminar.

Se validan versión y estado de receta, concentrado/producto terminado, unidades de
masa activas, lotes y almacén destino activo. Ingredientes inactivos o sin fuentes
elegibles aparecen como faltantes. Una unidad inválida impide calcular y devuelve conflicto.

Se reutilizan `Inventario_buscarFuentesDisponiblesConTx` y su filtro sin modificarlos:
producto, existencia y almacén activos; saldo positivo; lote activo y no vencido.
El orden sigue siendo almacén ID, código de lote e ID de existencia física; no FIFO/FEFO.
Se reparte entre tantas fuentes como hagan falta, respetando también el saldo agregado
del producto en cada almacén.

Cantidades de receta, factores de catálogo, saldos y costos se leen como texto SQL
para evitar la conversión del adaptador MSSQL a Number. El costo del lote corresponde
a su unidad base histórica; una unidad histórica incompatible se rechaza.
La consulta de exactos filtra por producto, sin una lista de parámetros por cada lote.

Para cada ingrediente:

```text
cantidad en unidad de inventario =
  cantidad receta × factor unidad ingrediente × cantidad teórica × factor captura
  / (rendimiento base × factor unidad rendimiento × factor unidad inventario)
```

Los productos previos a la división usan Decimal con 200 cifras (cubren las 108 cifras
máximas de los operandos). No se cuantizan factores ni resultados intermedios.
Solo la cantidad operativa final se cuantiza a seis decimales, HALF_UP.
Se rechazan cero por cuantización y desbordamientos Decimal(24,6).
Las cantidades de salida se convierten con la primitiva existente y se cuantizan en
su frontera operativa; se expone el residual de masa correspondiente.

El catálogo decide los factores: `qq` conserva 100 lb y `t` conserva 1000 kg.
No se introducen factores de conversión en el código productivo.

Cada importe es cantidad asignada en unidad de inventario × costo histórico del lote.
El calculador compartido concilia total, costo unitario a 18 decimales y residual firmado
a 24 decimales. El denominador es la cantidad real operativa en unidad base del terminado.
No se usan precios de venta ni costos enviados por el cliente. Con faltantes se muestra
`costoDisponible` y `costoEstimado: null`; nunca se presenta el parcial como costo completo.

La respuesta muestra fuentes, cantidades requeridas/disponibles/faltantes, diferencias
de cuantización, rendimiento porcentual, balance de masa en gramos y costo estimado.
El balance distingue masa requerida de masa disponible asignada; la diferencia de
masa respecto de la salida real no se presupone cero ni se descuenta automáticamente.

## Huella y siguiente fase

`versionPrevisualizacion: 1` y `huellaPrevisualizacion` SHA-256 cubren la entrada validada,
receta/version/composición, factores, producto, destino y fuentes elegibles con sus
saldos, costos, unidades, vencimientos y referencias. Incluyen fuentes elegibles no
consumidas en el reparto; cambios en ellas pueden invalidar conservadoramente la vista.
No contiene hora de consulta: las mismas lecturas producen la misma huella.

La huella es un detector de cambios, no una autorización ni una reserva. La futura
confirmación debe volver a leer, validar, calcular y comparar dentro de su única
transacción antes de cualquier descuento. Si no coincide, deberá devolver conflicto.
Todavía no se implementan esa confirmación, idempotencia, descuentos ni reversión.

## Archivos de esta fase

- Nuevos: `concentrados.previsualizacion.ts`, `concentrados.previsualizacion.test.ts`
  dentro de `backend/src/modules/alimentacion/concentrados/`, y este documento.
- Modificados en el mismo submódulo: `concentrados.repository.ts`,
  `concentrados.service.ts`, `concentrados.controller.ts`, `concentrados.routes.ts`
  y `concentrados.integration.test.ts`.
- `backend/package.json`: incluye las pruebas nuevas en `npm test` y agrega
  `test:concentrados:previsualizacion` para ejecutarlas aisladamente.

## Validación

La suite específica cubre escalado, conversiones, cuantización, reparto, todos los
faltantes, costos exactos/residual, límites y huella. La integración utiliza exclusivamente
el runner Docker existente: verifica Desktop local, contenedor autorizado y SQL Server
Developer por identidad; crea bases aleatorias `granja_test_concentrados_*` y reverifica
servidor/nombre antes de eliminar únicamente las bases creadas por esa ejecución.

La integración compara snapshots SQL de inventario, elaboraciones, recetas y bitácora
antes/después de consultas exitosas y rechazadas. También comprueba permisos HTTP,
costos de 18 decimales, filtros por estados/vencimiento, factores y cambios de huella.

Resultado final del 22/09/2026:

- `npm test`: 156 ejecutadas, 156 aprobadas, 0 fallidas, 0 omitidas.
  Incluye 10 pruebas unitarias nuevas de vista previa.
- `npm run test:concentrados:integration`: 30 ejecutadas, 30 aprobadas,
  0 fallidas, 0 omitidas; incluye cuatro casos nuevos y ampliación del caso HTTP.
  Alimentación e Inventario mantienen sus pruebas de regresión.
- `npm run typecheck`, `npm run build` (incluye `prisma generate`),
  `prisma validate` y `git diff --check`: correctos.
- Las 13 migraciones existentes se aplicaron en las bases temporales; no hubo
  cambios históricos y se eliminaron todas las bases creadas por el runner.
- No se observaron deadlocks ni timeouts. Se mantiene el aviso existente de Node
  sobre TLS ServerName con dirección IP en el ejecutor local.

Estos números corresponden a la verificación final, no suman reejecuciones.
La primera ejecución aislada de las nuevas unitarias detectó dos expectativas de
prueba incorrectas (fecha sin el offset requerido y signo del residual); se corrigieron
los fixtures/aserciones, sin relajar las validaciones ni alterar el cálculo para aprobarlos.

Riesgos pendientes: la causa del bloqueo observado en fase 2 sigue sin determinarse;
los bloqueos de lectura pueden competir con futuras confirmaciones. Se mantiene el
timeout de 30 segundos y los reintentos existentes. No se atribuye esta fase una
corrección de deadlocks. La compatibilidad de unidades/costos y la revalidación íntegra
deberán mantenerse en la futura confirmación; el hash solo no protege contra carreras.
