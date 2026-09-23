import { Prisma } from "../../../../generated/prisma/client.js";

const ObjCabecera = {
  cantidadBaseReceta: ["cantidad_base_receta", "24,6"], factorReferenciaReceta: ["factor_referencia_receta", "30,15"],
  cantidadTeorica: ["cantidad_teorica", "24,6"], cantidadReal: ["cantidad_real", "24,6"], factorReferenciaCaptura: ["factor_referencia_captura", "30,15"],
  cantidadTeoricaBase: ["cantidad_teorica_base", "24,6"], cantidadRealBase: ["cantidad_real_base", "24,6"], factorReferenciaBase: ["factor_referencia_base", "30,15"],
  costoTotal: ["costo_total", "38,24"], costoUnitario: ["costo_unitario", "38,18"], residualValoracion: ["residual_valoracion", "38,24"],
} as const;
const ObjDetalle = { cantidadReceta: ["cantidad_receta", "24,6"], factorReferenciaReceta: ["factor_referencia_receta", "30,15"],
  factorReferenciaBase: ["factor_referencia_base", "30,15"], cantidadConsumida: ["cantidad_consumida", "24,6"] } as const;
const ObjFuente = { cantidadConsumida: ["cantidad_consumida", "24,6"], costoUnitarioHistorico: ["costo_unitario_historico", "38,18"], costoTotal: ["costo_total", "38,24"] } as const;
type CamposExactos = Record<string, readonly [string, string]>;
function Alimentacion_marcadores(ObjCampos: CamposExactos) { return Object.fromEntries(Object.keys(ObjCampos).map(Str => [Str, "1"])); }

/** Identificadores exclusivamente constantes del módulo; todos los valores usan parámetros NVARCHAR. */
async function Alimentacion_escribirExactosConTx(ObjTx: Prisma.TransactionClient, StrTabla: string, StrId: string, IntId: number, ObjCampos: CamposExactos, ObjDatos: object) {
  const ObjValores = ObjDatos as Record<string, unknown>;
  const ArrCambios = Object.entries(ObjCampos).map(([StrPropiedad, [StrColumna, StrTipo]]) =>
    Prisma.sql`${Prisma.raw(StrColumna)}=CAST(${String(ObjValores[StrPropiedad])} AS DECIMAL(${Prisma.raw(StrTipo)}))`);
  await ObjTx.$executeRaw(Prisma.sql`UPDATE dbo.${Prisma.raw(StrTabla)} SET ${Prisma.join(ArrCambios)} WHERE ${Prisma.raw(StrId)}=${IntId}`);
}
async function Alimentacion_leerExactosConTx<T extends CamposExactos>(ObjTx: Prisma.TransactionClient, StrTabla: string, StrId: string, IntId: number, ObjCampos: T) {
  const ArrColumnas = Object.entries(ObjCampos).map(([StrPropiedad, [StrColumna]]) => Prisma.sql`CONVERT(NVARCHAR(100),${Prisma.raw(StrColumna)}) ${Prisma.raw(StrPropiedad)}`);
  const Arr = await ObjTx.$queryRaw<Array<Record<keyof T, string>>>(Prisma.sql`SELECT ${Prisma.join(ArrColumnas)} FROM dbo.${Prisma.raw(StrTabla)} WHERE ${Prisma.raw(StrId)}=${IntId}`);
  if (!Arr[0]) throw new Error("ELABORACION_NO_ENCONTRADA");
  return Arr[0];
}
export function Alimentacion_usuarioElaboracionConTx(ObjTx: Prisma.TransactionClient, IntId: number) {
  return ObjTx.usuarioCuenta.findUnique({ where: { usuarioId: IntId }, select: { estado: true,
    rol: { select: { activo: true, rolesPermisos: { select: { permiso: { select: { codigo: true, activo: true } } } } } },
    permisosDirectos: { select: { efecto: true, permiso: { select: { codigo: true, activo: true } } } } } });
}
/** UPDLOCK evita conversión simultánea de locks compartidos; HOLDLOCK protege también una clave ausente. */
export async function Alimentacion_idempotenciaConTx(ObjTx: Prisma.TransactionClient, StrClave: string) {
  const Arr = await ObjTx.$queryRaw<Array<{ elaboracionId: number; usuarioId: number; hashSolicitud: string }>>`
    SELECT elaboracion_id elaboracionId,usuario_id usuarioId,hash_solicitud hashSolicitud
    FROM dbo.alimentacion_elaboraciones WITH (UPDLOCK,HOLDLOCK)
    WHERE clave_idempotencia=CAST(${StrClave} AS UNIQUEIDENTIFIER)`;
  return Arr[0];
}
export async function Alimentacion_guardarElaboracionConTx(ObjTx: Prisma.TransactionClient, ObjDatos: Prisma.AlimentacionElaboracionUncheckedCreateInput) {
  const Obj = await ObjTx.alimentacionElaboracion.create({ data: { ...ObjDatos, ...Alimentacion_marcadores(ObjCabecera) } });
  await Alimentacion_escribirExactosConTx(ObjTx, "alimentacion_elaboraciones", "elaboracion_id", Obj.elaboracionId, ObjCabecera, ObjDatos);
  return Obj.elaboracionId;
}
export async function Alimentacion_guardarDetalleElaboracionConTx(ObjTx: Prisma.TransactionClient, ObjDatos: Prisma.AlimentacionElaboracionDetalleUncheckedCreateInput) {
  const Obj = await ObjTx.alimentacionElaboracionDetalle.create({ data: { ...ObjDatos, ...Alimentacion_marcadores(ObjDetalle) } });
  await Alimentacion_escribirExactosConTx(ObjTx, "alimentacion_elaboraciones_detalles", "elaboracion_detalle_id", Obj.elaboracionDetalleId, ObjDetalle, ObjDatos);
  return Obj.elaboracionDetalleId;
}
export async function Alimentacion_guardarFuenteElaboracionConTx(ObjTx: Prisma.TransactionClient, ObjDatos: Prisma.AlimentacionElaboracionFuenteUncheckedCreateInput) {
  const Obj = await ObjTx.alimentacionElaboracionFuente.create({ data: { ...ObjDatos, ...Alimentacion_marcadores(ObjFuente) } });
  await Alimentacion_escribirExactosConTx(ObjTx, "alimentacion_elaboraciones_fuentes", "elaboracion_fuente_id", Obj.elaboracionFuenteId, ObjFuente, ObjDatos);
}
export async function Alimentacion_obtenerElaboracionConTx(ObjTx: Prisma.TransactionClient, IntId: number) {
  const Obj = await ObjTx.alimentacionElaboracion.findUniqueOrThrow({ where: { elaboracionId: IntId },
    include: { lote: { select: { codigoLote: true, fechaVencimiento: true } },
      detalles: { orderBy: { productoId: "asc" }, include: { fuentes: { orderBy: { elaboracionFuenteId: "asc" } } } } } });
  const ArrDetalles = [];
  for (const ObjD of Obj.detalles) {
    const ArrFuentes = [];
    for (const ObjF of ObjD.fuentes) ArrFuentes.push({ ...ObjF, ...await Alimentacion_leerExactosConTx(ObjTx, "alimentacion_elaboraciones_fuentes", "elaboracion_fuente_id", ObjF.elaboracionFuenteId, ObjFuente) });
    ArrDetalles.push({ ...ObjD, ...await Alimentacion_leerExactosConTx(ObjTx, "alimentacion_elaboraciones_detalles", "elaboracion_detalle_id", ObjD.elaboracionDetalleId, ObjDetalle), fuentes: ArrFuentes });
  }
  return { ...Obj, ...await Alimentacion_leerExactosConTx(ObjTx, "alimentacion_elaboraciones", "elaboracion_id", IntId, ObjCabecera), detalles: ArrDetalles };
}
/** Solo presentación: conserva los importes exactos y los snapshots confirmados. */
export async function Alimentacion_detallePresentacionConTx(ObjTx: Prisma.TransactionClient, IntId: number) {
  const Obj = await ObjTx.alimentacionElaboracion.findUnique({ where: { elaboracionId: IntId }, select: {
    usuario: { select: { nombreCompleto: true } }, lote: { select: { codigoLote: true, fechaVencimiento: true } },
    existenciaDestino: { select: { existencia: { select: { almacen: { select: { inventarioId: true, codigo: true, nombre: true } } } } } },
    detalles: { select: { fuentes: { select: { elaboracionFuenteId: true, existenciaLote: { select: {
      lote: { select: { loteInventarioId: true, codigoLote: true } },
      existencia: { select: { almacen: { select: { inventarioId: true, codigo: true, nombre: true } } } },
    } } } } } },
  } });
  if (!Obj) return null;
  const ObjExacto = await Alimentacion_obtenerElaboracionConTx(ObjTx, IntId);
  const ObjFuentes = new Map(Obj.detalles.flatMap(ObjD => ObjD.fuentes.map(ObjF => [ObjF.elaboracionFuenteId, ObjF.existenciaLote] as const)));
  return { ...ObjExacto, usuario: Obj.usuario, lote: Obj.lote, almacenDestino: Obj.existenciaDestino.existencia.almacen,
    detalles: ObjExacto.detalles.map(ObjD => ({ ...ObjD, fuentes: ObjD.fuentes.map(ObjF => ({ ...ObjF,
      lote: ObjFuentes.get(ObjF.elaboracionFuenteId)!.lote,
      almacen: ObjFuentes.get(ObjF.elaboracionFuenteId)!.existencia.almacen,
    })) })) };
}
export async function Alimentacion_historialConTx(ObjTx: Prisma.TransactionClient, ObjConsulta: { pagina: number; limite: number; concentradoId?: number | undefined; busqueda?: string | undefined }) {
  const ObjFiltro: Prisma.AlimentacionElaboracionWhereInput = {
    ...(ObjConsulta.concentradoId ? { receta: { concentradoId: ObjConsulta.concentradoId } } : {}),
    ...(ObjConsulta.busqueda ? { OR: [{ nombreProductoSnapshot: { contains: ObjConsulta.busqueda } }, { nombreRecetaSnapshot: { contains: ObjConsulta.busqueda } }, { codigoProductoSnapshot: { contains: ObjConsulta.busqueda } }] } : {}),
  };
  const Arr = await ObjTx.alimentacionElaboracion.findMany({ where: ObjFiltro, orderBy: [{ fechaEfectiva: "desc" }, { elaboracionId: "desc" }],
    skip: (ObjConsulta.pagina - 1) * ObjConsulta.limite, take: ObjConsulta.limite,
    select: { elaboracionId: true, fechaEfectiva: true, nombreProductoSnapshot: true, codigoProductoSnapshot: true,
      nombreRecetaSnapshot: true, versionReceta: true, estado: true, unidadBaseSnapshot: true, usuario: { select: { nombreCompleto: true } } } });
  const ArrDatos = [];
  for (const Obj of Arr) ArrDatos.push({ ...Obj, ...await Alimentacion_leerExactosConTx(ObjTx, "alimentacion_elaboraciones", "elaboracion_id", Obj.elaboracionId,
    { cantidadRealBase: ObjCabecera.cantidadRealBase, costoTotal: ObjCabecera.costoTotal }) });
  return { datos: ArrDatos, paginacion: { pagina: ObjConsulta.pagina, limite: ObjConsulta.limite, total: await ObjTx.alimentacionElaboracion.count({ where: ObjFiltro }) } };
}
export async function Alimentacion_fechaMovimientosConTx(ObjTx: Prisma.TransactionClient, ArrIds: number[], DtFecha: Date, IntLoteDestino: number) {
  // Evita el límite de parámetros de SQL Server cuando una producción usa miles de fuentes.
  for (let IntInicio = 0; IntInicio < ArrIds.length; IntInicio += 500) {
    await ObjTx.inventarioTransaccion.updateMany({ where: { transaccionInventarioId: { in: ArrIds.slice(IntInicio, IntInicio + 500) } }, data: { fechaTransaccion: DtFecha } });
  }
  await ObjTx.inventarioLote.update({ where: { loteInventarioId: IntLoteDestino }, data: { fechaIngreso: DtFecha } });
}
