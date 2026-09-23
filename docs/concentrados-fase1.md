# Concentrados: entrega de fase 1

## Alcance

Estructura backend y modelo; no se monta el router ni se habilitan escrituras HTTP.
No hay frontend, confirmación, reversión ni cambios en las fórmulas de Alimentación.
La migración está preparada, no aplicada. No modifica movimientos ni costos históricos.

## Modelo y migración

`backend/prisma/migrations/20260922120000_concentrados_fase1/migration.sql` fue
generada comparando el esquema anterior y el nuevo mediante `prisma migrate diff
--from-schema ... --to-schema ... --script`, sin conexión SQL. Se revisó y se
añadieron restricciones SQL explícitas.

Se crean seis tablas:

- `alimentacion_concentrados`: clasificación única por producto y auditoría.
- `alimentacion_recetas_concentrados`: rendimiento base, versión, estado y actor.
- `alimentacion_recetas_concentrados_detalles`: cantidades/unidades de ingredientes.
- `alimentacion_elaboraciones`: snapshots de receta/producto/unidades/factores,
  cantidades teórica/real capturadas y base, costos y residual firmado,
  idempotencia, huella aceptada, fechas, responsable y datos de reversión.
- `alimentacion_elaboraciones_detalles`: composición histórica independiente de
  las posteriores ediciones de receta y cantidades efectivamente consumidas.
- `alimentacion_elaboraciones_fuentes`: existencia física, cantidad y costo
  histórico de cada movimiento consumido.

Relaciones compuestas impiden combinar una receta con otro producto terminado,
una fuente con otro ingrediente, un ingreso con otra existencia y un destino
con otro lote. Cada elaboración tiene lote e ingreso únicos; cada movimiento de
consumo se vincula una sola vez. Todas las relaciones usan `NoAction`.

La migración añade dos claves compuestas a tablas existentes y amplía el CHECK
de subtipos con `ELABORACION_CONSUMO` y `ELABORACION_INGRESO`, conservando todos los
valores anteriores. No elimina tablas, columnas ni filas. Los CHECK nuevos
validan cantidades positivas, unidades de peso, factores positivos, costos no
negativos, hashes y coherencia entre estado y datos de reversión.

Los campos temporales nuevos son `DATETIME2(7)` sin defaults del host: el servicio
deberá asignarlos usando `Fecha_`. Las unidades y factores históricos se copian,
no se recalculan desde el catálogo después de confirmar.

Cantidades: `Decimal(24,6)`; factores: `Decimal(30,15)`; costo unitario:
`Decimal(38,18)`; importes y residual: `Decimal(38,24)` (máximo 14 cifras enteras).
Los cálculos puros rechazan excesos de escala/rango. El total es la suma exacta
de cantidad descontada por costo histórico en la misma unidad base. Se conserva
el residual `total - cantidad_real_base * costo_unitario_persistido`, firmado.

No se impone esa igualdad con una multiplicación SQL de DECIMAL: SQL Server puede
reducir su escala. La futura confirmación deberá validar la conciliación con
Decimal y persistir los valores como texto mediante SQL parametrizado, siguiendo
la protección de precisión ya usada por Inventario. Las restricciones de fila
no sustituyen la validación transaccional entre movimientos, fuentes y encabezado.

## Primitivas y contratos

- `Inventario_registrarEntradaConLoteConTx`: extrae la entrada completa, incluyendo
  saldos, lote, movimiento, vínculo de origen y bitácora. No abre transacciones.
- `Inventario_registrarEntradaConLote`: conserva su firma pública de compra/inicial
  y usa el wrapper serializable existente. La nueva entrada interna admite
  `precioTotalIngreso: null` para no convertir su escala de cuatro decimales en
  autoridad del costo de elaboración.
- `Inventario_convertirCantidadSinCuantizar`: convierte con precisión 100 y no
  redondea el factor ni la cantidad. No cambia el algoritmo vigente de compras.
- `Alimentacion_leerCostoConsumoConTx`: exige movimiento de consumo, existencia y
  unidad coherentes, no revertido; obtiene cantidad y costo como cadenas SQL.
- `Alimentacion_calcularValoracionElaboracion`: suma importes sin redondeos
  intermedios; cuantiza únicamente el costo unitario a 18 decimales y registra
  el residual. No escribe datos.

Los esquemas Zod son estrictos; los costos, usuario y fuentes no son autoridad
del navegador. Edición exige versión esperada; confirmación exige UUID y huella.
Se valida fecha civil real, peso, ingredientes únicos y motivo de diferencia.
La consulta de detalle tiene Route → Controller → Service → Repository, pero su
router permanece sin montar y su permiso no se asigna en esta fase.

## Verificación y seguridad

Las pruebas unitarias cubren validación, precisión, residual, lectura exacta,
compatibilidad de entradas y propagación de fallos del helper ConTx. La suite
HTTP anterior de salud ahora simula SQL: no depende de la base configurada.

Resultado final: `npm test` 142/142, `npm run typecheck` y `npm run build`
correctos. `prisma validate`, `prisma format` y `prisma generate` correctos;
`git diff --check` sin errores. No se ejecutó `migrate status`, pues requiere
conexión con una base. Las ejecuciones finales de pruebas y build utilizaron
una URL local ficticia. La primera ejecución encontró la dependencia SQL del
health (503) y un cero aceptado en conversión; ambos se corrigieron antes de
la verificación final.

`npm run test:concentrados:integration` está preparado para verificar la migración,
restricciones, recetas sin movimientos y rollback real. Antes de conectar exige
URL local con puerto 1433, propiedades sin duplicados y el contenedor Docker
`granja-database` activo, con etiquetas del proyecto y puerto publicado. Después
crea una base `granja_test_concentrados_fase1_*` y verifica `DB_NAME()`.

No se ejecutó integración en esta entrega: Docker informó el contenedor activo,
pero `NetworkSettings.Ports` devolvió `{"1433/tcp":[]}`. No se verificó un puerto
publicado; no se intentó aplicar SQL ni crear bases temporales.

## Pendiente antes de activar la funcionalidad

Autorizar la fase 2 y validar primero la migración en el destino temporal local
verificado. Implementar catálogo/asignación de permisos, clasificación con veto
a nuevas compras/iniciales, detección serializada de ciclos, edición de recetas,
selección multifuente, vista previa y confirmación atómica e idempotente. El veto
de clasificación no alterará entradas anteriores.

La confirmación deberá revalidar versión, fuentes, cantidades y costos; devolver
409 ante cambios respecto de la vista previa y no reservar existencias. También
deberá impedir reversión individual desde Inventario y resolver las dependencias
de reversión completa. No debe activarse el router antes de tener estas reglas y
sus pruebas de integración. Los permisos, estados y reglas de Alimentación
actuales permanecen iguales.

No ejecutar esta migración en producción desde esta entrega. El despliegue futuro
requiere autorización separada, revisión sobre base temporal, `migrate deploy`
con el Job existente y comprobación de estado; nunca `db push` ni `reset`.
