import { Prisma } from "../../../generated/prisma/client.js";
import { BaseDatos_obtenerCliente } from "../../database/prisma.js";

const Reportes_numero = (ObjValor: bigint | number | undefined): number => Number(ObjValor ?? 0);

export async function Reportes_metricasProduccion() {
  const ObjPrisma = BaseDatos_obtenerCliente();
  const [ArrEstados, IntLotesActivos, ArrLotes] = await Promise.all([
    ObjPrisma.produccionAnimal.groupBy({ by: ["estadoActual"], _count: { _all: true } }),
    ObjPrisma.produccionLote.count({ where: { estado: "ACTIVO" } }),
    ObjPrisma.$queryRaw<Array<{ loteProduccionId: number | null; codigo: string | null; nombre: string | null; cantidad: bigint }>>(Prisma.sql`
      SELECT l.lote_produccion_id AS loteProduccionId, l.codigo, l.nombre, COUNT_BIG(*) AS cantidad
      FROM dbo.produccion_animales a
      LEFT JOIN dbo.produccion_asignaciones_lotes al ON al.animal_id = a.animal_id AND al.estado = N'VIGENTE'
      LEFT JOIN dbo.produccion_lotes l ON l.lote_produccion_id = al.lote_produccion_id
      WHERE a.estado_actual = N'ACTIVO'
      GROUP BY l.lote_produccion_id, l.codigo, l.nombre
      ORDER BY cantidad DESC, l.codigo ASC
    `),
  ]);
  const ObjEstados = new Map(ArrEstados.map((Obj) => [Obj.estadoActual, Obj._count._all]));
  const ArrAnimalesPorEstado = ["ACTIVO", "VENDIDO", "FALLECIDO", "RETIRADO"].map((StrEstado) => ({ estado: StrEstado, cantidad: ObjEstados.get(StrEstado) ?? 0 }));
  return {
    animalesActivos: ObjEstados.get("ACTIVO") ?? 0,
    lotesActivos: IntLotesActivos,
    animalesPorEstado: ArrAnimalesPorEstado,
    animalesPorLote: ArrLotes.map((Obj) => ({ loteProduccionId: Obj.loteProduccionId, codigo: Obj.codigo, nombre: Obj.nombre, cantidad: Reportes_numero(Obj.cantidad) })),
  };
}

export async function Reportes_metricasInventario(DtHoy: Date, DtLimiteExclusivo: Date) {
  const ObjPrisma = BaseDatos_obtenerCliente();
  const [ArrConteos, IntVencidos, IntProximos, ArrVencimientos] = await Promise.all([
    ObjPrisma.$queryRaw<Array<{ productos: number; lotes: number; bajoMinimo: bigint }>>(Prisma.sql`
      SELECT COUNT(DISTINCT CASE WHEN e.existencia_actual>0 THEN e.producto_id END) productos,
        COUNT(DISTINCT CASE WHEN el.existencia_actual>0 AND l.activo=1 THEN el.lote_inventario_id END) lotes,
        COUNT_BIG(DISTINCT CASE WHEN e.existencia_actual<e.existencia_minima THEN e.inventario_producto_id END) bajoMinimo
      FROM dbo.inventario_existencias e
      INNER JOIN dbo.inventario_productos p ON p.producto_id=e.producto_id AND p.activo=1
      INNER JOIN dbo.inventario_almacenes a ON a.inventario_id=e.inventario_id AND a.activo=1
      LEFT JOIN dbo.inventario_existencias_lotes el ON el.inventario_producto_id=e.inventario_producto_id
      LEFT JOIN dbo.inventario_lotes l ON l.lote_inventario_id=el.lote_inventario_id
      WHERE e.activo=1
    `),
    ObjPrisma.inventarioLote.count({ where: { activo: true, fechaVencimiento: { lt: DtHoy }, existencias: { some: { existenciaActual: { gt: 0 }, existencia: { activo: true, producto: { activo: true }, almacen: { activo: true } } } } } }),
    ObjPrisma.inventarioLote.count({ where: { activo: true, fechaVencimiento: { gte: DtHoy, lt: DtLimiteExclusivo }, existencias: { some: { existenciaActual: { gt: 0 }, existencia: { activo: true, producto: { activo: true }, almacen: { activo: true } } } } } }),
    ObjPrisma.inventarioLote.findMany({
      where: { activo: true, fechaVencimiento: { gte: DtHoy, lt: DtLimiteExclusivo }, existencias: { some: { existenciaActual: { gt: 0 }, existencia: { activo: true, producto: { activo: true }, almacen: { activo: true } } } } },
      select: { loteInventarioId: true, codigoLote: true, fechaVencimiento: true, unidadBaseSnapshot: true, producto: { select: { codigo: true, nombre: true } }, existencias: { where: { existenciaActual: { gt: 0 }, existencia: { activo: true, almacen: { activo: true }, producto: { activo: true } } }, select: { existenciaActual: true } } },
      orderBy: [{ fechaVencimiento: "asc" }, { codigoLote: "asc" }], take: 5,
    }),
  ]);
  return {
    productosConExistencia: ArrConteos[0]?.productos ?? 0,
    lotesConSaldo: ArrConteos[0]?.lotes ?? 0,
    existenciasBajoMinimo: Reportes_numero(ArrConteos[0]?.bajoMinimo),
    lotesVencidos: IntVencidos,
    lotesProximosVencer: IntProximos,
    proximosVencimientos: ArrVencimientos.map((Obj) => ({
      loteInventarioId: Obj.loteInventarioId, codigoLote: Obj.codigoLote, fechaVencimiento: Obj.fechaVencimiento,
      unidadMedida: Obj.unidadBaseSnapshot, producto: Obj.producto,
      saldo: Obj.existencias.reduce((DecSuma, ObjExistencia) => DecSuma.add(ObjExistencia.existenciaActual), new Prisma.Decimal(0)),
    })),
  };
}

export async function Reportes_metricasVentas(DtInicio: Date, DtFinExclusivo: Date, DtInicioTendencia: Date) {
  const ObjPrisma = BaseDatos_obtenerCliente();
  const [ArrResumen, ArrTendencia] = await Promise.all([
    ObjPrisma.$queryRaw<Array<{ ventas: bigint; animales: bigint; ingreso: string }>>(Prisma.sql`
      WITH animales AS (SELECT vd.venta_id, COUNT_BIG(*) cantidad FROM dbo.ventas_detalles vd INNER JOIN dbo.ventas_detalles_animales va ON va.detalle_venta_id=vd.detalle_venta_id GROUP BY vd.venta_id)
      SELECT COUNT_BIG(*) AS ventas, COALESCE(SUM(a.cantidad),0) AS animales, CONVERT(NVARCHAR(100),COALESCE(SUM(v.total),0)) AS ingreso
      FROM dbo.ventas_registros v LEFT JOIN animales a ON a.venta_id=v.venta_id
      WHERE v.estado=N'CONFIRMADA' AND v.fecha_venta>=${DtInicio} AND v.fecha_venta<${DtFinExclusivo}
    `),
    ObjPrisma.$queryRaw<Array<{ anio: number; mes: number; cantidad: bigint; ingreso: string }>>(Prisma.sql`
      SELECT YEAR(fecha_venta) anio, MONTH(fecha_venta) mes, COUNT_BIG(*) cantidad, CONVERT(NVARCHAR(100), COALESCE(SUM(total),0)) ingreso
      FROM dbo.ventas_registros WHERE estado=N'CONFIRMADA' AND fecha_venta>=${DtInicioTendencia} AND fecha_venta<${DtFinExclusivo}
      GROUP BY YEAR(fecha_venta), MONTH(fecha_venta) ORDER BY anio, mes
    `),
  ]);
  const ObjResumen = ArrResumen[0];
  return { ventasConfirmadas: Reportes_numero(ObjResumen?.ventas), animalesVendidos: Reportes_numero(ObjResumen?.animales), ingresoMes: ObjResumen?.ingreso ?? "0", tendencia: ArrTendencia.map((Obj) => ({ anio: Obj.anio, mes: Obj.mes, cantidad: Reportes_numero(Obj.cantidad), ingreso: Obj.ingreso })) };
}

export async function Reportes_metricasSanidad(DtInicio: Date, DtFinExclusivo: Date) {
  const Arr = await BaseDatos_obtenerCliente().$queryRaw<Array<{ total: bigint; directas: bigint; globales: bigint }>>(Prisma.sql`SELECT COUNT_BIG(*) total, COALESCE(SUM(CASE WHEN animal_id IS NOT NULL THEN 1 ELSE 0 END),0) directas, COALESCE(SUM(CASE WHEN lote_produccion_id IS NOT NULL THEN 1 ELSE 0 END),0) globales FROM dbo.sanidad_aplicaciones WHERE estado=N'CONFIRMADA' AND fecha_aplicacion>=${DtInicio} AND fecha_aplicacion<${DtFinExclusivo}`);
  return { aplicacionesConfirmadas: Reportes_numero(Arr[0]?.total), aplicacionesDirectas: Reportes_numero(Arr[0]?.directas), aplicacionesGlobales: Reportes_numero(Arr[0]?.globales) };
}

interface ResultadoCostoHistorico { total: string; inconsistencias: number }
async function Reportes_costoHistorico(StrModulo: "ALIMENTACION" | "SANIDAD", DtInicio: Date, DtFinExclusivo: Date): Promise<ResultadoCostoHistorico> {
  const ObjPrisma = BaseDatos_obtenerCliente();
  if (StrModulo === "ALIMENTACION") {
    const Arr = await ObjPrisma.$queryRaw<Array<{ total: string; inconsistencias: bigint }>>(Prisma.sql`SELECT CONVERT(NVARCHAR(100),COALESCE(SUM(ABS(t.cantidad)*t.costo_unitario),0)) total, (SELECT COUNT_BIG(*) FROM dbo.alimentacion_detalles di INNER JOIN dbo.alimentacion_registros ri ON ri.alimentacion_id=di.alimentacion_id WHERE ri.estado=N'CONFIRMADA' AND ri.fecha_alimentacion>=${DtInicio} AND ri.fecha_alimentacion<${DtFinExclusivo} AND NOT EXISTS(SELECT 1 FROM dbo.inventario_transacciones ti WHERE ti.alimentacion_detalle_id=di.detalle_alimentacion_id AND ti.transaccion_revertida_id IS NULL AND ti.costo_unitario IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.inventario_transacciones rvi WHERE rvi.transaccion_revertida_id=ti.transaccion_inventario_id))) inconsistencias FROM dbo.inventario_transacciones t INNER JOIN dbo.alimentacion_detalles d ON d.detalle_alimentacion_id=t.alimentacion_detalle_id INNER JOIN dbo.alimentacion_registros r ON r.alimentacion_id=d.alimentacion_id WHERE r.estado=N'CONFIRMADA' AND r.fecha_alimentacion>=${DtInicio} AND r.fecha_alimentacion<${DtFinExclusivo} AND t.transaccion_revertida_id IS NULL AND t.costo_unitario IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.inventario_transacciones rv WHERE rv.transaccion_revertida_id=t.transaccion_inventario_id)`);
    return { total: Arr[0]?.total ?? "0", inconsistencias: Reportes_numero(Arr[0]?.inconsistencias) };
  }
  const Arr = await ObjPrisma.$queryRaw<Array<{ total: string; inconsistencias: bigint }>>(Prisma.sql`SELECT CONVERT(NVARCHAR(100),COALESCE(SUM(ABS(t.cantidad)*t.costo_unitario),0)) total, (SELECT COUNT_BIG(*) FROM dbo.sanidad_aplicaciones_fuentes fi INNER JOIN dbo.sanidad_aplicaciones_detalles di ON di.detalle_sanidad_id=fi.detalle_sanidad_id INNER JOIN dbo.sanidad_aplicaciones ri ON ri.aplicacion_sanitaria_id=di.aplicacion_sanitaria_id WHERE ri.estado=N'CONFIRMADA' AND ri.fecha_aplicacion>=${DtInicio} AND ri.fecha_aplicacion<${DtFinExclusivo} AND NOT EXISTS(SELECT 1 FROM dbo.inventario_transacciones ti WHERE ti.sanidad_fuente_id=fi.fuente_sanidad_id AND ti.transaccion_revertida_id IS NULL AND ti.costo_unitario IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.inventario_transacciones rvi WHERE rvi.transaccion_revertida_id=ti.transaccion_inventario_id))) inconsistencias FROM dbo.inventario_transacciones t INNER JOIN dbo.sanidad_aplicaciones_fuentes f ON f.fuente_sanidad_id=t.sanidad_fuente_id INNER JOIN dbo.sanidad_aplicaciones_detalles d ON d.detalle_sanidad_id=f.detalle_sanidad_id INNER JOIN dbo.sanidad_aplicaciones r ON r.aplicacion_sanitaria_id=d.aplicacion_sanitaria_id WHERE r.estado=N'CONFIRMADA' AND r.fecha_aplicacion>=${DtInicio} AND r.fecha_aplicacion<${DtFinExclusivo} AND t.transaccion_revertida_id IS NULL AND t.costo_unitario IS NOT NULL AND NOT EXISTS(SELECT 1 FROM dbo.inventario_transacciones rv WHERE rv.transaccion_revertida_id=t.transaccion_inventario_id)`);
  return { total: Arr[0]?.total ?? "0", inconsistencias: Reportes_numero(Arr[0]?.inconsistencias) };
}

export async function Reportes_metricasCostos(DtInicio: Date, DtFinExclusivo: Date) {
  const [alimentacion, sanidad] = await Promise.all([Reportes_costoHistorico("ALIMENTACION", DtInicio, DtFinExclusivo), Reportes_costoHistorico("SANIDAD", DtInicio, DtFinExclusivo)]);
  return { alimentacion, sanidad };
}
