import { z } from "zod";

const ObjId = z.coerce.number().int().positive();
const ObjDecimalPositivo = z.union([z.string(), z.number()]).transform(String).refine((StrValor) => /^\d+(\.\d{1,4})?$/.test(StrValor) && Number(StrValor) > 0);
const ObjDecimalNoNegativo = z.union([z.string(), z.number()]).transform(String).refine((StrValor) => /^\d+(\.\d{1,4})?$/.test(StrValor) && Number(StrValor) >= 0);
const ObjTextoOpcional = (IntMaximo: number) => z.union([z.string().trim().max(IntMaximo), z.null()]).optional();
const ObjEstado = z.object({ activo: z.boolean() }).strict();
const ObjBooleanoConsulta = z.preprocess((ObjValor) => {
  if (ObjValor === true || ObjValor === "true") return true;
  if (ObjValor === false || ObjValor === "false") return false;
  return ObjValor;
}, z.boolean());

export const ObjParametroCategoria = z.object({ categoriaId: ObjId }).strict();
export const ObjParametroAlmacen = z.object({ inventarioId: ObjId }).strict();
export const ObjParametroProducto = z.object({ productoId: ObjId }).strict();
export const ObjParametroProveedorProducto = z.object({ proveedorProductoId: ObjId }).strict();
export const ObjParametroExistencia = z.object({ inventarioProductoId: ObjId }).strict();
export const ObjParametroLote = z.object({ loteInventarioId: ObjId }).strict();
export const ObjParametroTransaccion = z.object({ transaccionInventarioId: ObjId }).strict();
export const ObjParametroTransferencia = z.object({ transferenciaId: ObjId }).strict();
export const ObjConsultaInventario = z.object({ pagina: z.coerce.number().int().positive().default(1), limite: z.coerce.number().int().min(1).max(100).default(20), busqueda: z.string().trim().max(200).optional(), estado: z.enum(["ACTIVO", "INACTIVO"]).optional() }).strict();
export const ObjConsultaProductos = ObjConsultaInventario.extend({ categoriaId: ObjId.optional(), manejaLotes: ObjBooleanoConsulta.optional() }).strict();
export const ObjConsultaProveedoresProductos = ObjConsultaInventario.extend({ proveedorId: ObjId.optional(), productoId: ObjId.optional() }).strict();
export const ObjConsultaExistencias = z.object({ pagina: z.coerce.number().int().positive().default(1), limite: z.coerce.number().int().min(1).max(100).default(20), productoId: ObjId.optional(), inventarioId: ObjId.optional(), bajoMinimo: ObjBooleanoConsulta.optional() }).strict();
export const ObjConsultaLotes = ObjConsultaInventario.extend({ productoId: ObjId.optional(), inventarioId: ObjId.optional() }).strict();
export const ObjConsultaMovimientos = z.object({ pagina: z.coerce.number().int().positive().default(1), limite: z.coerce.number().int().min(1).max(100).default(20), productoId: ObjId.optional(), inventarioId: ObjId.optional(), tipo: z.enum(["INGRESO", "SALIDA", "AJUSTE"]).optional(), subtipo: z.string().trim().max(40).optional() }).strict();
export const ObjConsultaTransferencias = z.object({ pagina: z.coerce.number().int().positive().default(1), limite: z.coerce.number().int().min(1).max(100).default(20), productoId: ObjId.optional(), inventarioOrigenId: ObjId.optional(), inventarioDestinoId: ObjId.optional(), revertida: ObjBooleanoConsulta.optional() }).strict();
export const ObjCuerpoVacio = z.object({}).strict();

export const ObjCrearCategoria = z.object({ nombre: z.string().trim().min(1).max(150), descripcion: ObjTextoOpcional(500) }).strict();
export const ObjEditarCategoria = ObjCrearCategoria.partial().refine((Obj) => Object.keys(Obj).length > 0).strict();
export const ObjEstadoCategoria = ObjEstado;
export const ObjCrearAlmacen = z.object({ codigo: z.string().trim().min(1).max(50), nombre: z.string().trim().min(1).max(150), descripcion: ObjTextoOpcional(500), ubicacion: ObjTextoOpcional(300) }).strict();
export const ObjEditarAlmacen = ObjCrearAlmacen.omit({ codigo: true }).partial().refine((Obj) => Object.keys(Obj).length > 0).strict();
export const ObjEstadoAlmacen = ObjEstado;
export const ObjCrearProducto = z.object({ categoriaId: ObjId, codigo: z.string().trim().min(1).max(50), nombre: z.string().trim().min(1).max(200), descripcion: ObjTextoOpcional(1000), unidadMedida: z.string().trim().min(1).max(50), manejaLotes: z.boolean() }).strict();
export const ObjEditarProducto = ObjCrearProducto.omit({ codigo: true }).partial().refine((Obj) => Object.keys(Obj).length > 0).strict();
export const ObjEstadoProducto = ObjEstado;
export const ObjGestionarProveedorProducto = z.object({ proveedorId: ObjId, productoId: ObjId, precioReferencia: ObjDecimalNoNegativo.nullable().optional(), activo: z.boolean().optional() }).strict();
export const ObjEditarMinimo = z.object({ existenciaMinima: ObjDecimalNoNegativo }).strict();
export const ObjEditarLote = z.object({ fechaVencimiento: z.string().date().nullable().optional(), observaciones: ObjTextoOpcional(1000) }).strict().refine((Obj) => Object.keys(Obj).length > 0);
export const ObjEstadoLote = ObjEstado;

const ObjMovimientoBase = z.object({ productoId: ObjId, inventarioId: ObjId, loteInventarioId: ObjId.optional(), cantidad: ObjDecimalPositivo, costoUnitario: ObjDecimalNoNegativo.nullable().optional(), proveedorId: ObjId.optional(), codigoLote: z.string().trim().min(1).max(100).optional(), fechaFabricacion: z.string().date().nullable().optional(), fechaVencimiento: z.string().date().nullable().optional(), documentoReferencia: ObjTextoOpcional(150), motivo: ObjTextoOpcional(500), observaciones: ObjTextoOpcional(1000) });
export const ObjCrearEntrada = ObjMovimientoBase.extend({ subtipo: z.enum(["COMPRA", "INVENTARIO_INICIAL"]) }).strict().superRefine((ObjDatos, ObjContexto) => {
  if (ObjDatos.subtipo === "COMPRA" && ObjDatos.costoUnitario == null) ObjContexto.addIssue({ code: "custom", path: ["costoUnitario"], message: "La compra requiere costo unitario." });
});
export const ObjCrearSalida = ObjMovimientoBase.omit({ costoUnitario: true, codigoLote: true, fechaFabricacion: true, fechaVencimiento: true }).extend({ subtipo: z.enum(["DEVOLUCION_PROVEEDOR", "MERMA", "DISPOSICION"]) }).strict();
export const ObjCrearAjuste = ObjMovimientoBase.omit({ costoUnitario: true, proveedorId: true, codigoLote: true, fechaFabricacion: true, fechaVencimiento: true, motivo: true }).extend({ cantidad: z.union([z.string(), z.number()]).transform(String).refine((StrValor) => /^-?\d+(\.\d{1,4})?$/.test(StrValor) && Number(StrValor) !== 0), motivo: z.string().trim().min(1).max(500), subtipo: z.literal("CONTEO_FISICO") }).strict();
export const ObjCrearTransferencia = z.object({ productoId: ObjId, inventarioOrigenId: ObjId, inventarioDestinoId: ObjId, loteInventarioId: ObjId.optional(), cantidad: ObjDecimalPositivo, documentoReferencia: ObjTextoOpcional(150), motivo: ObjTextoOpcional(500), observaciones: ObjTextoOpcional(1000) }).strict();
