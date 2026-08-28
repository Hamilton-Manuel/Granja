import { Prisma } from "../../../generated/prisma/client.js";
import { BaseDatos_obtenerCliente } from "../../database/prisma.js";
import { Fecha_obtenerAhoraGuatemala } from "../../datetime/fecha.js";

async function Inventario_ejecutarSerializable<T>(Inventario_operacion:(ObjTx:Prisma.TransactionClient)=>Promise<T>,_ObjOpciones?:unknown):Promise<T>{for(let IntIntento=1;IntIntento<=3;IntIntento+=1){try{return await BaseDatos_obtenerCliente().$transaction(Inventario_operacion,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}catch(ObjError){if(!(ObjError instanceof Prisma.PrismaClientKnownRequestError)||ObjError.code!=="P2034"||IntIntento===3)throw ObjError;}}throw new Error("TRANSACCION_NO_COMPLETADA");}

const ObjSeleccionProductoResumen = { productoId: true, codigo: true, nombre: true, unidadMedida: true, manejaLotes: true, activo: true } satisfies Prisma.InventarioProductoSelect;
const ObjSeleccionAlmacenResumen = { inventarioId: true, codigo: true, nombre: true, activo: true } satisfies Prisma.InventarioAlmacenSelect;
const ObjSeleccionProveedorResumen = { proveedorId: true, codigo: true, nombre: true, nombreComercial: true, activo: true } satisfies Prisma.ProveedorRegistroSelect;
const ObjSeleccionUsuarioResumen = { usuarioId: true, nombreCompleto: true } satisfies Prisma.UsuarioCuentaSelect;
const ObjSeleccionLoteResumen = { loteInventarioId: true, codigoLote: true, fechaFabricacion: true, fechaVencimiento: true, costoUnitario: true, activo: true } satisfies Prisma.InventarioLoteSelect;
const ObjSeleccionMovimientoEnriquecido = {
  transaccionInventarioId: true, inventarioProductoId: true, existenciaLoteId: true, transferenciaId: true, transaccionRevertidaId: true,
  usuarioId: true, proveedorId: true, loteProduccionId: true, animalId: true, alimentacionDetalleId: true, sanidadFuenteId: true,
  tipoTransaccion: true, subtipoTransaccion: true, cantidad: true, costoUnitario: true, documentoReferencia: true, motivo: true, observaciones: true, fechaTransaccion: true,
  existencia: { select: { producto: { select: ObjSeleccionProductoResumen }, almacen: { select: ObjSeleccionAlmacenResumen } } },
  existenciaLote: { select: { lote: { select: ObjSeleccionLoteResumen } } },
  proveedor: { select: ObjSeleccionProveedorResumen }, usuario: { select: ObjSeleccionUsuarioResumen },
  reversion: { select: { transaccionInventarioId: true, fechaTransaccion: true } },
} satisfies Prisma.InventarioTransaccionSelect;

function Inventario_proyectarMovimiento(ObjMovimiento: Prisma.InventarioTransaccionGetPayload<{ select: typeof ObjSeleccionMovimientoEnriquecido }>) {
  const { existencia, existenciaLote, reversion, ...ObjDatos } = ObjMovimiento;
  return { ...ObjDatos, producto: existencia.producto, almacen: existencia.almacen, lote: existenciaLote?.lote ?? null, revertida: reversion !== null, reversion };
}

export const Inventario_obtenerCategoria = (IntCategoriaId: number) => BaseDatos_obtenerCliente().inventarioCategoria.findUnique({ where: { categoriaId: IntCategoriaId } });
export const Inventario_obtenerAlmacen = (IntInventarioId: number) => BaseDatos_obtenerCliente().inventarioAlmacen.findUnique({ where: { inventarioId: IntInventarioId } });
export const Inventario_obtenerProducto = (IntProductoId: number) => BaseDatos_obtenerCliente().inventarioProducto.findUnique({ where: { productoId: IntProductoId }, include: { categoria: true } });
export const Inventario_obtenerLote = (IntLoteId: number) => BaseDatos_obtenerCliente().inventarioLote.findUnique({ where: { loteInventarioId: IntLoteId }, include: { producto: true } });
export const Inventario_obtenerProveedorProducto = (IntProveedorId: number, IntProductoId: number) => BaseDatos_obtenerCliente().proveedorProducto.findUnique({ where: { proveedorId_productoId: { proveedorId: IntProveedorId, productoId: IntProductoId } }, include: { proveedor: true } });
export const Inventario_obtenerProveedor = (IntProveedorId: number) => BaseDatos_obtenerCliente().proveedorRegistro.findUnique({ where: { proveedorId: IntProveedorId }, select: ObjSeleccionProveedorResumen });
export async function Inventario_obtenerUnidad(StrCodigo:string){const Arr=await BaseDatos_obtenerCliente().$queryRaw<Array<{codigo:string;nombre:string;dimension:string;factorReferencia:string;activo:boolean}>>`SELECT codigo,nombre,dimension,CONVERT(NVARCHAR(100),factor_referencia) factorReferencia,activo FROM dbo.inventario_unidades_medida WHERE codigo=${StrCodigo}`;return Arr[0]??null;}
export const Inventario_obtenerExistencia = (IntInventarioProductoId: number) => BaseDatos_obtenerCliente().inventarioExistencia.findUnique({ where: { inventarioProductoId: IntInventarioProductoId } });
export async function Inventario_productoTieneActividad(IntProductoId: number): Promise<boolean> {
  const ObjPrisma = BaseDatos_obtenerCliente();
  const [IntLotes, IntExistencias, IntMovimientos] = await Promise.all([
    ObjPrisma.inventarioLote.count({ where: { productoId: IntProductoId } }),
    ObjPrisma.inventarioExistencia.count({ where: { productoId: IntProductoId } }),
    ObjPrisma.inventarioTransaccion.count({ where: { existencia: { productoId: IntProductoId } } }),
  ]);
  return IntLotes > 0 || IntExistencias > 0 || IntMovimientos > 0;
}

export async function Inventario_listarCategorias(Obj: { IntPagina: number; IntLimite: number; StrBusqueda?: string | undefined; BoolActivo?: boolean | undefined }) {
  const where: Prisma.InventarioCategoriaWhereInput = { ...(Obj.BoolActivo === undefined ? {} : { activo: Obj.BoolActivo }), ...(Obj.StrBusqueda ? { nombre: { contains: Obj.StrBusqueda } } : {}) };
  const ObjPrisma = BaseDatos_obtenerCliente();
  const [datos, total] = await ObjPrisma.$transaction([ObjPrisma.inventarioCategoria.findMany({ where, orderBy: { categoriaId: "asc" }, skip: (Obj.IntPagina - 1) * Obj.IntLimite, take: Obj.IntLimite }), ObjPrisma.inventarioCategoria.count({ where })]);
  return { datos, total };
}
export async function Inventario_listarAlmacenes(Obj: { IntPagina: number; IntLimite: number; StrBusqueda?: string | undefined; BoolActivo?: boolean | undefined }) {
  const where: Prisma.InventarioAlmacenWhereInput = { ...(Obj.BoolActivo === undefined ? {} : { activo: Obj.BoolActivo }), ...(Obj.StrBusqueda ? { OR: [{ codigo: { contains: Obj.StrBusqueda } }, { nombre: { contains: Obj.StrBusqueda } }] } : {}) };
  const ObjPrisma = BaseDatos_obtenerCliente(); const [datos, total] = await ObjPrisma.$transaction([ObjPrisma.inventarioAlmacen.findMany({ where, orderBy: { inventarioId: "asc" }, skip: (Obj.IntPagina - 1) * Obj.IntLimite, take: Obj.IntLimite }), ObjPrisma.inventarioAlmacen.count({ where })]); return { datos, total };
}
export async function Inventario_listarProductos(Obj: { IntPagina: number; IntLimite: number; StrBusqueda?: string | undefined; BoolActivo?: boolean | undefined; IntCategoriaId?: number | undefined; BoolManejaLotes?: boolean | undefined }) {
  const where: Prisma.InventarioProductoWhereInput = { ...(Obj.BoolActivo === undefined ? {} : { activo: Obj.BoolActivo }), ...(Obj.IntCategoriaId ? { categoriaId: Obj.IntCategoriaId } : {}), ...(Obj.BoolManejaLotes === undefined ? {} : { manejaLotes: Obj.BoolManejaLotes }), ...(Obj.StrBusqueda ? { OR: [{ codigo: { contains: Obj.StrBusqueda } }, { nombre: { contains: Obj.StrBusqueda } }] } : {}) };
  const ObjPrisma = BaseDatos_obtenerCliente(); const select = { productoId: true, categoriaId: true, codigo: true, nombre: true, descripcion: true, unidadMedida: true, manejaLotes: true, activo: true, fechaCreacion: true, fechaActualizacion: true, categoria: { select: { categoriaId: true, nombre: true, activo: true } } } satisfies Prisma.InventarioProductoSelect;
  const [datos, total] = await ObjPrisma.$transaction([ObjPrisma.inventarioProducto.findMany({ where, select, orderBy: { productoId: "asc" }, skip: (Obj.IntPagina - 1) * Obj.IntLimite, take: Obj.IntLimite }), ObjPrisma.inventarioProducto.count({ where })]); return { datos, total };
}
export async function Inventario_listarProveedores(Obj: { IntPagina: number; IntLimite: number; StrBusqueda?: string | undefined; BoolActivo?: boolean | undefined }) {
  const where: Prisma.ProveedorRegistroWhereInput = { ...(Obj.BoolActivo === undefined ? {} : { activo: Obj.BoolActivo }), ...(Obj.StrBusqueda ? { OR: [{ codigo: { contains: Obj.StrBusqueda } }, { nombre: { contains: Obj.StrBusqueda } }, { nombreComercial: { contains: Obj.StrBusqueda } }] } : {}) };
  const ObjPrisma = BaseDatos_obtenerCliente();
  const [datos, total] = await ObjPrisma.$transaction([ObjPrisma.proveedorRegistro.findMany({ where, select: ObjSeleccionProveedorResumen, orderBy: { proveedorId: "asc" }, skip: (Obj.IntPagina - 1) * Obj.IntLimite, take: Obj.IntLimite }), ObjPrisma.proveedorRegistro.count({ where })]);
  return { datos, total };
}
export async function Inventario_listarProveedoresProductos(Obj: { IntPagina: number; IntLimite: number; StrBusqueda?: string | undefined; BoolActivo?: boolean | undefined; IntProveedorId?: number | undefined; IntProductoId?: number | undefined }) {
  const where: Prisma.ProveedorProductoWhereInput = { ...(Obj.BoolActivo === undefined ? {} : { activo: Obj.BoolActivo }), ...(Obj.IntProveedorId === undefined ? {} : { proveedorId: Obj.IntProveedorId }), ...(Obj.IntProductoId === undefined ? {} : { productoId: Obj.IntProductoId }), ...(Obj.StrBusqueda ? { OR: [{ producto: { OR: [{ codigo: { contains: Obj.StrBusqueda } }, { nombre: { contains: Obj.StrBusqueda } }] } }, { proveedor: { OR: [{ codigo: { contains: Obj.StrBusqueda } }, { nombre: { contains: Obj.StrBusqueda } }, { nombreComercial: { contains: Obj.StrBusqueda } }] } }] } : {}) };
  const ObjPrisma = BaseDatos_obtenerCliente();
  const select = { proveedorProductoId: true, proveedorId: true, productoId: true, precioReferencia: true, activo: true, fechaRelacion: true, fechaActualizacion: true, proveedor: { select: ObjSeleccionProveedorResumen }, producto: { select: ObjSeleccionProductoResumen } } satisfies Prisma.ProveedorProductoSelect;
  const [datos, total] = await ObjPrisma.$transaction([ObjPrisma.proveedorProducto.findMany({ where, select, orderBy: { proveedorProductoId: "asc" }, skip: (Obj.IntPagina - 1) * Obj.IntLimite, take: Obj.IntLimite }), ObjPrisma.proveedorProducto.count({ where })]);
  return { datos, total };
}

async function Inventario_bitacora(ObjTx: Prisma.TransactionClient, IntUsuarioId: number, StrAccion: string, StrDescripcion: string, StrIp?: string | undefined) { await ObjTx.usuarioBitacora.create({ data: { usuarioId: IntUsuarioId, modulo: "INVENTARIO", accion: StrAccion, descripcion: StrDescripcion, resultado: "EXITO", direccionIp: StrIp ?? null } }); }

export function Inventario_crearCategoria(ObjDatos: { nombre: string; descripcion?: string | undefined | null; IntUsuarioId: number; StrIp?: string | undefined }) { return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => { const ObjRegistro = await ObjTx.inventarioCategoria.create({ data: { nombre: ObjDatos.nombre, descripcion: ObjDatos.descripcion ?? null } }); await Inventario_bitacora(ObjTx, ObjDatos.IntUsuarioId, "INVENTARIO_CATEGORIA_CREADA", `Categoria ${ObjRegistro.categoriaId}.`, ObjDatos.StrIp); return ObjRegistro; }); }
export function Inventario_editarCategoria(IntId: number, ObjDatos: Prisma.InventarioCategoriaUpdateInput, IntUsuarioId: number, StrIp?: string | undefined) { return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => { const ObjRegistro = await ObjTx.inventarioCategoria.update({ where: { categoriaId: IntId }, data: { ...ObjDatos, fechaActualizacion: Fecha_obtenerAhoraGuatemala() } }); await Inventario_bitacora(ObjTx, IntUsuarioId, "INVENTARIO_CATEGORIA_EDITADA", `Categoria ${IntId}.`, StrIp); return ObjRegistro; }); }
export function Inventario_crearAlmacen(ObjDatos: { codigo: string; nombre: string; descripcion?: string | undefined | null; ubicacion?: string | undefined | null; IntUsuarioId: number; StrIp?: string | undefined }) { return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => { const ObjRegistro = await ObjTx.inventarioAlmacen.create({ data: { codigo: ObjDatos.codigo, nombre: ObjDatos.nombre, descripcion: ObjDatos.descripcion ?? null, ubicacion: ObjDatos.ubicacion ?? null } }); await Inventario_bitacora(ObjTx, ObjDatos.IntUsuarioId, "INVENTARIO_ALMACEN_CREADO", `Almacen ${ObjRegistro.inventarioId}; codigo ${ObjRegistro.codigo}.`, ObjDatos.StrIp); return ObjRegistro; }); }
export function Inventario_editarAlmacen(IntId: number, ObjDatos: Prisma.InventarioAlmacenUpdateInput, IntUsuarioId: number, StrIp?: string | undefined) { return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => { const ObjRegistro = await ObjTx.inventarioAlmacen.update({ where: { inventarioId: IntId }, data: { ...ObjDatos, fechaActualizacion: Fecha_obtenerAhoraGuatemala() } }); await Inventario_bitacora(ObjTx, IntUsuarioId, "INVENTARIO_ALMACEN_EDITADO", `Almacen ${IntId}.`, StrIp); return ObjRegistro; }); }
export function Inventario_crearProducto(ObjDatos: { categoriaId: number; codigo: string; nombre: string; descripcion?: string | undefined | null; unidadMedida: string; manejaLotes: boolean; IntUsuarioId: number; StrIp?: string | undefined }) { return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => { const ObjRegistro = await ObjTx.inventarioProducto.create({ data: { categoriaId: ObjDatos.categoriaId, codigo: ObjDatos.codigo, nombre: ObjDatos.nombre, descripcion: ObjDatos.descripcion ?? null, unidadMedida: ObjDatos.unidadMedida, manejaLotes: ObjDatos.manejaLotes } }); await Inventario_bitacora(ObjTx, ObjDatos.IntUsuarioId, "INVENTARIO_PRODUCTO_CREADO", `Producto ${ObjRegistro.productoId}; codigo ${ObjRegistro.codigo}.`, ObjDatos.StrIp); return ObjRegistro; }); }
export function Inventario_editarProducto(IntId: number, ObjDatos: Prisma.InventarioProductoUpdateInput, IntUsuarioId: number, StrIp?: string | undefined) { return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => { const ObjRegistro = await ObjTx.inventarioProducto.update({ where: { productoId: IntId }, data: { ...ObjDatos, fechaActualizacion: Fecha_obtenerAhoraGuatemala() } }); await Inventario_bitacora(ObjTx, IntUsuarioId, "INVENTARIO_PRODUCTO_EDITADO", `Producto ${IntId}.`, StrIp); return ObjRegistro; }); }
export function Inventario_cambiarEstado(StrEntidad: "categoria" | "almacen" | "producto" | "lote", IntId: number, BoolActivo: boolean, IntUsuarioId: number, StrIp?: string | undefined) { return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => { const DtAhora = Fecha_obtenerAhoraGuatemala(); let ObjRegistro: unknown; if (StrEntidad === "categoria") ObjRegistro = await ObjTx.inventarioCategoria.update({ where: { categoriaId: IntId }, data: { activo: BoolActivo, fechaActualizacion: DtAhora } }); else if (StrEntidad === "almacen") ObjRegistro = await ObjTx.inventarioAlmacen.update({ where: { inventarioId: IntId }, data: { activo: BoolActivo, fechaActualizacion: DtAhora } }); else if (StrEntidad === "producto") ObjRegistro = await ObjTx.inventarioProducto.update({ where: { productoId: IntId }, data: { activo: BoolActivo, fechaActualizacion: DtAhora } }); else ObjRegistro = await ObjTx.inventarioLote.update({ where: { loteInventarioId: IntId }, data: { activo: BoolActivo, fechaActualizacion: DtAhora } }); await Inventario_bitacora(ObjTx, IntUsuarioId, `INVENTARIO_${StrEntidad.toUpperCase()}_ESTADO_CAMBIADO`, `${StrEntidad} ${IntId}; activo ${BoolActivo}.`, StrIp); return ObjRegistro; }); }

export function Inventario_gestionarProveedorProducto(ObjDatos: { proveedorId: number; productoId: number; precioReferencia?: string | undefined | null; activo?: boolean | undefined; IntUsuarioId: number; StrIp?: string | undefined }) { return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => { const ObjRegistro = await ObjTx.proveedorProducto.upsert({ where: { proveedorId_productoId: { proveedorId: ObjDatos.proveedorId, productoId: ObjDatos.productoId } }, create: { proveedorId: ObjDatos.proveedorId, productoId: ObjDatos.productoId, precioReferencia: ObjDatos.precioReferencia ?? null, activo: ObjDatos.activo ?? true }, update: { ...(ObjDatos.precioReferencia === undefined ? {} : { precioReferencia: ObjDatos.precioReferencia }), ...(ObjDatos.activo === undefined ? {} : { activo: ObjDatos.activo }), fechaActualizacion: Fecha_obtenerAhoraGuatemala() } }); await Inventario_bitacora(ObjTx, ObjDatos.IntUsuarioId, "INVENTARIO_PROVEEDOR_PRODUCTO_GESTIONADO", `Relacion ${ObjRegistro.proveedorProductoId}; producto ${ObjRegistro.productoId}; proveedor ${ObjRegistro.proveedorId}.`, ObjDatos.StrIp); return ObjRegistro; }); }
export function Inventario_editarMinimo(IntExistenciaId: number, StrMinimo: string, IntUsuarioId: number, StrIp?: string | undefined) { return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => { const ObjRegistro = await ObjTx.inventarioExistencia.update({ where: { inventarioProductoId: IntExistenciaId }, data: { existenciaMinima: new Prisma.Decimal(StrMinimo), fechaActualizacion: Fecha_obtenerAhoraGuatemala() } }); await Inventario_bitacora(ObjTx, IntUsuarioId, "INVENTARIO_EXISTENCIA_MINIMA_EDITADA", `Existencia ${IntExistenciaId}.`, StrIp); return ObjRegistro; }); }
export function Inventario_editarLote(IntLoteId: number, ObjDatos: Prisma.InventarioLoteUpdateInput, IntUsuarioId: number, StrIp?: string | undefined) { return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => { const ObjRegistro = await ObjTx.inventarioLote.update({ where: { loteInventarioId: IntLoteId }, data: { ...ObjDatos, fechaActualizacion: Fecha_obtenerAhoraGuatemala() } }); await Inventario_bitacora(ObjTx, IntUsuarioId, "INVENTARIO_LOTE_EDITADO", `Lote ${IntLoteId}.`, StrIp); return ObjRegistro; }); }

export async function Inventario_listarExistencias(Obj: { IntPagina: number; IntLimite: number; IntProductoId?: number | undefined; IntInventarioId?: number | undefined; BoolBajoMinimo?: boolean | undefined }) {
  const ObjPrisma = BaseDatos_obtenerCliente();
  const ArrCondiciones: Prisma.Sql[] = [];
  if (Obj.IntProductoId !== undefined) ArrCondiciones.push(Prisma.sql`e.producto_id = ${Obj.IntProductoId}`);
  if (Obj.IntInventarioId !== undefined) ArrCondiciones.push(Prisma.sql`e.inventario_id = ${Obj.IntInventarioId}`);
  if (Obj.BoolBajoMinimo === true) ArrCondiciones.push(Prisma.sql`e.existencia_actual < e.existencia_minima`);
  if (Obj.BoolBajoMinimo === false) ArrCondiciones.push(Prisma.sql`e.existencia_actual >= e.existencia_minima`);
  const ObjWhere = ArrCondiciones.length === 0 ? Prisma.empty : Prisma.sql`WHERE ${Prisma.join(ArrCondiciones, " AND ")}`;
  const IntInicio = (Obj.IntPagina - 1) * Obj.IntLimite;
  const [ArrIds, ArrTotal] = await ObjPrisma.$transaction([
    ObjPrisma.$queryRaw<Array<{ inventarioProductoId: number }>>(Prisma.sql`SELECT e.inventario_producto_id AS inventarioProductoId FROM dbo.inventario_existencias e ${ObjWhere} ORDER BY e.inventario_producto_id OFFSET ${IntInicio} ROWS FETCH NEXT ${Obj.IntLimite} ROWS ONLY`),
    ObjPrisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT_BIG(*) AS total FROM dbo.inventario_existencias e ${ObjWhere}`),
  ]);
  const ArrOrden = ArrIds.map((ObjId) => ObjId.inventarioProductoId);
  const ArrDatos = ArrOrden.length === 0 ? [] : await ObjPrisma.inventarioExistencia.findMany({ where: { inventarioProductoId: { in: ArrOrden } }, select: { inventarioProductoId: true, inventarioId: true, productoId: true, existenciaActual: true, existenciaMinima: true, activo: true, fechaCreacion: true, fechaActualizacion: true, producto: { select: ObjSeleccionProductoResumen }, almacen: { select: ObjSeleccionAlmacenResumen }, lotes: { select: { existenciaLoteId: true, loteInventarioId: true, existenciaActual: true, lote: { select: ObjSeleccionLoteResumen } } } } });
  const ObjPorId = new Map(ArrDatos.map((ObjDato) => [ObjDato.inventarioProductoId, ObjDato]));
  return { datos: ArrOrden.flatMap((IntId) => { const ObjDato = ObjPorId.get(IntId); return ObjDato ? [ObjDato] : []; }), total: Number(ArrTotal[0]?.total ?? 0n) };
}
export async function Inventario_listarLotes(Obj: { IntPagina: number; IntLimite: number; StrBusqueda?: string | undefined; BoolActivo?: boolean | undefined; IntProductoId?: number | undefined; IntInventarioId?: number | undefined }) { const where: Prisma.InventarioLoteWhereInput = { ...(Obj.BoolActivo === undefined ? {} : { activo: Obj.BoolActivo }), ...(Obj.IntProductoId === undefined ? {} : { productoId: Obj.IntProductoId }), ...(Obj.IntInventarioId === undefined ? {} : { existencias: { some: { existencia: { inventarioId: Obj.IntInventarioId } } } }), ...(Obj.StrBusqueda ? { codigoLote: { contains: Obj.StrBusqueda } } : {}) }; const P = BaseDatos_obtenerCliente(); const [datos, total] = await P.$transaction([P.inventarioLote.findMany({ where, include: { producto: true, proveedor: true, existencias: { include: { existencia: { include: { almacen: true } } } } }, orderBy: { loteInventarioId: "asc" }, skip: (Obj.IntPagina - 1) * Obj.IntLimite, take: Obj.IntLimite }), P.inventarioLote.count({ where })]); return { datos, total }; }
export async function Inventario_listarMovimientos(Obj: { IntPagina: number; IntLimite: number; IntProductoId?: number | undefined; IntInventarioId?: number | undefined; StrTipo?: string | undefined; StrSubtipo?: string | undefined }) {
  const where: Prisma.InventarioTransaccionWhereInput = { ...(Obj.IntProductoId === undefined ? {} : { existencia: { productoId: Obj.IntProductoId } }), ...(Obj.IntInventarioId === undefined ? {} : { existencia: { inventarioId: Obj.IntInventarioId } }), ...(Obj.StrTipo === undefined ? {} : { tipoTransaccion: Obj.StrTipo }), ...(Obj.StrSubtipo === undefined ? {} : { subtipoTransaccion: Obj.StrSubtipo }) };
  const ObjPrisma = BaseDatos_obtenerCliente();
  const [ArrDatos, total] = await ObjPrisma.$transaction([ObjPrisma.inventarioTransaccion.findMany({ where, select: ObjSeleccionMovimientoEnriquecido, orderBy: { transaccionInventarioId: "asc" }, skip: (Obj.IntPagina - 1) * Obj.IntLimite, take: Obj.IntLimite }), ObjPrisma.inventarioTransaccion.count({ where })]);
  return { datos: ArrDatos.map(Inventario_proyectarMovimiento), total };
}

export async function Inventario_listarTransferencias(Obj: { IntPagina: number; IntLimite: number; IntProductoId?: number | undefined; IntInventarioOrigenId?: number | undefined; IntInventarioDestinoId?: number | undefined; BoolRevertida?: boolean | undefined }) {
  const ObjFiltroReversion: Prisma.InventarioTransaccionListRelationFilter | undefined = Obj.BoolRevertida === undefined ? undefined : Obj.BoolRevertida ? { some: { reversion: { isNot: null } } } : { none: { reversion: { isNot: null } } };
  const where: Prisma.InventarioTransferenciaWhereInput = {
    ...(Obj.IntProductoId === undefined ? {} : { productoId: Obj.IntProductoId }),
    ...(Obj.IntInventarioOrigenId === undefined ? {} : { origen: { inventarioId: Obj.IntInventarioOrigenId } }),
    ...(Obj.IntInventarioDestinoId === undefined ? {} : { destino: { inventarioId: Obj.IntInventarioDestinoId } }),
    ...(ObjFiltroReversion === undefined ? {} : { transacciones: ObjFiltroReversion }),
  };
  const ObjPrisma = BaseDatos_obtenerCliente();
  const select = {
    transferenciaId: true, cantidad: true, documentoReferencia: true, motivo: true, observaciones: true, fechaTransferencia: true,
    producto: { select: ObjSeleccionProductoResumen }, origen: { select: { almacen: { select: ObjSeleccionAlmacenResumen } } }, destino: { select: { almacen: { select: ObjSeleccionAlmacenResumen } } },
    lote: { select: ObjSeleccionLoteResumen }, usuario: { select: ObjSeleccionUsuarioResumen },
    transacciones: { where: { subtipoTransaccion: { in: ["TRANSFERENCIA_SALIDA", "TRANSFERENCIA_ENTRADA"] } }, select: { transaccionInventarioId: true, subtipoTransaccion: true, reversion: { select: { transaccionInventarioId: true, fechaTransaccion: true } } } },
  } satisfies Prisma.InventarioTransferenciaSelect;
  const [ArrDatos, total] = await ObjPrisma.$transaction([ObjPrisma.inventarioTransferencia.findMany({ where, select, orderBy: { transferenciaId: "asc" }, skip: (Obj.IntPagina - 1) * Obj.IntLimite, take: Obj.IntLimite }), ObjPrisma.inventarioTransferencia.count({ where })]);
  return { datos: ArrDatos.map((ObjTransferencia) => {
    const ObjSalida = ObjTransferencia.transacciones.find((ObjMovimiento) => ObjMovimiento.subtipoTransaccion === "TRANSFERENCIA_SALIDA");
    const ObjEntrada = ObjTransferencia.transacciones.find((ObjMovimiento) => ObjMovimiento.subtipoTransaccion === "TRANSFERENCIA_ENTRADA");
    const BoolRevertida = ObjSalida?.reversion !== null && ObjSalida?.reversion !== undefined && ObjEntrada?.reversion !== null && ObjEntrada?.reversion !== undefined;
    const ArrFechas = [ObjSalida?.reversion?.fechaTransaccion, ObjEntrada?.reversion?.fechaTransaccion].filter((DtFecha): DtFecha is Date => DtFecha !== undefined);
    return { transferenciaId: ObjTransferencia.transferenciaId, cantidad: ObjTransferencia.cantidad, documentoReferencia: ObjTransferencia.documentoReferencia, motivo: ObjTransferencia.motivo, observaciones: ObjTransferencia.observaciones, fechaTransferencia: ObjTransferencia.fechaTransferencia, producto: ObjTransferencia.producto, origen: ObjTransferencia.origen.almacen, destino: ObjTransferencia.destino.almacen, lote: ObjTransferencia.lote, usuario: ObjTransferencia.usuario, movimientosOriginales: { salidaId: ObjSalida?.transaccionInventarioId ?? 0, entradaId: ObjEntrada?.transaccionInventarioId ?? 0 }, revertida: BoolRevertida, reversion: BoolRevertida ? { salidaReversionId: ObjSalida!.reversion!.transaccionInventarioId, entradaReversionId: ObjEntrada!.reversion!.transaccionInventarioId, fechaReversion: ArrFechas.sort((DtA, DtB) => DtB.getTime() - DtA.getTime())[0]! } : null };
  }), total };
}

export async function Inventario_obtenerResumen(DtHoy: Date, DtLimite: Date) {
  const ObjPrisma = BaseDatos_obtenerCliente();
  const [productosActivos, existenciasOperativas, ArrBajoMinimo, lotesActivos, lotesProximosVencer, lotesVencidos, ArrMovimientos] = await ObjPrisma.$transaction([
    ObjPrisma.inventarioProducto.count({ where: { activo: true } }),
    ObjPrisma.inventarioExistencia.count({ where: { activo: true, producto: { activo: true }, almacen: { activo: true } } }),
    ObjPrisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT_BIG(*) AS total FROM dbo.inventario_existencias e INNER JOIN dbo.inventario_productos p ON p.producto_id=e.producto_id AND p.activo=1 INNER JOIN dbo.inventario_almacenes a ON a.inventario_id=e.inventario_id AND a.activo=1 WHERE e.activo=1 AND e.existencia_actual < e.existencia_minima`,
    ObjPrisma.inventarioLote.count({ where: { activo: true } }),
    ObjPrisma.inventarioLote.count({ where: { activo: true, fechaVencimiento: { gte: DtHoy, lte: DtLimite } } }),
    ObjPrisma.inventarioLote.count({ where: { activo: true, fechaVencimiento: { lt: DtHoy } } }),
    ObjPrisma.inventarioTransaccion.findMany({ select: ObjSeleccionMovimientoEnriquecido, orderBy: { transaccionInventarioId: "desc" }, take: 5 }),
  ]);
  return { productosActivos, existenciasOperativas, existenciasBajoMinimo: Number(ArrBajoMinimo[0]?.total ?? 0n), lotesActivos, lotesProximosVencer, lotesVencidos, movimientosRecientes: ArrMovimientos.map(Inventario_proyectarMovimiento) };
}

export type InventarioDatosMovimiento = { tipo: "SALIDA" | "AJUSTE"; subtipo: string; productoId: number; inventarioId: number; loteInventarioId: number; proveedorId?: number | undefined; cantidad: Prisma.Decimal; documentoReferencia?: string | undefined | null; motivo?: string | undefined | null; observaciones?: string | undefined | null; IntUsuarioId: number; StrIp?: string | undefined; animalId?: number | undefined | null; loteProduccionId?: number | undefined | null; alimentacionDetalleId?: number | undefined | null; sanidadFuenteId?: number | undefined | null };

export function Inventario_registrarEntradaConLote(ObjDatos: { subtipo: "COMPRA" | "INVENTARIO_INICIAL"; productoId: number; inventarioId: number; proveedorId?: number | undefined; cantidadComercial: Prisma.Decimal; unidadComercial: string; factorConversion: Prisma.Decimal; cantidadBase: Prisma.Decimal; unidadBase: string; precioTotalIngreso: Prisma.Decimal; costoUnitario: Prisma.Decimal; fechaFabricacion?: Date | null | undefined; fechaVencimiento?: Date | null | undefined; documentoReferencia?: string | null | undefined; motivo?: string | null | undefined; observaciones?: string | null | undefined; IntUsuarioId: number; StrIp?: string | undefined }) {
  return Inventario_ejecutarSerializable(async (ObjTx) => {
    const DtAhora = Fecha_obtenerAhoraGuatemala();
    const ObjExistencia = await ObjTx.inventarioExistencia.upsert({ where: { inventarioId_productoId: { inventarioId: ObjDatos.inventarioId, productoId: ObjDatos.productoId } }, create: { inventarioId: ObjDatos.inventarioId, productoId: ObjDatos.productoId }, update: {} });
    const ObjLote = await ObjTx.inventarioLote.create({ data: { productoId: ObjDatos.productoId, proveedorId: ObjDatos.proveedorId ?? null, unidadBaseSnapshot: ObjDatos.unidadBase, costoUnitario: ObjDatos.costoUnitario, fechaFabricacion: ObjDatos.fechaFabricacion ?? null, fechaVencimiento: ObjDatos.fechaVencimiento ?? null, observaciones: ObjDatos.observaciones ?? null } });
    await ObjTx.$executeRawUnsafe(`UPDATE dbo.inventario_lotes SET costo_unitario=CAST('${ObjDatos.costoUnitario.toFixed(18)}' AS DECIMAL(38,18)) WHERE lote_inventario_id=${ObjLote.loteInventarioId}`);
    const ObjExistenciaLote = await ObjTx.inventarioExistenciaLote.create({ data: { inventarioProductoId: ObjExistencia.inventarioProductoId, loteInventarioId: ObjLote.loteInventarioId, productoId: ObjDatos.productoId, existenciaActual: ObjDatos.cantidadBase } });
    await ObjTx.inventarioExistencia.update({ where: { inventarioProductoId: ObjExistencia.inventarioProductoId }, data: { existenciaActual: { increment: ObjDatos.cantidadBase }, fechaActualizacion: DtAhora } });
    const ObjMovimiento = await ObjTx.inventarioTransaccion.create({ data: { inventarioProductoId: ObjExistencia.inventarioProductoId, existenciaLoteId: ObjExistenciaLote.existenciaLoteId, usuarioId: ObjDatos.IntUsuarioId, proveedorId: ObjDatos.proveedorId ?? null, tipoTransaccion: "INGRESO", subtipoTransaccion: ObjDatos.subtipo, cantidadComercial: ObjDatos.cantidadComercial, unidadComercial: ObjDatos.unidadComercial, factorConversion: ObjDatos.factorConversion, cantidad: ObjDatos.cantidadBase, unidadBaseSnapshot: ObjDatos.unidadBase, precioTotalIngreso: ObjDatos.precioTotalIngreso, costoUnitario: ObjDatos.costoUnitario, documentoReferencia: ObjDatos.documentoReferencia ?? null, motivo: ObjDatos.motivo ?? null, observaciones: ObjDatos.observaciones ?? null } });
    await ObjTx.$executeRawUnsafe(`UPDATE dbo.inventario_transacciones SET factor_conversion=CAST('${ObjDatos.factorConversion.toFixed(15)}' AS DECIMAL(30,15)),costo_unitario=CAST('${ObjDatos.costoUnitario.toFixed(18)}' AS DECIMAL(38,18)) WHERE transaccion_inventario_id=${ObjMovimiento.transaccionInventarioId}`);
    await ObjTx.inventarioLote.update({ where: { loteInventarioId: ObjLote.loteInventarioId }, data: { transaccionOrigenId: ObjMovimiento.transaccionInventarioId } });
    await Inventario_bitacora(ObjTx, ObjDatos.IntUsuarioId, "INVENTARIO_INGRESO_REGISTRADO", `Movimiento ${ObjMovimiento.transaccionInventarioId}; lote ${ObjLote.codigoLote}.`, ObjDatos.StrIp);
    const [ObjMovimientoExacto,ObjLoteExacto]=await Promise.all([ObjTx.inventarioTransaccion.findUniqueOrThrow({where:{transaccionInventarioId:ObjMovimiento.transaccionInventarioId}}),ObjTx.inventarioLote.findUniqueOrThrow({where:{loteInventarioId:ObjLote.loteInventarioId}})]);return { ...ObjMovimientoExacto, lote: ObjLoteExacto };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function Inventario_aplicarMovimientoConTx(ObjTx: Prisma.TransactionClient, ObjDatos: InventarioDatosMovimiento) {
    const DtAhora = Fecha_obtenerAhoraGuatemala();
    const ObjExistencia = await ObjTx.inventarioExistencia.findUnique({ where: { inventarioId_productoId: { inventarioId: ObjDatos.inventarioId, productoId: ObjDatos.productoId } } });
    if (!ObjExistencia) throw new Error("STOCK_INSUFICIENTE");
    const ObjSaldoLote = await ObjTx.inventarioExistenciaLote.findUnique({ where: { inventarioProductoId_loteInventarioId: { inventarioProductoId: ObjExistencia.inventarioProductoId, loteInventarioId: ObjDatos.loteInventarioId } }, include: { lote: true } });
    if (!ObjSaldoLote || ObjSaldoLote.productoId !== ObjDatos.productoId) throw new Error("FUENTE_INVENTARIO_INCONSISTENTE");
    const ObjActualizacionLote = await ObjTx.inventarioExistenciaLote.updateMany({ where: { existenciaLoteId: ObjSaldoLote.existenciaLoteId, existenciaActual: { gte: ObjDatos.cantidad.negated() } }, data: { existenciaActual: { increment: ObjDatos.cantidad }, fechaActualizacion: DtAhora } });
    if (ObjActualizacionLote.count !== 1) throw new Error("STOCK_INSUFICIENTE");
    const ObjActualizacion = await ObjTx.inventarioExistencia.updateMany({ where: { inventarioProductoId: ObjExistencia.inventarioProductoId, existenciaActual: { gte: ObjDatos.cantidad.negated() } }, data: { existenciaActual: { increment: ObjDatos.cantidad }, fechaActualizacion: DtAhora } });
    if (ObjActualizacion.count !== 1) throw new Error("STOCK_INSUFICIENTE");
    const ObjMovimiento = await ObjTx.inventarioTransaccion.create({ data: { inventarioProductoId: ObjExistencia.inventarioProductoId, existenciaLoteId: ObjSaldoLote.existenciaLoteId, usuarioId: ObjDatos.IntUsuarioId, proveedorId: ObjDatos.proveedorId ?? null, animalId: ObjDatos.animalId ?? null, loteProduccionId: ObjDatos.loteProduccionId ?? null, alimentacionDetalleId: ObjDatos.alimentacionDetalleId ?? null, sanidadFuenteId: ObjDatos.sanidadFuenteId ?? null, tipoTransaccion: ObjDatos.tipo, subtipoTransaccion: ObjDatos.subtipo, cantidad: ObjDatos.cantidad, unidadBaseSnapshot: ObjSaldoLote.lote.unidadBaseSnapshot, costoUnitario: ObjSaldoLote.lote.costoUnitario, documentoReferencia: ObjDatos.documentoReferencia ?? null, motivo: ObjDatos.motivo ?? null, observaciones: ObjDatos.observaciones ?? null } });
    await ObjTx.$executeRaw`UPDATE dbo.inventario_transacciones SET costo_unitario=(SELECT costo_unitario FROM dbo.inventario_lotes WHERE lote_inventario_id=${ObjDatos.loteInventarioId}) WHERE transaccion_inventario_id=${ObjMovimiento.transaccionInventarioId}`;
    await Inventario_bitacora(ObjTx, ObjDatos.IntUsuarioId, `INVENTARIO_${ObjDatos.tipo}_REGISTRADO`, `Movimiento ${ObjMovimiento.transaccionInventarioId}; producto ${ObjDatos.productoId}; subtipo ${ObjDatos.subtipo}.`, ObjDatos.StrIp);
    return ObjMovimiento;
}

export function Inventario_registrarMovimiento(ObjDatos: InventarioDatosMovimiento) {
  return Inventario_ejecutarSerializable(async (ObjTx) => {
    return Inventario_aplicarMovimientoConTx(ObjTx, ObjDatos);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function Inventario_registrarTransferencia(ObjDatos: { productoId: number; inventarioOrigenId: number; inventarioDestinoId: number; loteInventarioId: number; cantidad: Prisma.Decimal; documentoReferencia?: string | undefined | null; motivo?: string | undefined | null; observaciones?: string | undefined | null; IntUsuarioId: number; StrIp?: string | undefined }) {
  return Inventario_ejecutarSerializable(async (ObjTx) => {
    const DtAhora = Fecha_obtenerAhoraGuatemala();
    const ObjOrigen = await ObjTx.inventarioExistencia.findUnique({ where: { inventarioId_productoId: { inventarioId: ObjDatos.inventarioOrigenId, productoId: ObjDatos.productoId } } });
    if (!ObjOrigen) throw new Error("STOCK_INSUFICIENTE");
    const ObjDestino = await ObjTx.inventarioExistencia.upsert({ where: { inventarioId_productoId: { inventarioId: ObjDatos.inventarioDestinoId, productoId: ObjDatos.productoId } }, create: { inventarioId: ObjDatos.inventarioDestinoId, productoId: ObjDatos.productoId }, update: {} });
    const ObjLoteOrigen = await ObjTx.inventarioExistenciaLote.findUnique({ where: { inventarioProductoId_loteInventarioId: { inventarioProductoId: ObjOrigen.inventarioProductoId, loteInventarioId: ObjDatos.loteInventarioId } } });
    if (!ObjLoteOrigen) throw new Error("STOCK_INSUFICIENTE");
    const ObjLote = await ObjTx.inventarioLote.findUniqueOrThrow({ where: { loteInventarioId: ObjDatos.loteInventarioId } });
    if (ObjLote.productoId !== ObjDatos.productoId) throw new Error("FUENTE_INVENTARIO_INCONSISTENTE");
    const DecCostoTransferencia = ObjLote.costoUnitario;
    const ObjLoteDestino = await ObjTx.inventarioExistenciaLote.upsert({ where: { inventarioProductoId_loteInventarioId: { inventarioProductoId: ObjDestino.inventarioProductoId, loteInventarioId: ObjDatos.loteInventarioId } }, create: { inventarioProductoId: ObjDestino.inventarioProductoId, loteInventarioId: ObjDatos.loteInventarioId, productoId: ObjDatos.productoId }, update: {} });
    const ObjCambioLote = await ObjTx.inventarioExistenciaLote.updateMany({ where: { existenciaLoteId: ObjLoteOrigen.existenciaLoteId, existenciaActual: { gte: ObjDatos.cantidad } }, data: { existenciaActual: { decrement: ObjDatos.cantidad }, fechaActualizacion: DtAhora } });
    if (ObjCambioLote.count !== 1) throw new Error("STOCK_INSUFICIENTE");
    await ObjTx.inventarioExistenciaLote.update({ where: { existenciaLoteId: ObjLoteDestino.existenciaLoteId }, data: { existenciaActual: { increment: ObjDatos.cantidad }, fechaActualizacion: DtAhora } });
    const ObjCambio = await ObjTx.inventarioExistencia.updateMany({ where: { inventarioProductoId: ObjOrigen.inventarioProductoId, existenciaActual: { gte: ObjDatos.cantidad } }, data: { existenciaActual: { decrement: ObjDatos.cantidad }, fechaActualizacion: DtAhora } });
    if (ObjCambio.count !== 1) throw new Error("STOCK_INSUFICIENTE");
    await ObjTx.inventarioExistencia.update({ where: { inventarioProductoId: ObjDestino.inventarioProductoId }, data: { existenciaActual: { increment: ObjDatos.cantidad }, fechaActualizacion: DtAhora } });
    const ObjTransferencia = await ObjTx.inventarioTransferencia.create({ data: { productoId: ObjDatos.productoId, inventarioProductoOrigenId: ObjOrigen.inventarioProductoId, inventarioProductoDestinoId: ObjDestino.inventarioProductoId, existenciaLoteOrigenId: ObjLoteOrigen.existenciaLoteId, existenciaLoteDestinoId: ObjLoteDestino.existenciaLoteId, loteInventarioId: ObjDatos.loteInventarioId, usuarioId: ObjDatos.IntUsuarioId, cantidad: ObjDatos.cantidad, documentoReferencia: ObjDatos.documentoReferencia ?? null, motivo: ObjDatos.motivo ?? null, observaciones: ObjDatos.observaciones ?? null } });
    await ObjTx.inventarioTransaccion.createMany({ data: [
      { inventarioProductoId: ObjOrigen.inventarioProductoId, existenciaLoteId: ObjLoteOrigen.existenciaLoteId, transferenciaId: ObjTransferencia.transferenciaId, usuarioId: ObjDatos.IntUsuarioId, tipoTransaccion: "SALIDA", subtipoTransaccion: "TRANSFERENCIA_SALIDA", cantidad: ObjDatos.cantidad.negated(), unidadBaseSnapshot: ObjLote.unidadBaseSnapshot, costoUnitario: DecCostoTransferencia, documentoReferencia: ObjDatos.documentoReferencia ?? null, motivo: ObjDatos.motivo ?? null, observaciones: ObjDatos.observaciones ?? null },
      { inventarioProductoId: ObjDestino.inventarioProductoId, existenciaLoteId: ObjLoteDestino.existenciaLoteId, transferenciaId: ObjTransferencia.transferenciaId, usuarioId: ObjDatos.IntUsuarioId, tipoTransaccion: "INGRESO", subtipoTransaccion: "TRANSFERENCIA_ENTRADA", cantidad: ObjDatos.cantidad, unidadBaseSnapshot: ObjLote.unidadBaseSnapshot, costoUnitario: DecCostoTransferencia, documentoReferencia: ObjDatos.documentoReferencia ?? null, motivo: ObjDatos.motivo ?? null, observaciones: ObjDatos.observaciones ?? null },
    ] });
    await ObjTx.$executeRaw`UPDATE dbo.inventario_transacciones SET costo_unitario=(SELECT costo_unitario FROM dbo.inventario_lotes WHERE lote_inventario_id=${ObjDatos.loteInventarioId}) WHERE transferencia_id=${ObjTransferencia.transferenciaId}`;
    await Inventario_bitacora(ObjTx, ObjDatos.IntUsuarioId, "INVENTARIO_TRANSFERENCIA_REGISTRADA", `Transferencia ${ObjTransferencia.transferenciaId}; producto ${ObjDatos.productoId}.`, ObjDatos.StrIp);
    return ObjTransferencia;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function Inventario_revertirMovimientoConTx(ObjTx: Prisma.TransactionClient, ObjMovimiento: Prisma.InventarioTransaccionGetPayload<object>, IntUsuarioId: number, DtAhora: Date) {
  const DecReversion = ObjMovimiento.cantidad.negated();
  if (ObjMovimiento.existenciaLoteId === null) throw new Error("MOVIMIENTO_LEGADO_SIN_LOTE");
  const ObjExistencia = await ObjTx.inventarioExistencia.findUnique({ where: { inventarioProductoId: ObjMovimiento.inventarioProductoId } });
  if (ObjExistencia === null) throw new Error("EXISTENCIA_NO_ENCONTRADA");
  const ObjSaldo = await ObjTx.inventarioExistencia.updateMany({ where: { inventarioProductoId: ObjMovimiento.inventarioProductoId, existenciaActual: { gte: DecReversion.negated() } }, data: { existenciaActual: { increment: DecReversion }, fechaActualizacion: DtAhora } });
  if (ObjSaldo.count !== 1) throw new Error("STOCK_INSUFICIENTE");
  const ObjSaldoLote = await ObjTx.inventarioExistenciaLote.updateMany({ where: { existenciaLoteId: ObjMovimiento.existenciaLoteId, existenciaActual: { gte: DecReversion.negated() } }, data: { existenciaActual: { increment: DecReversion }, fechaActualizacion: DtAhora } });
  if (ObjSaldoLote.count !== 1) throw new Error("STOCK_INSUFICIENTE");
  const ObjReversion=await ObjTx.inventarioTransaccion.create({ data: { inventarioProductoId: ObjMovimiento.inventarioProductoId, existenciaLoteId: ObjMovimiento.existenciaLoteId, usuarioId: IntUsuarioId, tipoTransaccion: "AJUSTE", subtipoTransaccion: "REVERSION", cantidad: DecReversion, unidadBaseSnapshot: ObjMovimiento.unidadBaseSnapshot, costoUnitario: ObjMovimiento.costoUnitario, transaccionRevertidaId: ObjMovimiento.transaccionInventarioId, motivo: `Reversion del movimiento ${ObjMovimiento.transaccionInventarioId}.` } });
  await ObjTx.$executeRaw`UPDATE dbo.inventario_transacciones SET costo_unitario=(SELECT costo_unitario FROM dbo.inventario_transacciones WHERE transaccion_inventario_id=${ObjMovimiento.transaccionInventarioId}) WHERE transaccion_inventario_id=${ObjReversion.transaccionInventarioId}`;
  return ObjTx.inventarioTransaccion.findUniqueOrThrow({where:{transaccionInventarioId:ObjReversion.transaccionInventarioId}});
}

export function Inventario_revertirMovimiento(IntTransaccionId: number, IntUsuarioId: number, StrIp?: string | undefined) {
  return Inventario_ejecutarSerializable(async (ObjTx) => {
    const ObjOriginal = await ObjTx.inventarioTransaccion.findUnique({ where: { transaccionInventarioId: IntTransaccionId }, include: { reversion: true } });
    if (!ObjOriginal) throw new Error("MOVIMIENTO_NO_ENCONTRADO");
    if (ObjOriginal.transferenciaId !== null) throw new Error("REVERSION_TRANSFERENCIA_REQUIERE_ENDPOINT");
    if (ObjOriginal.subtipoTransaccion === "REVERSION") throw new Error("REVERSION_NO_PERMITIDA");
    if (ObjOriginal.reversion) throw new Error("MOVIMIENTO_YA_REVERTIDO");
    const ObjReversion = await Inventario_revertirMovimientoConTx(ObjTx, ObjOriginal, IntUsuarioId, Fecha_obtenerAhoraGuatemala());
    await Inventario_bitacora(ObjTx, IntUsuarioId, "INVENTARIO_MOVIMIENTO_REVERTIDO", `Movimiento ${IntTransaccionId}.`, StrIp);
    return { transaccionInventarioId: IntTransaccionId, movimientosRevertidos: 1, movimientosReversion: [ObjReversion.transaccionInventarioId] };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function Inventario_revertirTransferencia(IntTransferenciaId: number, IntUsuarioId: number, StrIp?: string | undefined) {
  return Inventario_ejecutarSerializable(async (ObjTx) => {
    const ObjTransferencia = await ObjTx.inventarioTransferencia.findUnique({ where: { transferenciaId: IntTransferenciaId }, include: { transacciones: { include: { reversion: true }, orderBy: { transaccionInventarioId: "asc" } } } });
    if (!ObjTransferencia) throw new Error("TRANSFERENCIA_NO_ENCONTRADA");
    const ArrOriginales = ObjTransferencia.transacciones.filter((ObjMovimiento) => ObjMovimiento.subtipoTransaccion === "TRANSFERENCIA_SALIDA" || ObjMovimiento.subtipoTransaccion === "TRANSFERENCIA_ENTRADA");
    const BoolEstructuraValida = ArrOriginales.length === 2 && ArrOriginales.filter((ObjMovimiento) => ObjMovimiento.subtipoTransaccion === "TRANSFERENCIA_SALIDA").length === 1 && ArrOriginales.filter((ObjMovimiento) => ObjMovimiento.subtipoTransaccion === "TRANSFERENCIA_ENTRADA").length === 1;
    if (!BoolEstructuraValida) throw new Error("TRANSFERENCIA_INCONSISTENTE");
    if (ArrOriginales.some((ObjMovimiento) => ObjMovimiento.reversion !== null)) throw new Error("TRANSFERENCIA_YA_REVERTIDA");
    const DtAhora = Fecha_obtenerAhoraGuatemala();
    const ArrReversiones = [];
    for (const ObjMovimiento of ArrOriginales) ArrReversiones.push(await Inventario_revertirMovimientoConTx(ObjTx, ObjMovimiento, IntUsuarioId, DtAhora));
    await Inventario_bitacora(ObjTx, IntUsuarioId, "INVENTARIO_TRANSFERENCIA_REVERTIDA", `Transferencia ${IntTransferenciaId}.`, StrIp);
    return { transferenciaId: IntTransferenciaId, movimientosOriginales: ArrOriginales.map((ObjMovimiento) => ObjMovimiento.transaccionInventarioId), movimientosReversion: ArrReversiones.map((ObjMovimiento) => ObjMovimiento.transaccionInventarioId), movimientosRevertidos: 2 as const, fechaReversion: DtAhora };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function Inventario_diagnosticarReconciliacion(IntUsuarioId: number, StrIp?: string | undefined) {
  return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    const DtAhora = Fecha_obtenerAhoraGuatemala();
    const [ArrSaldosBase, ArrLotesBase, ArrSaldosLoteBase, IntExistencias, IntExistenciasConLotes, IntSaldosLote] = await Promise.all([
      ObjTx.$queryRaw<Array<{ inventarioProductoId: number; saldoMaterializado: Prisma.Decimal; saldoHistorial: Prisma.Decimal }>>`
        SELECT e.inventario_producto_id AS inventarioProductoId, e.existencia_actual AS saldoMaterializado, COALESCE(SUM(t.cantidad), 0) AS saldoHistorial
        FROM dbo.inventario_existencias e LEFT JOIN dbo.inventario_transacciones t ON t.inventario_producto_id=e.inventario_producto_id
        GROUP BY e.inventario_producto_id,e.existencia_actual HAVING e.existencia_actual<>COALESCE(SUM(t.cantidad),0)`,
      ObjTx.$queryRaw<Array<{ inventarioProductoId: number; saldoProducto: Prisma.Decimal; saldoLotes: Prisma.Decimal }>>`
        SELECT e.inventario_producto_id AS inventarioProductoId,e.existencia_actual AS saldoProducto,COALESCE(SUM(l.existencia_actual),0) AS saldoLotes
        FROM dbo.inventario_existencias e JOIN dbo.inventario_productos p ON p.producto_id=e.producto_id AND p.maneja_lotes=1
        LEFT JOIN dbo.inventario_existencias_lotes l ON l.inventario_producto_id=e.inventario_producto_id
        GROUP BY e.inventario_producto_id,e.existencia_actual HAVING e.existencia_actual<>COALESCE(SUM(l.existencia_actual),0)`,
      ObjTx.$queryRaw<Array<{ existenciaLoteId: number; saldoMaterializado: Prisma.Decimal; saldoHistorial: Prisma.Decimal }>>`
        SELECT l.existencia_lote_id AS existenciaLoteId,l.existencia_actual AS saldoMaterializado,COALESCE(SUM(t.cantidad),0) AS saldoHistorial
        FROM dbo.inventario_existencias_lotes l LEFT JOIN dbo.inventario_transacciones t ON t.existencia_lote_id=l.existencia_lote_id
        GROUP BY l.existencia_lote_id,l.existencia_actual HAVING l.existencia_actual<>COALESCE(SUM(t.cantidad),0)`,
      ObjTx.inventarioExistencia.count(), ObjTx.inventarioExistencia.count({ where: { producto: { manejaLotes: true } } }), ObjTx.inventarioExistenciaLote.count(),
    ]);
    const ArrExistenciaIds = [...new Set([...ArrSaldosBase, ...ArrLotesBase].map((ObjDato) => ObjDato.inventarioProductoId))];
    const ArrExistencias = ArrExistenciaIds.length === 0 ? [] : await ObjTx.inventarioExistencia.findMany({ where: { inventarioProductoId: { in: ArrExistenciaIds } }, select: { inventarioProductoId: true, producto: { select: ObjSeleccionProductoResumen }, almacen: { select: ObjSeleccionAlmacenResumen } } });
    const ArrExistenciasLote = ArrSaldosLoteBase.length === 0 ? [] : await ObjTx.inventarioExistenciaLote.findMany({ where: { existenciaLoteId: { in: ArrSaldosLoteBase.map((ObjDato) => ObjDato.existenciaLoteId) } }, select: { existenciaLoteId: true, existencia: { select: { producto: { select: ObjSeleccionProductoResumen }, almacen: { select: ObjSeleccionAlmacenResumen } } }, lote: { select: ObjSeleccionLoteResumen } } });
    const ObjExistencias = new Map(ArrExistencias.map((ObjDato) => [ObjDato.inventarioProductoId, ObjDato]));
    const ObjLotes = new Map(ArrExistenciasLote.map((ObjDato) => [ObjDato.existenciaLoteId, ObjDato]));
    const saldos = ArrSaldosBase.flatMap((ObjDato) => { const ObjExistencia = ObjExistencias.get(ObjDato.inventarioProductoId); return ObjExistencia ? [{ ...ObjDato, producto: ObjExistencia.producto, almacen: ObjExistencia.almacen, diferencia: ObjDato.saldoMaterializado.minus(ObjDato.saldoHistorial) }] : []; });
    const lotes = ArrLotesBase.flatMap((ObjDato) => { const ObjExistencia = ObjExistencias.get(ObjDato.inventarioProductoId); return ObjExistencia ? [{ ...ObjDato, producto: ObjExistencia.producto, almacen: ObjExistencia.almacen, diferencia: ObjDato.saldoProducto.minus(ObjDato.saldoLotes) }] : []; });
    const saldosLote = ArrSaldosLoteBase.flatMap((ObjDato) => { const ObjLote = ObjLotes.get(ObjDato.existenciaLoteId); return ObjLote ? [{ ...ObjDato, producto: ObjLote.existencia.producto, almacen: ObjLote.existencia.almacen, lote: ObjLote.lote, diferencia: ObjDato.saldoMaterializado.minus(ObjDato.saldoHistorial) }] : []; });
    const IntTotalDiferencias = saldos.length + lotes.length + saldosLote.length;
    await Inventario_bitacora(ObjTx, IntUsuarioId, "INVENTARIO_RECONCILIACION_EJECUTADA", `Diagnostico ejecutado; diferencias ${IntTotalDiferencias}.`, StrIp);
    return { fechaDiagnostico: DtAhora, consistente: IntTotalDiferencias === 0, totalDiferencias: IntTotalDiferencias, revisados: { existencias: IntExistencias, existenciasConLotes: IntExistenciasConLotes, saldosLote: IntSaldosLote }, saldos, lotes, saldosLote };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
