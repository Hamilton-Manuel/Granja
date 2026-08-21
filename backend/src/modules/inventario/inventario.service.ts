import { Prisma } from "../../../generated/prisma/client.js";
import { Fecha_convertirAlmacenamientoGuatemalaAInstante, Fecha_formatearFechaCivil, Fecha_formatearInstanteGuatemala, Fecha_obtenerAhoraGuatemala, Fecha_parsearFechaCivil } from "../../datetime/fecha.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import { Inventario_canonicalizarCodigo } from "./inventario.constants.js";
import * as ObjRepositorio from "./inventario.repository.js";

export function Inventario_formatearRespuesta<T>(ObjValor: T, StrClave = ""): T {
  if (ObjValor instanceof Date) return (StrClave === "fechaFabricacion" || StrClave === "fechaVencimiento" ? Fecha_formatearFechaCivil(ObjValor) : Fecha_formatearInstanteGuatemala(Fecha_convertirAlmacenamientoGuatemalaAInstante(ObjValor))) as T;
  if (Array.isArray(ObjValor)) return ObjValor.map((ObjElemento) => Inventario_formatearRespuesta(ObjElemento)) as T;
  if (ObjValor !== null && typeof ObjValor === "object" && !(ObjValor instanceof Prisma.Decimal)) return Object.fromEntries(Object.entries(ObjValor).map(([StrPropiedad, ObjDato]) => [StrPropiedad, Inventario_formatearRespuesta(ObjDato, StrPropiedad)])) as T;
  return ObjValor;
}

function Inventario_error(StrCodigo: string): never {
  const ObjErrores: Record<string, [number, string]> = {
    STOCK_INSUFICIENTE: [409, "La existencia disponible es insuficiente."], LOTE_NO_ENCONTRADO: [404, "El lote no existe."],
  };
  const [IntEstado, StrMensaje] = ObjErrores[StrCodigo] ?? [409, "La operación de inventario no pudo completarse."];
  throw new ErrorAplicacion(IntEstado, StrCodigo, StrMensaje);
}
function Inventario_mapearPersistencia(ObjError: unknown): never {
  if (ObjError instanceof Error && (ObjError.message === "STOCK_INSUFICIENTE" || ObjError.message === "LOTE_NO_ENCONTRADO")) Inventario_error(ObjError.message);
  if (ObjError instanceof Prisma.PrismaClientKnownRequestError) {
    if (ObjError.code === "P2002") throw new ErrorAplicacion(409, "REGISTRO_DUPLICADO", "Ya existe un registro con esos datos.");
    if (ObjError.code === "P2025") throw new ErrorAplicacion(404, "REGISTRO_NO_ENCONTRADO", "El registro no existe.");
  }
  throw ObjError;
}
async function Inventario_validarProductoAlmacen(IntProductoId: number, IntInventarioId: number) {
  const [ObjProducto, ObjAlmacen] = await Promise.all([ObjRepositorio.Inventario_obtenerProducto(IntProductoId), ObjRepositorio.Inventario_obtenerAlmacen(IntInventarioId)]);
  if (!ObjProducto) throw new ErrorAplicacion(404, "PRODUCTO_NO_ENCONTRADO", "El producto no existe.");
  if (!ObjProducto.activo) throw new ErrorAplicacion(409, "PRODUCTO_INACTIVO", "El producto está inactivo.");
  if (!ObjAlmacen) throw new ErrorAplicacion(404, "ALMACEN_NO_ENCONTRADO", "El almacén no existe.");
  if (!ObjAlmacen.activo) throw new ErrorAplicacion(409, "ALMACEN_INACTIVO", "El almacén está inactivo.");
  return ObjProducto;
}
async function Inventario_validarLoteParaSalida(IntLoteId: number | undefined, BoolPermiteVencido: boolean) {
  if (IntLoteId === undefined) return;
  const ObjLote = await ObjRepositorio.Inventario_obtenerLote(IntLoteId);
  if (!ObjLote) throw new ErrorAplicacion(404, "LOTE_NO_ENCONTRADO", "El lote no existe.");
  if (!ObjLote.activo) throw new ErrorAplicacion(409, "LOTE_INACTIVO", "El lote está inactivo.");
  if (!BoolPermiteVencido && ObjLote.fechaVencimiento && Fecha_formatearFechaCivil(ObjLote.fechaVencimiento) < Fecha_formatearFechaCivil(Fecha_obtenerAhoraGuatemala())) throw new ErrorAplicacion(409, "LOTE_VENCIDO", "El lote está vencido.");
}

export const Inventario_listarCategorias = ObjRepositorio.Inventario_listarCategorias;
export const Inventario_listarAlmacenes = ObjRepositorio.Inventario_listarAlmacenes;
export const Inventario_listarProductos = ObjRepositorio.Inventario_listarProductos;
export const Inventario_listarProveedoresProductos = ObjRepositorio.Inventario_listarProveedoresProductos;
export const Inventario_listarExistencias = ObjRepositorio.Inventario_listarExistencias;
export const Inventario_listarLotes = ObjRepositorio.Inventario_listarLotes;
export const Inventario_listarMovimientos = ObjRepositorio.Inventario_listarMovimientos;
export const Inventario_diagnosticarReconciliacion = ObjRepositorio.Inventario_diagnosticarReconciliacion;

export async function Inventario_crearCategoria(ObjDatos: Parameters<typeof ObjRepositorio.Inventario_crearCategoria>[0]) { try { return await ObjRepositorio.Inventario_crearCategoria(ObjDatos); } catch (ObjError) { Inventario_mapearPersistencia(ObjError); } }
export async function Inventario_editarCategoria(IntId: number, ObjDatos: Prisma.InventarioCategoriaUpdateInput, IntUsuarioId: number, StrIp?: string | undefined) { if (!await ObjRepositorio.Inventario_obtenerCategoria(IntId)) throw new ErrorAplicacion(404, "CATEGORIA_NO_ENCONTRADA", "La categoría no existe."); try { return await ObjRepositorio.Inventario_editarCategoria(IntId, ObjDatos, IntUsuarioId, StrIp); } catch (ObjError) { Inventario_mapearPersistencia(ObjError); } }
export async function Inventario_crearAlmacen(ObjDatos: Parameters<typeof ObjRepositorio.Inventario_crearAlmacen>[0]) { ObjDatos.codigo = Inventario_canonicalizarCodigo(ObjDatos.codigo); try { return await ObjRepositorio.Inventario_crearAlmacen(ObjDatos); } catch (ObjError) { Inventario_mapearPersistencia(ObjError); } }
export async function Inventario_editarAlmacen(IntId: number, ObjDatos: Prisma.InventarioAlmacenUpdateInput, IntUsuarioId: number, StrIp?: string | undefined) { if (!await ObjRepositorio.Inventario_obtenerAlmacen(IntId)) throw new ErrorAplicacion(404, "ALMACEN_NO_ENCONTRADO", "El almacén no existe."); return ObjRepositorio.Inventario_editarAlmacen(IntId, ObjDatos, IntUsuarioId, StrIp); }
export async function Inventario_crearProducto(ObjDatos: Parameters<typeof ObjRepositorio.Inventario_crearProducto>[0]) { const ObjCategoria = await ObjRepositorio.Inventario_obtenerCategoria(ObjDatos.categoriaId); if (!ObjCategoria) throw new ErrorAplicacion(404, "CATEGORIA_NO_ENCONTRADA", "La categoría no existe."); if (!ObjCategoria.activo) throw new ErrorAplicacion(409, "CATEGORIA_INACTIVA", "La categoría está inactiva."); ObjDatos.codigo = Inventario_canonicalizarCodigo(ObjDatos.codigo); return ObjRepositorio.Inventario_crearProducto(ObjDatos); }
export async function Inventario_editarProducto(IntId: number, ObjDatos: Prisma.InventarioProductoUpdateInput & { categoriaId?: number | undefined }, IntUsuarioId: number, StrIp?: string | undefined) { const ObjProducto = await ObjRepositorio.Inventario_obtenerProducto(IntId); if (!ObjProducto) throw new ErrorAplicacion(404, "PRODUCTO_NO_ENCONTRADO", "El producto no existe."); if (ObjDatos.categoriaId !== undefined) { const ObjCategoria = await ObjRepositorio.Inventario_obtenerCategoria(ObjDatos.categoriaId); if (!ObjCategoria) throw new ErrorAplicacion(404, "CATEGORIA_NO_ENCONTRADA", "La categoría no existe."); if (!ObjCategoria.activo) throw new ErrorAplicacion(409, "CATEGORIA_INACTIVA", "La categoría está inactiva."); } return ObjRepositorio.Inventario_editarProducto(IntId, ObjDatos, IntUsuarioId, StrIp); }
export const Inventario_cambiarEstado = ObjRepositorio.Inventario_cambiarEstado;
export const Inventario_gestionarProveedorProducto = ObjRepositorio.Inventario_gestionarProveedorProducto;
export const Inventario_editarMinimo = ObjRepositorio.Inventario_editarMinimo;
export async function Inventario_editarLote(IntId: number, ObjDatos: { fechaFabricacion?: string | undefined | null; fechaVencimiento?: string | undefined | null; observaciones?: string | undefined | null }, IntUsuarioId: number, StrIp?: string | undefined) { if (!await ObjRepositorio.Inventario_obtenerLote(IntId)) throw new ErrorAplicacion(404, "LOTE_NO_ENCONTRADO", "El lote no existe."); return ObjRepositorio.Inventario_editarLote(IntId, { ...(ObjDatos.fechaFabricacion === undefined ? {} : { fechaFabricacion: ObjDatos.fechaFabricacion === null ? null : Fecha_parsearFechaCivil(ObjDatos.fechaFabricacion) }), ...(ObjDatos.fechaVencimiento === undefined ? {} : { fechaVencimiento: ObjDatos.fechaVencimiento === null ? null : Fecha_parsearFechaCivil(ObjDatos.fechaVencimiento) }), ...(ObjDatos.observaciones === undefined ? {} : { observaciones: ObjDatos.observaciones }) }, IntUsuarioId, StrIp); }

export async function Inventario_registrarEntrada(ObjDatos: { subtipo: "COMPRA" | "INVENTARIO_INICIAL"; productoId: number; inventarioId: number; loteInventarioId?: number | undefined; codigoLote?: string | undefined; proveedorId?: number | undefined; cantidad: string; costoUnitario?: string | undefined | null; fechaFabricacion?: string | undefined | null; fechaVencimiento?: string | undefined | null; documentoReferencia?: string | undefined | null; motivo?: string | undefined | null; observaciones?: string | undefined | null; IntUsuarioId: number; StrIp?: string | undefined }) {
  const ObjProducto = await Inventario_validarProductoAlmacen(ObjDatos.productoId, ObjDatos.inventarioId);
  if (ObjProducto.manejaLotes && ObjDatos.loteInventarioId === undefined && !ObjDatos.codigoLote) throw new ErrorAplicacion(400, "LOTE_REQUERIDO", "Debe indicar el lote.");
  if (!ObjProducto.manejaLotes && (ObjDatos.loteInventarioId !== undefined || ObjDatos.codigoLote !== undefined)) throw new ErrorAplicacion(409, "PRODUCTO_NO_MANEJA_LOTES", "El producto no maneja lotes.");
  if (ObjDatos.subtipo === "COMPRA" && ObjDatos.proveedorId === undefined) throw new ErrorAplicacion(400, "PROVEEDOR_REQUERIDO", "La compra requiere proveedor.");
  if (ObjDatos.subtipo === "COMPRA" && ObjDatos.proveedorId !== undefined) { const ObjRelacion = await ObjRepositorio.Inventario_obtenerProveedorProducto(ObjDatos.proveedorId, ObjDatos.productoId); if (!ObjRelacion) throw new ErrorAplicacion(404, "PROVEEDOR_PRODUCTO_NO_ENCONTRADO", "El proveedor no ofrece este producto."); if (!ObjRelacion.activo || !ObjRelacion.proveedor.activo) throw new ErrorAplicacion(409, "PROVEEDOR_INACTIVO", "El proveedor o su relación con el producto está inactivo."); }
  if (ObjDatos.loteInventarioId !== undefined) { const ObjLote = await ObjRepositorio.Inventario_obtenerLote(ObjDatos.loteInventarioId); if (!ObjLote || ObjLote.productoId !== ObjDatos.productoId) throw new ErrorAplicacion(404, "LOTE_NO_ENCONTRADO", "El lote no corresponde al producto."); if (!ObjLote.activo) throw new ErrorAplicacion(409, "LOTE_INACTIVO", "El lote está inactivo."); const DecCosto = ObjDatos.costoUnitario == null ? null : new Prisma.Decimal(ObjDatos.costoUnitario); if ((ObjLote.costoUnitario === null) !== (DecCosto === null) || (ObjLote.costoUnitario !== null && DecCosto !== null && !ObjLote.costoUnitario.equals(DecCosto))) throw new ErrorAplicacion(409, "COSTO_LOTE_DIFERENTE", "El costo no coincide con el costo único del lote."); }
  try { return await ObjRepositorio.Inventario_registrarMovimiento({ ...ObjDatos, tipo: "INGRESO", cantidad: new Prisma.Decimal(ObjDatos.cantidad), costoUnitario: ObjDatos.costoUnitario == null ? ObjDatos.costoUnitario : new Prisma.Decimal(ObjDatos.costoUnitario), fechaFabricacion: ObjDatos.fechaFabricacion == null ? ObjDatos.fechaFabricacion : Fecha_parsearFechaCivil(ObjDatos.fechaFabricacion), fechaVencimiento: ObjDatos.fechaVencimiento == null ? ObjDatos.fechaVencimiento : Fecha_parsearFechaCivil(ObjDatos.fechaVencimiento) }); } catch (ObjError) { Inventario_mapearPersistencia(ObjError); }
}
export async function Inventario_registrarSalida(ObjDatos: { subtipo: "DEVOLUCION_PROVEEDOR" | "MERMA" | "DISPOSICION"; productoId: number; inventarioId: number; loteInventarioId?: number | undefined; proveedorId?: number | undefined; cantidad: string; documentoReferencia?: string | undefined | null; motivo?: string | undefined | null; observaciones?: string | undefined | null; IntUsuarioId: number; StrIp?: string | undefined }) { const ObjProducto = await Inventario_validarProductoAlmacen(ObjDatos.productoId, ObjDatos.inventarioId); if (ObjProducto.manejaLotes && ObjDatos.loteInventarioId === undefined) throw new ErrorAplicacion(400, "LOTE_REQUERIDO", "Debe indicar el lote."); if (ObjDatos.subtipo === "DEVOLUCION_PROVEEDOR" && ObjDatos.proveedorId === undefined) throw new ErrorAplicacion(400, "PROVEEDOR_REQUERIDO", "La devolución requiere proveedor."); await Inventario_validarLoteParaSalida(ObjDatos.loteInventarioId, ObjDatos.subtipo === "MERMA" || ObjDatos.subtipo === "DISPOSICION"); try { return await ObjRepositorio.Inventario_registrarMovimiento({ ...ObjDatos, tipo: "SALIDA", cantidad: new Prisma.Decimal(ObjDatos.cantidad).negated() }); } catch (ObjError) { Inventario_mapearPersistencia(ObjError); } }
export async function Inventario_registrarAjuste(ObjDatos: { subtipo: "CONTEO_FISICO"; productoId: number; inventarioId: number; loteInventarioId?: number | undefined; cantidad: string; documentoReferencia?: string | undefined | null; motivo?: string | undefined | null; observaciones?: string | undefined | null; IntUsuarioId: number; StrIp?: string | undefined }) { await Inventario_validarProductoAlmacen(ObjDatos.productoId, ObjDatos.inventarioId); await Inventario_validarLoteParaSalida(ObjDatos.loteInventarioId, true); try { return await ObjRepositorio.Inventario_registrarMovimiento({ ...ObjDatos, tipo: "AJUSTE", cantidad: new Prisma.Decimal(ObjDatos.cantidad) }); } catch (ObjError) { Inventario_mapearPersistencia(ObjError); } }
export async function Inventario_registrarTransferencia(ObjDatos: { productoId: number; inventarioOrigenId: number; inventarioDestinoId: number; loteInventarioId?: number | undefined; cantidad: string; documentoReferencia?: string | undefined | null; motivo?: string | undefined | null; observaciones?: string | undefined | null; IntUsuarioId: number; StrIp?: string | undefined }) { if (ObjDatos.inventarioOrigenId === ObjDatos.inventarioDestinoId) throw new ErrorAplicacion(400, "ALMACEN_DESTINO_INVALIDO", "Los almacenes deben ser diferentes."); const ObjProducto = await Inventario_validarProductoAlmacen(ObjDatos.productoId, ObjDatos.inventarioOrigenId); await Inventario_validarProductoAlmacen(ObjDatos.productoId, ObjDatos.inventarioDestinoId); if (ObjProducto.manejaLotes && ObjDatos.loteInventarioId === undefined) throw new ErrorAplicacion(400, "LOTE_REQUERIDO", "Debe indicar el lote."); await Inventario_validarLoteParaSalida(ObjDatos.loteInventarioId, true); try { return await ObjRepositorio.Inventario_registrarTransferencia({ ...ObjDatos, cantidad: new Prisma.Decimal(ObjDatos.cantidad) }); } catch (ObjError) { Inventario_mapearPersistencia(ObjError); } }
export async function Inventario_revertirMovimiento(IntTransaccionId: number, IntUsuarioId: number, StrIp?: string | undefined) { try { return await ObjRepositorio.Inventario_revertirMovimiento(IntTransaccionId, IntUsuarioId, StrIp); } catch (ObjError) { if (ObjError instanceof Error && ObjError.message === "MOVIMIENTO_NO_ENCONTRADO") throw new ErrorAplicacion(404, "MOVIMIENTO_NO_ENCONTRADO", "El movimiento no existe."); if (ObjError instanceof Error && ObjError.message === "MOVIMIENTO_YA_REVERTIDO") throw new ErrorAplicacion(409, "MOVIMIENTO_YA_REVERTIDO", "El movimiento ya fue revertido."); Inventario_mapearPersistencia(ObjError); } }
