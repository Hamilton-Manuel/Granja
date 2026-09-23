import { Prisma } from "../../../../generated/prisma/client.js";
import { BaseDatos_obtenerCliente } from "../../../database/prisma.js";
import type { AlimentacionCostoFuente } from "./concentrados.types.js";
import { Inventario_ejecutarSerializable, Inventario_buscarFuentesDisponiblesConTx } from "../../inventario/inventario.repository.js";
import type { AlimentacionRecetaConcentradoEntrada } from "./concentrados.types.js";
import { Fecha_obtenerAhoraGuatemala } from "../../../datetime/fecha.js";

export const Alimentacion_ejecutarConcentradosTx = Inventario_ejecutarSerializable;

export async function Alimentacion_catalogosConcentrados() {
  const ObjDb = BaseDatos_obtenerCliente();
  const [unidades, almacenes] = await Promise.all([
    Alimentacion_unidadesExactasConTx(ObjDb).then(Arr => Arr.filter(Obj => Obj.activo && Obj.dimension === "PESO")
      .map(Obj => ({ codigo: Obj.codigo, factorReferencia: Obj.factor }))),
    ObjDb.inventarioAlmacen.findMany({ where: { activo: true }, select: { inventarioId: true, codigo: true, nombre: true }, orderBy: { codigo: "asc" } }),
  ]);
  return { unidades, almacenes };
}
export function Alimentacion_productosConcentrados(StrBusqueda: string) {
  return BaseDatos_obtenerCliente().inventarioProducto.findMany({ where: { activo: true, unidad: { activo: true, dimension: "PESO" },
    OR: [{ nombre: { contains: StrBusqueda } }, { codigo: { contains: StrBusqueda } }] },
    select: { productoId: true, codigo: true, nombre: true, unidadMedida: true, activo: true }, orderBy: { productoId: "asc" }, take: 20 });
}

/** Solo lecturas. Reutiliza filtros/orden de Inventario, reemplazando los Decimal del adaptador. */
export async function Alimentacion_fuentesPrevisualizacionConTx(ObjTx: Prisma.TransactionClient, IntProductoId: number, DtDia: Date) {
  const ArrFuentes = await Inventario_buscarFuentesDisponiblesConTx(ObjTx, IntProductoId, DtDia);
  if (!ArrFuentes.length) return [];
  const ArrExactas = await ObjTx.$queryRaw<Array<{ id: number; cantidad: string; saldoAlmacen: string; costo: string }>>(Prisma.sql`
    SELECT f.existencia_lote_id id, CONVERT(NVARCHAR(100),f.existencia_actual) cantidad,
      CONVERT(NVARCHAR(100),e.existencia_actual) saldoAlmacen, CONVERT(NVARCHAR(100),l.costo_unitario) costo
    FROM dbo.inventario_existencias_lotes f
    JOIN dbo.inventario_existencias e ON e.inventario_producto_id=f.inventario_producto_id
    JOIN dbo.inventario_lotes l ON l.lote_inventario_id=f.lote_inventario_id
    WHERE f.producto_id=${IntProductoId}`);
  const ObjExactas = new Map(ArrExactas.map(Obj => [Obj.id, Obj]));
  return ArrFuentes.map(Obj => {
    const ObjExacta = ObjExactas.get(Obj.existenciaLoteId);
    if (!ObjExacta) throw new Error("CONCENTRADOS_FUENTE_INCONSISTENTE");
    return { existenciaLoteId: Obj.existenciaLoteId, inventarioId: Obj.existencia.inventarioId,
      inventarioProductoId: Obj.inventarioProductoId, loteInventarioId: Obj.loteInventarioId,
      codigoLote: Obj.lote.codigoLote, unidadBase: Obj.lote.unidadBaseSnapshot,
      fechaVencimiento: Obj.lote.fechaVencimiento, transaccionOrigenId: Obj.lote.transaccionOrigenId,
      existenciaActual: ObjExacta.cantidad, saldoAlmacen: ObjExacta.saldoAlmacen, costoUnitario: ObjExacta.costo };
  });
}
export function Alimentacion_destinoPrevisualizacionConTx(ObjTx: Prisma.TransactionClient, IntId: number) {
  return ObjTx.inventarioAlmacen.findUnique({ where: { inventarioId: IntId }, select: { inventarioId: true, codigo: true, nombre: true, activo: true } });
}
export function Alimentacion_unidadesExactasConTx(ObjTx: Prisma.TransactionClient) {
  return ObjTx.$queryRaw<Array<{ codigo: string; dimension: string; activo: boolean; factor: string }>>`
    SELECT codigo, dimension, activo, CONVERT(NVARCHAR(100),factor_referencia) factor
    FROM dbo.inventario_unidades_medida ORDER BY codigo`;
}

/** El adaptador MSSQL puede pasar Decimal por Number: recuperar siempre cantidades como texto. */
async function Alimentacion_recetasExactasConTx<T extends { recetaId: number; cantidadBase: Prisma.Decimal; detalles?: Array<{ recetaDetalleId: number; cantidad: Prisma.Decimal }> }>(ObjTx: Pick<Prisma.TransactionClient, "$queryRaw">, ArrRecetas: T[]): Promise<T[]> {
  if (ArrRecetas.length === 0) return ArrRecetas;
  const ArrIds = ArrRecetas.map(Obj => Obj.recetaId);
  const ArrBases = await ObjTx.$queryRaw<Array<{ recetaId: number; cantidad: string }>>(Prisma.sql`
    SELECT receta_id recetaId, CONVERT(NVARCHAR(100),cantidad_base) cantidad
    FROM dbo.alimentacion_recetas_concentrados WHERE receta_id IN (${Prisma.join(ArrIds)})`);
  const ArrDetalles = ArrRecetas.some(Obj => Obj.detalles) ? await ObjTx.$queryRaw<Array<{ detalleId: number; cantidad: string }>>(Prisma.sql`
    SELECT receta_detalle_id detalleId, CONVERT(NVARCHAR(100),cantidad) cantidad
    FROM dbo.alimentacion_recetas_concentrados_detalles WHERE receta_id IN (${Prisma.join(ArrIds)})`) : [];
  const ObjBases = new Map(ArrBases.map(Obj => [Obj.recetaId, Obj.cantidad]));
  const ObjDetalles = new Map(ArrDetalles.map(Obj => [Obj.detalleId, Obj.cantidad]));
  return ArrRecetas.map(Obj => ({ ...Obj, cantidadBase: new Prisma.Decimal(ObjBases.get(Obj.recetaId)!),
    ...(Obj.detalles ? { detalles: Obj.detalles.map(ObjDetalle => ({ ...ObjDetalle, cantidad: new Prisma.Decimal(ObjDetalles.get(ObjDetalle.recetaDetalleId)!) })) } : {}) }));
}

export async function Alimentacion_bloquearGrafoConTx(ObjTx: Prisma.TransactionClient) {
  const ArrResultado = await ObjTx.$queryRaw<Array<{ resultado: number }>>`
    DECLARE @resultado INT;
    EXEC @resultado = sys.sp_getapplock @Resource=N'alimentacion_concentrados_grafo',
      @LockMode=N'Exclusive', @LockOwner=N'Transaction', @LockTimeout=3000;
    SELECT @resultado resultado;`;
  if ((ArrResultado[0]?.resultado ?? -999) < 0) throw new Error("CONCENTRADOS_CONCURRENCIA");
}

export function Alimentacion_grafoConTx(ObjTx: Prisma.TransactionClient) {
  return ObjTx.alimentacionRecetaConcentrado.findMany({ select: { recetaId: true, productoId: true,
    detalles: { where: { activo: true }, select: { productoId: true } } } });
}
export function Alimentacion_productoConTx(ObjTx: Prisma.TransactionClient, IntProductoId: number) {
  return ObjTx.inventarioProducto.findUnique({ where: { productoId: IntProductoId }, include: { unidad: true, concentrado: true } });
}
export function Alimentacion_unidadConTx(ObjTx: Prisma.TransactionClient, StrCodigo: string) {
  return ObjTx.inventarioUnidadMedida.findUnique({ where: { codigo: StrCodigo } });
}
export function Alimentacion_concentradoConTx(ObjTx: Prisma.TransactionClient, IntId: number) {
  return ObjTx.alimentacionConcentrado.findUnique({ where: { concentradoId: IntId } });
}
export async function Alimentacion_recetaConTx(ObjTx: Prisma.TransactionClient, IntId: number) {
  const ObjReceta = await ObjTx.alimentacionRecetaConcentrado.findUnique({ where: { recetaId: IntId } });
  return ObjReceta ? (await Alimentacion_recetasExactasConTx(ObjTx, [ObjReceta]))[0]! : null;
}
export function Alimentacion_clasificarConTx(ObjTx: Prisma.TransactionClient, IntProductoId: number, IntUsuarioId: number) {
  const DtAhora = Fecha_obtenerAhoraGuatemala();
  return ObjTx.alimentacionConcentrado.create({ data: { productoId: IntProductoId, usuarioId: IntUsuarioId, fechaCreacion: DtAhora, fechaActualizacion: DtAhora } });
}
export function Alimentacion_estadoConcentradoConTx(ObjTx: Prisma.TransactionClient, IntId: number, BoolActivo: boolean) {
  return ObjTx.alimentacionConcentrado.update({ where: { concentradoId: IntId }, data: { activo: BoolActivo, fechaActualizacion: Fecha_obtenerAhoraGuatemala() } });
}
export async function Alimentacion_guardarRecetaConTx(ObjTx: Prisma.TransactionClient, IntId: number | null,
  IntProductoId: number, ObjEntrada: AlimentacionRecetaConcentradoEntrada, IntUsuarioId: number, IntVersion?: number) {
  const DtAhora = Fecha_obtenerAhoraGuatemala();
  const ObjDatos = { nombre: ObjEntrada.nombre, descripcion: ObjEntrada.descripcion ?? null,
    cantidadBase: "1", unidadBase: ObjEntrada.unidadBase, usuarioActualizacionId: IntUsuarioId, fechaActualizacion: DtAhora };
  if (IntId !== null) {
    if (IntVersion === undefined) throw new Error("CONCENTRADOS_VERSION_CAMBIADA");
    const ObjCambio = await ObjTx.alimentacionRecetaConcentrado.updateMany({ where: { recetaId: IntId, version: IntVersion }, data: { ...ObjDatos, version: { increment: 1 } } });
    if (ObjCambio.count !== 1) throw new Error("CONCENTRADOS_VERSION_CAMBIADA");
  }
  const ObjReceta = IntId === null ? await ObjTx.alimentacionRecetaConcentrado.create({ data: { ...ObjDatos,
    concentradoId: ObjEntrada.concentradoId, productoId: IntProductoId, usuarioId: IntUsuarioId, fechaCreacion: DtAhora } })
    : await ObjTx.alimentacionRecetaConcentrado.findUniqueOrThrow({ where: { recetaId: IntId } });
  // Marcador válido no visible fuera de la transacción; el importe real se envía como NVARCHAR.
  await ObjTx.$executeRaw`UPDATE dbo.alimentacion_recetas_concentrados SET cantidad_base=CAST(${ObjEntrada.cantidadBase} AS DECIMAL(24,6)) WHERE receta_id=${ObjReceta.recetaId}`;
  await ObjTx.alimentacionRecetaConcentradoDetalle.updateMany({ where: { recetaId: ObjReceta.recetaId }, data: { activo: false } });
  for (const ObjDetalle of ObjEntrada.detalles) {
    await ObjTx.alimentacionRecetaConcentradoDetalle.upsert({
      where: { recetaId_productoId: { recetaId: ObjReceta.recetaId, productoId: ObjDetalle.productoId } },
      create: { recetaId: ObjReceta.recetaId, ...ObjDetalle, cantidad: "1" }, update: { cantidad: "1", unidadMedida: ObjDetalle.unidadMedida, activo: true },
    });
    await ObjTx.$executeRaw`UPDATE dbo.alimentacion_recetas_concentrados_detalles SET cantidad=CAST(${ObjDetalle.cantidad} AS DECIMAL(24,6)) WHERE receta_id=${ObjReceta.recetaId} AND producto_id=${ObjDetalle.productoId}`;
  }
  return (await Alimentacion_recetasExactasConTx(ObjTx, [ObjReceta]))[0]!;
}
export async function Alimentacion_estadoRecetaConTx(ObjTx: Prisma.TransactionClient, IntId: number, IntVersion: number, BoolActivo: boolean, IntUsuarioId: number) {
  const ObjCambio = await ObjTx.alimentacionRecetaConcentrado.updateMany({ where: { recetaId: IntId, version: IntVersion },
    data: { activo: BoolActivo, version: { increment: 1 }, usuarioActualizacionId: IntUsuarioId, fechaActualizacion: Fecha_obtenerAhoraGuatemala() } });
  if (ObjCambio.count !== 1) throw new Error("CONCENTRADOS_VERSION_CAMBIADA");
  return (await Alimentacion_recetaConTx(ObjTx, IntId))!;
}
export function Alimentacion_auditarConTx(ObjTx: Prisma.TransactionClient, IntUsuarioId: number, StrAccion: string, StrDescripcion: string, StrIp?: string) {
  return ObjTx.usuarioBitacora.create({ data: { usuarioId: IntUsuarioId, modulo: "ALIMENTACION", accion: StrAccion,
    descripcion: StrDescripcion, resultado: "EXITO", direccionIp: StrIp ?? null } });
}
const ObjRecetaDetalle = { detalles: { where: { activo: true }, include: { producto: { select: { codigo: true, nombre: true, unidadMedida: true, activo: true } } }, orderBy: { productoId: "asc" as const } } };
export async function Alimentacion_detalleRecetaConTx(ObjTx: Prisma.TransactionClient, IntId: number) {
  const ObjReceta = await ObjTx.alimentacionRecetaConcentrado.findUnique({ where: { recetaId: IntId }, include: ObjRecetaDetalle });
  return ObjReceta ? (await Alimentacion_recetasExactasConTx(ObjTx, [ObjReceta]))[0]! : null;
}
export function Alimentacion_obtenerReceta(IntId: number) {
  return Inventario_ejecutarSerializable(ObjTx => Alimentacion_detalleRecetaConTx(ObjTx, IntId));
}
export async function Alimentacion_listarConcentrados(Obj: { pagina: number; limite: number; busqueda?: string | undefined }) {
  const ObjDb = BaseDatos_obtenerCliente();
  const ObjFiltro: Prisma.AlimentacionConcentradoWhereInput = Obj.busqueda ? { producto: { OR: [{ nombre: { contains: Obj.busqueda } }, { codigo: { contains: Obj.busqueda } }] } } : {};
  const [datos, total] = await ObjDb.$transaction([
    ObjDb.alimentacionConcentrado.findMany({ where: ObjFiltro, include: { producto: { select: { codigo: true, nombre: true, unidadMedida: true, activo: true } } }, orderBy: { concentradoId: "asc" }, skip: (Obj.pagina - 1) * Obj.limite, take: Obj.limite }),
    ObjDb.alimentacionConcentrado.count({ where: ObjFiltro }),
  ]);
  return { datos, paginacion: { pagina: Obj.pagina, limite: Obj.limite, total } };
}
export async function Alimentacion_listarRecetas(Obj: { pagina: number; limite: number; busqueda?: string | undefined; concentradoId?: number | undefined }) {
  const ObjFiltro: Prisma.AlimentacionRecetaConcentradoWhereInput = { ...(Obj.busqueda ? { nombre: { contains: Obj.busqueda } } : {}), ...(Obj.concentradoId ? { concentradoId: Obj.concentradoId } : {}) };
  return Inventario_ejecutarSerializable(async ObjTx => {
    const [ArrDatos, IntTotal] = await Promise.all([
      ObjTx.alimentacionRecetaConcentrado.findMany({ where: ObjFiltro, include: ObjRecetaDetalle, orderBy: { recetaId: "asc" }, skip: (Obj.pagina - 1) * Obj.limite, take: Obj.limite }),
      ObjTx.alimentacionRecetaConcentrado.count({ where: ObjFiltro }),
    ]);
    return { datos: await Alimentacion_recetasExactasConTx(ObjTx, ArrDatos), paginacion: { pagina: Obj.pagina, limite: Obj.limite, total: IntTotal } };
  });
}

export function Alimentacion_obtenerConcentrado(IntConcentradoId: number) {
  return BaseDatos_obtenerCliente().alimentacionConcentrado.findUnique({
    where: { concentradoId: IntConcentradoId },
    select: { concentradoId: true, productoId: true, activo: true,
      producto: { select: { codigo: true, nombre: true, unidadMedida: true, activo: true } } },
  });
}

/** Evita pérdida de precisión del adaptador: los valores SQL llegan como texto. */
export async function Alimentacion_leerCostoConsumoConTx(
  ObjTx: Prisma.TransactionClient, IntTransaccionId: number, IntExistenciaLoteId: number, StrUnidadBase: string,
): Promise<AlimentacionCostoFuente> {
  const ArrMovimientos = await ObjTx.$queryRaw<Array<{ cantidad: string; costo: string }>>`
    SELECT CONVERT(NVARCHAR(100), cantidad) cantidad,
           CONVERT(NVARCHAR(100), costo_unitario) costo
    FROM dbo.inventario_transacciones
    WHERE transaccion_inventario_id = ${IntTransaccionId}
      AND existencia_lote_id = ${IntExistenciaLoteId}
      AND unidad_base_snapshot = ${StrUnidadBase}
      AND tipo_transaccion = N'SALIDA' AND subtipo_transaccion = N'ELABORACION_CONSUMO'
      AND cantidad < 0 AND costo_unitario IS NOT NULL
      AND transaccion_revertida_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM dbo.inventario_transacciones r
                      WHERE r.transaccion_revertida_id = ${IntTransaccionId})`;
  const ObjMovimiento = ArrMovimientos[0];
  if (ArrMovimientos.length !== 1 || !ObjMovimiento) throw new Error("ELABORACION_CONSUMO_INCONSISTENTE");
  return { IntTransaccionId, DecCantidadDescontada: new Prisma.Decimal(ObjMovimiento.cantidad).abs(),
    DecCostoUnitarioHistorico: new Prisma.Decimal(ObjMovimiento.costo) };
}
