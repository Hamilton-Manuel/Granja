import { Prisma } from "../../../generated/prisma/client.js";
import { Fecha_convertirAlmacenamientoGuatemalaAInstante, Fecha_formatearFechaCivil, Fecha_formatearInstanteGuatemala, Fecha_obtenerAhoraGuatemala, Fecha_parsearFechaCivil } from "../../datetime/fecha.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import { Inventario_canonicalizarCodigo } from "./inventario.constants.js";
import * as ObjRepositorio from "./inventario.repository.js";
const DecimalInventario=Prisma.Decimal.clone({precision:50,rounding:Prisma.Decimal.ROUND_HALF_UP});

export function Inventario_formatearRespuesta<T>(ObjValor: T, StrClave = ""): T {
  if (ObjValor instanceof Date) return (StrClave === "fechaFabricacion" || StrClave === "fechaVencimiento" ? Fecha_formatearFechaCivil(ObjValor) : Fecha_formatearInstanteGuatemala(Fecha_convertirAlmacenamientoGuatemalaAInstante(ObjValor))) as T;
  if (Array.isArray(ObjValor)) return ObjValor.map((ObjElemento) => Inventario_formatearRespuesta(ObjElemento)) as T;
  if (ObjValor !== null && typeof ObjValor === "object" && !(ObjValor instanceof Prisma.Decimal)) return Object.fromEntries(Object.entries(ObjValor).map(([StrPropiedad, ObjDato]) => [StrPropiedad, Inventario_formatearRespuesta(ObjDato, StrPropiedad)])) as T;
  return ObjValor;
}

function Inventario_error(StrCodigo: string): never {
  const ObjErrores: Record<string, [number, string]> = {
    STOCK_INSUFICIENTE: [409, "La existencia disponible es insuficiente."], LOTE_NO_ENCONTRADO: [404, "El lote no existe."], FUENTE_INVENTARIO_INCONSISTENTE: [409, "El lote no corresponde al producto y almacén seleccionados."],
  };
  const [IntEstado, StrMensaje] = ObjErrores[StrCodigo] ?? [409, "La operación de inventario no pudo completarse."];
  throw new ErrorAplicacion(IntEstado, StrCodigo, StrMensaje);
}
function Inventario_mapearPersistencia(ObjError: unknown): never {
  if (ObjError instanceof Error && (ObjError.message === "STOCK_INSUFICIENTE" || ObjError.message === "LOTE_NO_ENCONTRADO" || ObjError.message === "FUENTE_INVENTARIO_INCONSISTENTE")) Inventario_error(ObjError.message);
  if (ObjError instanceof Prisma.PrismaClientKnownRequestError) {
    if (ObjError.code === "P2002") { const StrDetalle = `${ObjError.message} ${JSON.stringify(ObjError.meta ?? {})}`.toLowerCase(); if (StrDetalle.includes("inventario_lotes") || StrDetalle.includes("codigo_lote")) throw new ErrorAplicacion(409, "LOTE_DUPLICADO", "Ya existe ese lote para el producto."); throw new ErrorAplicacion(409, "REGISTRO_DUPLICADO", "Ya existe un registro con esos datos."); }
    if (ObjError.code === "P2025") throw new ErrorAplicacion(404, "REGISTRO_NO_ENCONTRADO", "El registro no existe.");
  }
  throw ObjError;
}
function Inventario_mapearPersistenciaEntidad(ObjError: unknown, StrDuplicado: string, StrNoEncontrado: string): never {
  if (ObjError instanceof Prisma.PrismaClientKnownRequestError) {
    if (ObjError.code === "P2002") throw new ErrorAplicacion(409, StrDuplicado, "Ya existe un registro con esos datos.");
    if (ObjError.code === "P2025") throw new ErrorAplicacion(404, StrNoEncontrado, "El registro no existe.");
  }
  Inventario_mapearPersistencia(ObjError);
}
async function Inventario_validarProductoAlmacen(IntProductoId: number, IntInventarioId: number) {
  const [ObjProducto, ObjAlmacen] = await Promise.all([ObjRepositorio.Inventario_obtenerProducto(IntProductoId), ObjRepositorio.Inventario_obtenerAlmacen(IntInventarioId)]);
  if (!ObjProducto) throw new ErrorAplicacion(404, "PRODUCTO_NO_ENCONTRADO", "El producto no existe.");
  if (!ObjProducto.activo) throw new ErrorAplicacion(409, "PRODUCTO_INACTIVO", "El producto está inactivo.");
  if (!ObjAlmacen) throw new ErrorAplicacion(404, "ALMACEN_NO_ENCONTRADO", "El almacén no existe.");
  if (!ObjAlmacen.activo) throw new ErrorAplicacion(409, "ALMACEN_INACTIVO", "El almacén está inactivo.");
  return ObjProducto;
}
async function Inventario_validarLoteParaSalida(IntLoteId: number, BoolPermiteVencido: boolean) {
  const ObjLote = await ObjRepositorio.Inventario_obtenerLote(IntLoteId);
  if (!ObjLote) throw new ErrorAplicacion(404, "LOTE_NO_ENCONTRADO", "El lote no existe.");
  if (!ObjLote.activo) throw new ErrorAplicacion(409, "LOTE_INACTIVO", "El lote está inactivo.");
  if (!BoolPermiteVencido && ObjLote.fechaVencimiento && Fecha_formatearFechaCivil(ObjLote.fechaVencimiento) < Fecha_formatearFechaCivil(Fecha_obtenerAhoraGuatemala())) throw new ErrorAplicacion(409, "LOTE_VENCIDO", "El lote está vencido.");
}

export function Inventario_validarProveedorOperacion(ObjProveedor: { activo: boolean } | null, BoolRequerido: boolean, BoolEnviado: boolean): void {
  if (BoolRequerido && !BoolEnviado) throw new ErrorAplicacion(400, "PROVEEDOR_REQUERIDO", "Debe seleccionar un proveedor.");
  if (!BoolEnviado) return;
  if (ObjProveedor === null) throw new ErrorAplicacion(404, "PROVEEDOR_NO_ENCONTRADO", "El proveedor no existe.");
  if (!ObjProveedor.activo) throw new ErrorAplicacion(409, "PROVEEDOR_INACTIVO", "El proveedor está inactivo.");
}

export function Inventario_validarProveedorLote(IntProveedorLote: number | null, IntProveedorOperacion?: number): void {
  if (IntProveedorLote !== null && IntProveedorOperacion !== undefined && IntProveedorLote !== IntProveedorOperacion) throw new ErrorAplicacion(409, "PROVEEDOR_LOTE_NO_COINCIDE", "El proveedor no corresponde al lote.");
}

export const Inventario_listarCategorias = ObjRepositorio.Inventario_listarCategorias;
export const Inventario_listarAlmacenes = ObjRepositorio.Inventario_listarAlmacenes;
export const Inventario_listarProductos = ObjRepositorio.Inventario_listarProductos;
export const Inventario_listarProveedores = ObjRepositorio.Inventario_listarProveedores;
export const Inventario_listarProveedoresProductos = ObjRepositorio.Inventario_listarProveedoresProductos;
export const Inventario_listarExistencias = ObjRepositorio.Inventario_listarExistencias;
export const Inventario_listarLotes = ObjRepositorio.Inventario_listarLotes;
export const Inventario_listarMovimientos = ObjRepositorio.Inventario_listarMovimientos;
export const Inventario_listarTransferencias = ObjRepositorio.Inventario_listarTransferencias;

export async function Inventario_obtenerResumen() {
  const DtHoy = Fecha_parsearFechaCivil(Fecha_formatearFechaCivil(Fecha_obtenerAhoraGuatemala()));
  const DtLimite = new Date(Date.UTC(DtHoy.getUTCFullYear(), DtHoy.getUTCMonth(), DtHoy.getUTCDate() + 30));
  return { fechaCorte: Fecha_obtenerAhoraGuatemala(), diasProximoVencimiento: 30 as const, ...await ObjRepositorio.Inventario_obtenerResumen(DtHoy, DtLimite) };
}

export async function Inventario_crearCategoria(ObjDatos: Parameters<typeof ObjRepositorio.Inventario_crearCategoria>[0]) { try { return await ObjRepositorio.Inventario_crearCategoria(ObjDatos); } catch (ObjError) { Inventario_mapearPersistenciaEntidad(ObjError, "CATEGORIA_DUPLICADA", "CATEGORIA_NO_ENCONTRADA"); } }
export async function Inventario_editarCategoria(IntId: number, ObjDatos: Prisma.InventarioCategoriaUpdateInput, IntUsuarioId: number, StrIp?: string | undefined) { if (!await ObjRepositorio.Inventario_obtenerCategoria(IntId)) throw new ErrorAplicacion(404, "CATEGORIA_NO_ENCONTRADA", "La categoría no existe."); try { return await ObjRepositorio.Inventario_editarCategoria(IntId, ObjDatos, IntUsuarioId, StrIp); } catch (ObjError) { Inventario_mapearPersistenciaEntidad(ObjError, "CATEGORIA_DUPLICADA", "CATEGORIA_NO_ENCONTRADA"); } }
export async function Inventario_crearAlmacen(ObjDatos: Parameters<typeof ObjRepositorio.Inventario_crearAlmacen>[0]) { ObjDatos.codigo = Inventario_canonicalizarCodigo(ObjDatos.codigo); try { return await ObjRepositorio.Inventario_crearAlmacen(ObjDatos); } catch (ObjError) { Inventario_mapearPersistenciaEntidad(ObjError, "CODIGO_ALMACEN_DUPLICADO", "ALMACEN_NO_ENCONTRADO"); } }
export async function Inventario_editarAlmacen(IntId: number, ObjDatos: Prisma.InventarioAlmacenUpdateInput, IntUsuarioId: number, StrIp?: string | undefined) { if (!await ObjRepositorio.Inventario_obtenerAlmacen(IntId)) throw new ErrorAplicacion(404, "ALMACEN_NO_ENCONTRADO", "El almacén no existe."); try { return await ObjRepositorio.Inventario_editarAlmacen(IntId, ObjDatos, IntUsuarioId, StrIp); } catch (ObjError) { Inventario_mapearPersistenciaEntidad(ObjError, "CODIGO_ALMACEN_DUPLICADO", "ALMACEN_NO_ENCONTRADO"); } }
export async function Inventario_crearProducto(ObjDatos: Parameters<typeof ObjRepositorio.Inventario_crearProducto>[0]) { const ObjCategoria = await ObjRepositorio.Inventario_obtenerCategoria(ObjDatos.categoriaId); if (!ObjCategoria) throw new ErrorAplicacion(404, "CATEGORIA_NO_ENCONTRADA", "La categoría no existe."); if (!ObjCategoria.activo) throw new ErrorAplicacion(409, "CATEGORIA_INACTIVA", "La categoría está inactiva."); ObjDatos.codigo = Inventario_canonicalizarCodigo(ObjDatos.codigo); try { return await ObjRepositorio.Inventario_crearProducto(ObjDatos); } catch (ObjError) { Inventario_mapearPersistenciaEntidad(ObjError, "CODIGO_PRODUCTO_DUPLICADO", "PRODUCTO_NO_ENCONTRADO"); } }
export async function Inventario_editarProducto(IntId: number, ObjDatos: { categoriaId?: number | undefined; nombre?: string | undefined; descripcion?: string | null | undefined; unidadMedida?: string | undefined; manejaLotes?: boolean | undefined }, IntUsuarioId: number, StrIp?: string | undefined) { const ObjProducto = await ObjRepositorio.Inventario_obtenerProducto(IntId); if (!ObjProducto) throw new ErrorAplicacion(404, "PRODUCTO_NO_ENCONTRADO", "El producto no existe."); if (ObjDatos.categoriaId !== undefined) { const ObjCategoria = await ObjRepositorio.Inventario_obtenerCategoria(ObjDatos.categoriaId); if (!ObjCategoria) throw new ErrorAplicacion(404, "CATEGORIA_NO_ENCONTRADA", "La categoría no existe."); if (!ObjCategoria.activo) throw new ErrorAplicacion(409, "CATEGORIA_INACTIVA", "La categoría está inactiva."); } if (ObjDatos.manejaLotes !== undefined && ObjDatos.manejaLotes !== ObjProducto.manejaLotes && await ObjRepositorio.Inventario_productoTieneActividad(IntId)) throw new ErrorAplicacion(409, "MANEJO_LOTES_NO_MODIFICABLE", "No puede cambiarse el manejo de lotes después de registrar actividad."); try { return await ObjRepositorio.Inventario_editarProducto(IntId, ObjDatos as Prisma.InventarioProductoUpdateInput, IntUsuarioId, StrIp); } catch (ObjError) { Inventario_mapearPersistenciaEntidad(ObjError, "CODIGO_PRODUCTO_DUPLICADO", "PRODUCTO_NO_ENCONTRADO"); } }
export async function Inventario_cambiarEstado(StrEntidad: "categoria" | "almacen" | "producto" | "lote", IntId: number, BoolActivo: boolean, IntUsuarioId: number, StrIp?: string | undefined) { const ObjErrores = { categoria: ["CATEGORIA_NO_ENCONTRADA", "CATEGORIA_DUPLICADA"], almacen: ["ALMACEN_NO_ENCONTRADO", "CODIGO_ALMACEN_DUPLICADO"], producto: ["PRODUCTO_NO_ENCONTRADO", "CODIGO_PRODUCTO_DUPLICADO"], lote: ["LOTE_NO_ENCONTRADO", "LOTE_DUPLICADO"] } as const; try { return await ObjRepositorio.Inventario_cambiarEstado(StrEntidad, IntId, BoolActivo, IntUsuarioId, StrIp); } catch (ObjError) { Inventario_mapearPersistenciaEntidad(ObjError, ObjErrores[StrEntidad][1], ObjErrores[StrEntidad][0]); } }
export async function Inventario_gestionarProveedorProducto(ObjDatos: Parameters<typeof ObjRepositorio.Inventario_gestionarProveedorProducto>[0]) { const [ObjProveedor, ObjProducto] = await Promise.all([ObjRepositorio.Inventario_obtenerProveedor(ObjDatos.proveedorId), ObjRepositorio.Inventario_obtenerProducto(ObjDatos.productoId)]); if (!ObjProveedor) throw new ErrorAplicacion(404, "PROVEEDOR_NO_ENCONTRADO", "El proveedor no existe."); if (!ObjProducto) throw new ErrorAplicacion(404, "PRODUCTO_NO_ENCONTRADO", "El producto no existe."); if (!ObjProveedor.activo) throw new ErrorAplicacion(409, "PROVEEDOR_INACTIVO", "El proveedor está inactivo."); if (!ObjProducto.activo) throw new ErrorAplicacion(409, "PRODUCTO_INACTIVO", "El producto está inactivo."); return ObjRepositorio.Inventario_gestionarProveedorProducto(ObjDatos); }
export async function Inventario_editarMinimo(IntId: number, StrMinimo: string, IntUsuarioId: number, StrIp?: string | undefined) { if (!await ObjRepositorio.Inventario_obtenerExistencia(IntId)) throw new ErrorAplicacion(404, "EXISTENCIA_NO_ENCONTRADA", "La existencia no existe."); try { return await ObjRepositorio.Inventario_editarMinimo(IntId, StrMinimo, IntUsuarioId, StrIp); } catch (ObjError) { Inventario_mapearPersistenciaEntidad(ObjError, "REGISTRO_DUPLICADO", "EXISTENCIA_NO_ENCONTRADA"); } }
export async function Inventario_editarLote(IntId: number, ObjDatos: { fechaVencimiento?: string | undefined | null; observaciones?: string | undefined | null }, IntUsuarioId: number, StrIp?: string | undefined) { if (!await ObjRepositorio.Inventario_obtenerLote(IntId)) throw new ErrorAplicacion(404, "LOTE_NO_ENCONTRADO", "El lote no existe."); try { return await ObjRepositorio.Inventario_editarLote(IntId, { ...(ObjDatos.fechaVencimiento === undefined ? {} : { fechaVencimiento: ObjDatos.fechaVencimiento === null ? null : Fecha_parsearFechaCivil(ObjDatos.fechaVencimiento) }), ...(ObjDatos.observaciones === undefined ? {} : { observaciones: ObjDatos.observaciones }) }, IntUsuarioId, StrIp); } catch (ObjError) { Inventario_mapearPersistenciaEntidad(ObjError, "LOTE_DUPLICADO", "LOTE_NO_ENCONTRADO"); } }

export function Inventario_calcularConversion(DecCantidadComercial: Prisma.Decimal, DecFactorComercial: Prisma.Decimal, DecFactorBase: Prisma.Decimal, DecPrecioTotal: Prisma.Decimal) {
  const DecFactorConversion = new DecimalInventario(DecFactorComercial.toString()).div(DecFactorBase.toString()).toDecimalPlaces(12, Prisma.Decimal.ROUND_HALF_UP);
  const DecCantidadBase = new DecimalInventario(DecCantidadComercial.toString()).mul(DecFactorConversion).toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP);
  if (!DecCantidadBase.isPositive()) throw new ErrorAplicacion(400, "CANTIDAD_BASE_INVALIDA", "La conversión produce una cantidad base inválida.");
  const DecCostoUnitario = new DecimalInventario(DecPrecioTotal.toString()).div(DecCantidadBase).toDecimalPlaces(18, Prisma.Decimal.ROUND_HALF_UP);
  return { DecFactorConversion:new Prisma.Decimal(DecFactorConversion.toFixed(15)), DecCantidadBase:new Prisma.Decimal(DecCantidadBase.toFixed(6)), DecCostoUnitario:new Prisma.Decimal(DecCostoUnitario.toFixed(18)) };
}

export async function Inventario_registrarEntrada(ObjDatos: { subtipo: "COMPRA" | "INVENTARIO_INICIAL"; productoId: number; inventarioId: number; proveedorId?: number | undefined; cantidadComercial: string; unidadComercial: string; precioTotalIngreso: string; fechaFabricacion?: string | null | undefined; fechaVencimiento?: string | null | undefined; documentoReferencia?: string | null | undefined; motivo?: string | null | undefined; observaciones?: string | null | undefined; IntUsuarioId: number; StrIp?: string | undefined }) {
  const ObjProducto = await Inventario_validarProductoAlmacen(ObjDatos.productoId, ObjDatos.inventarioId);
  const ObjProveedor = ObjDatos.proveedorId === undefined ? null : await ObjRepositorio.Inventario_obtenerProveedor(ObjDatos.proveedorId);
  Inventario_validarProveedorOperacion(ObjProveedor, ObjDatos.subtipo === "COMPRA", ObjDatos.proveedorId !== undefined);
  const [ObjUnidadComercial, ObjUnidadBase] = await Promise.all([ObjRepositorio.Inventario_obtenerUnidad(ObjDatos.unidadComercial), ObjRepositorio.Inventario_obtenerUnidad(ObjProducto.unidadMedida)]);
  if (!ObjUnidadComercial || !ObjUnidadComercial.activo) throw new ErrorAplicacion(409, "UNIDAD_COMERCIAL_INVALIDA", "La unidad comercial no existe o está inactiva.");
  if (!ObjUnidadBase || !ObjUnidadBase.activo) throw new ErrorAplicacion(409, "UNIDAD_BASE_INVALIDA", "La unidad base no existe o está inactiva.");
  if (ObjUnidadComercial.dimension !== ObjUnidadBase.dimension) throw new ErrorAplicacion(409, "DIMENSION_UNIDAD_INCOMPATIBLE", "La unidad comercial no corresponde a la dimensión del producto.");
  if (ObjDatos.fechaFabricacion && ObjDatos.fechaVencimiento && ObjDatos.fechaFabricacion > ObjDatos.fechaVencimiento) throw new ErrorAplicacion(400, "FECHAS_LOTE_INVALIDAS", "La fabricación no puede ser posterior al vencimiento.");
  const DecCantidadComercial = new Prisma.Decimal(ObjDatos.cantidadComercial);
  const DecPrecioTotal = new Prisma.Decimal(ObjDatos.precioTotalIngreso).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
  const { DecFactorConversion, DecCantidadBase, DecCostoUnitario } = Inventario_calcularConversion(DecCantidadComercial, new Prisma.Decimal(ObjUnidadComercial.factorReferencia), new Prisma.Decimal(ObjUnidadBase.factorReferencia), DecPrecioTotal);
  try {
    return await ObjRepositorio.Inventario_registrarEntradaConLote({ ...ObjDatos, cantidadComercial: DecCantidadComercial.toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP), factorConversion: DecFactorConversion, cantidadBase: DecCantidadBase, unidadBase: ObjProducto.unidadMedida, precioTotalIngreso: DecPrecioTotal, costoUnitario: DecCostoUnitario, fechaFabricacion: ObjDatos.fechaFabricacion == null ? ObjDatos.fechaFabricacion : Fecha_parsearFechaCivil(ObjDatos.fechaFabricacion), fechaVencimiento: ObjDatos.fechaVencimiento == null ? ObjDatos.fechaVencimiento : Fecha_parsearFechaCivil(ObjDatos.fechaVencimiento) });
  } catch (ObjError) { Inventario_mapearPersistencia(ObjError); }
}
export async function Inventario_registrarSalida(ObjDatos: { subtipo: "DEVOLUCION_PROVEEDOR" | "MERMA" | "DISPOSICION"; productoId: number; inventarioId: number; loteInventarioId: number; proveedorId?: number | undefined; cantidad: string; documentoReferencia?: string | undefined | null; motivo?: string | undefined | null; observaciones?: string | undefined | null; IntUsuarioId: number; StrIp?: string | undefined }) { await Inventario_validarProductoAlmacen(ObjDatos.productoId, ObjDatos.inventarioId); if (ObjDatos.subtipo === "DEVOLUCION_PROVEEDOR") { const ObjProveedor = ObjDatos.proveedorId === undefined ? null : await ObjRepositorio.Inventario_obtenerProveedor(ObjDatos.proveedorId); Inventario_validarProveedorOperacion(ObjProveedor, true, ObjDatos.proveedorId !== undefined); const ObjLote = await ObjRepositorio.Inventario_obtenerLote(ObjDatos.loteInventarioId); if (ObjLote) Inventario_validarProveedorLote(ObjLote.proveedorId, ObjDatos.proveedorId); } await Inventario_validarLoteParaSalida(ObjDatos.loteInventarioId, ObjDatos.subtipo === "MERMA" || ObjDatos.subtipo === "DISPOSICION"); try { return await ObjRepositorio.Inventario_registrarMovimiento({ ...ObjDatos, tipo: "SALIDA", cantidad: new Prisma.Decimal(ObjDatos.cantidad).negated() }); } catch (ObjError) { Inventario_mapearPersistencia(ObjError); } }
export async function Inventario_registrarAjuste(ObjDatos: { subtipo: "CONTEO_FISICO"; productoId: number; inventarioId: number; loteInventarioId: number; cantidad: string; documentoReferencia?: string | undefined | null; motivo: string; observaciones?: string | undefined | null; IntUsuarioId: number; StrIp?: string | undefined }) { await Inventario_validarProductoAlmacen(ObjDatos.productoId, ObjDatos.inventarioId); await Inventario_validarLoteParaSalida(ObjDatos.loteInventarioId, true); try { return await ObjRepositorio.Inventario_registrarMovimiento({ ...ObjDatos, tipo: "AJUSTE", cantidad: new Prisma.Decimal(ObjDatos.cantidad) }); } catch (ObjError) { Inventario_mapearPersistencia(ObjError); } }
export async function Inventario_registrarTransferencia(ObjDatos: { productoId: number; inventarioOrigenId: number; inventarioDestinoId: number; loteInventarioId: number; cantidad: string; documentoReferencia?: string | undefined | null; motivo?: string | undefined | null; observaciones?: string | undefined | null; IntUsuarioId: number; StrIp?: string | undefined }) { if (ObjDatos.inventarioOrigenId === ObjDatos.inventarioDestinoId) throw new ErrorAplicacion(400, "ALMACEN_DESTINO_INVALIDO", "Los almacenes deben ser diferentes."); await Inventario_validarProductoAlmacen(ObjDatos.productoId, ObjDatos.inventarioOrigenId); await Inventario_validarProductoAlmacen(ObjDatos.productoId, ObjDatos.inventarioDestinoId); await Inventario_validarLoteParaSalida(ObjDatos.loteInventarioId, true); try { return await ObjRepositorio.Inventario_registrarTransferencia({ ...ObjDatos, cantidad: new Prisma.Decimal(ObjDatos.cantidad) }); } catch (ObjError) { Inventario_mapearPersistencia(ObjError); } }
export async function Inventario_revertirMovimiento(IntTransaccionId: number, IntUsuarioId: number, StrIp?: string | undefined) { try { return await ObjRepositorio.Inventario_revertirMovimiento(IntTransaccionId, IntUsuarioId, StrIp); } catch (ObjError) { if (ObjError instanceof Error && ObjError.message === "MOVIMIENTO_NO_ENCONTRADO") throw new ErrorAplicacion(404, "MOVIMIENTO_NO_ENCONTRADO", "El movimiento no existe."); if (ObjError instanceof Error && ObjError.message === "MOVIMIENTO_YA_REVERTIDO") throw new ErrorAplicacion(409, "MOVIMIENTO_YA_REVERTIDO", "El movimiento ya fue revertido."); if (ObjError instanceof Error && ObjError.message === "MOVIMIENTO_LEGADO_SIN_LOTE") throw new ErrorAplicacion(409, "MOVIMIENTO_LEGADO_SIN_LOTE", "El movimiento histórico sin lote no admite nuevas operaciones."); if (ObjError instanceof Error && ObjError.message === "REVERSION_NO_PERMITIDA") throw new ErrorAplicacion(409, "REVERSION_NO_PERMITIDA", "No puede revertirse un movimiento de reversión."); if (ObjError instanceof Error && ObjError.message === "REVERSION_TRANSFERENCIA_REQUIERE_ENDPOINT") throw new ErrorAplicacion(409, "REVERSION_TRANSFERENCIA_REQUIERE_ENDPOINT", "La transferencia debe revertirse mediante su endpoint específico."); Inventario_mapearPersistencia(ObjError); } }
export async function Inventario_revertirTransferencia(IntTransferenciaId: number, IntUsuarioId: number, StrIp?: string | undefined) { try { return await ObjRepositorio.Inventario_revertirTransferencia(IntTransferenciaId, IntUsuarioId, StrIp); } catch (ObjError) { if (ObjError instanceof Error && ObjError.message === "TRANSFERENCIA_NO_ENCONTRADA") throw new ErrorAplicacion(404, "TRANSFERENCIA_NO_ENCONTRADA", "La transferencia no existe."); if (ObjError instanceof Error && ObjError.message === "TRANSFERENCIA_YA_REVERTIDA") throw new ErrorAplicacion(409, "TRANSFERENCIA_YA_REVERTIDA", "La transferencia ya fue revertida."); if (ObjError instanceof Error && ObjError.message === "TRANSFERENCIA_INCONSISTENTE") throw new ErrorAplicacion(409, "TRANSFERENCIA_INCONSISTENTE", "La transferencia no contiene movimientos coherentes."); Inventario_mapearPersistencia(ObjError); } }
export function Inventario_diagnosticarReconciliacion(IntUsuarioId: number, StrIp?: string | undefined) { return ObjRepositorio.Inventario_diagnosticarReconciliacion(IntUsuarioId, StrIp); }
