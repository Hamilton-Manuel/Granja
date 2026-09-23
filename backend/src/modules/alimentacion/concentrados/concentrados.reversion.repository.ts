import { Prisma } from "../../../../generated/prisma/client.js";

export type AlimentacionOperacionPosterior = {
  transaccionId: number; subtipo: string; cantidad: string; costo: string | null; fecha: Date;
  existenciaLoteId: number; inventarioId: number; codigoAlmacen: string; loteInventarioId: number;
  reversionId: number | null; cantidadReversion: string | null; costoReversion: string | null;
  alimentacionId: number | null; estadoAlimentacion: string | null; elaboracionId: number | null; estadoElaboracion: string | null;
  transferenciaId: number | null; sanidadFuenteId: number | null;
};
export async function Alimentacion_bloquearReversionConTx(ObjTx: Prisma.TransactionClient, IntId: number) {
  const Arr = await ObjTx.$queryRaw<Array<{ id: number }>>`SELECT elaboracion_id id FROM dbo.alimentacion_elaboraciones WITH (UPDLOCK,HOLDLOCK) WHERE elaboracion_id=${IntId}`;
  return Arr.length === 1;
}
export function Alimentacion_existeElaboracionConTx(ObjTx: Prisma.TransactionClient, IntId: number) {
  return ObjTx.alimentacionElaboracion.findUnique({ where: { elaboracionId: IntId }, select: { elaboracionId: true } });
}
/** Todas las ubicaciones y fechas: incluye consumos retroactivos y ambas mitades de transferencias. */
export function Alimentacion_operacionesPosterioresConTx(ObjTx: Prisma.TransactionClient, IntLote: number, IntIngreso: number) {
  return ObjTx.$queryRaw<AlimentacionOperacionPosterior[]>`
    SELECT t.transaccion_inventario_id transaccionId,t.subtipo_transaccion subtipo,
      CONVERT(NVARCHAR(100),t.cantidad) cantidad,CONVERT(NVARCHAR(100),t.costo_unitario) costo,t.fecha_transaccion fecha,
      f.existencia_lote_id existenciaLoteId,e.inventario_id inventarioId,a.codigo codigoAlmacen,f.lote_inventario_id loteInventarioId,
      r.transaccion_inventario_id reversionId,CONVERT(NVARCHAR(100),r.cantidad) cantidadReversion,CONVERT(NVARCHAR(100),r.costo_unitario) costoReversion,
      ad.alimentacion_id alimentacionId,ar.estado estadoAlimentacion,ed.elaboracion_id elaboracionId,el.estado estadoElaboracion,
      t.transferencia_id transferenciaId,t.sanidad_fuente_id sanidadFuenteId
    FROM dbo.inventario_transacciones t
    JOIN dbo.inventario_existencias_lotes f ON f.existencia_lote_id=t.existencia_lote_id
    JOIN dbo.inventario_existencias e ON e.inventario_producto_id=f.inventario_producto_id
    JOIN dbo.inventario_almacenes a ON a.inventario_id=e.inventario_id
    LEFT JOIN dbo.inventario_transacciones r ON r.transaccion_revertida_id=t.transaccion_inventario_id
    LEFT JOIN dbo.alimentacion_detalles ad ON ad.detalle_alimentacion_id=t.alimentacion_detalle_id
    LEFT JOIN dbo.alimentacion_registros ar ON ar.alimentacion_id=ad.alimentacion_id
    LEFT JOIN dbo.alimentacion_elaboraciones_fuentes ef ON ef.transaccion_consumo_id=t.transaccion_inventario_id
    LEFT JOIN dbo.alimentacion_elaboraciones_detalles ed ON ed.elaboracion_detalle_id=ef.elaboracion_detalle_id
    LEFT JOIN dbo.alimentacion_elaboraciones el ON el.elaboracion_id=ed.elaboracion_id
    WHERE f.lote_inventario_id=${IntLote} AND t.transaccion_inventario_id<>${IntIngreso} AND t.transaccion_revertida_id IS NULL
    ORDER BY t.transaccion_inventario_id`;
}
export function Alimentacion_ubicacionesReversionConTx(ObjTx: Prisma.TransactionClient, IntLote: number) {
  return ObjTx.$queryRaw<Array<{ existenciaLoteId: number; inventarioId: number; codigoAlmacen: string; cantidad: string; saldoAlmacen: string }>>`
    SELECT f.existencia_lote_id existenciaLoteId,e.inventario_id inventarioId,a.codigo codigoAlmacen,
      CONVERT(NVARCHAR(100),f.existencia_actual) cantidad,CONVERT(NVARCHAR(100),e.existencia_actual) saldoAlmacen
    FROM dbo.inventario_existencias_lotes f JOIN dbo.inventario_existencias e ON e.inventario_producto_id=f.inventario_producto_id
    JOIN dbo.inventario_almacenes a ON a.inventario_id=e.inventario_id
    WHERE f.lote_inventario_id=${IntLote} ORDER BY e.inventario_id,f.existencia_lote_id`;
}
export function Alimentacion_movimientosOriginalesConTx(ObjTx: Prisma.TransactionClient, IntId: number) {
  return ObjTx.$queryRaw<Array<{ transaccionId: number; existenciaLoteId: number; productoId: number; inventarioId: number;
    cantidad: string; costo: string | null; unidad: string | null; reversionId: number | null; subtipo: string }>>`
    SELECT t.transaccion_inventario_id transaccionId,t.existencia_lote_id existenciaLoteId,e.producto_id productoId,e.inventario_id inventarioId,
      CONVERT(NVARCHAR(100),t.cantidad) cantidad,CONVERT(NVARCHAR(100),t.costo_unitario) costo,t.unidad_base_snapshot unidad,
      r.transaccion_inventario_id reversionId,t.subtipo_transaccion subtipo
    FROM dbo.inventario_transacciones t JOIN dbo.inventario_existencias e ON e.inventario_producto_id=t.inventario_producto_id
    LEFT JOIN dbo.inventario_transacciones r ON r.transaccion_revertida_id=t.transaccion_inventario_id
    WHERE EXISTS(SELECT 1 FROM dbo.alimentacion_elaboraciones el WHERE el.elaboracion_id=${IntId} AND el.transaccion_ingreso_id=t.transaccion_inventario_id)
      OR EXISTS(SELECT 1 FROM dbo.alimentacion_elaboraciones_fuentes f JOIN dbo.alimentacion_elaboraciones_detalles d ON d.elaboracion_detalle_id=f.elaboracion_detalle_id
        WHERE d.elaboracion_id=${IntId} AND f.transaccion_consumo_id=t.transaccion_inventario_id)
    ORDER BY e.producto_id,e.inventario_id,t.existencia_lote_id,t.transaccion_inventario_id`;
}
export async function Alimentacion_marcarRevertidaConTx(ObjTx: Prisma.TransactionClient, IntId: number, IntLote: number, IntUsuarioId: number, StrMotivo: string, DtAhora: Date) {
  const ObjCambio = await ObjTx.alimentacionElaboracion.updateMany({ where: { elaboracionId: IntId, estado: "CONFIRMADA" },
    data: { estado: "REVERTIDA", usuarioReversionId: IntUsuarioId, motivoReversion: StrMotivo, fechaReversion: DtAhora } });
  if (ObjCambio.count !== 1) throw new Error("ELABORACION_REVERSION_CONFLICTO");
  await ObjTx.inventarioLote.update({ where: { loteInventarioId: IntLote }, data: { activo: false } });
}
