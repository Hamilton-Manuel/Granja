import { ErrorAplicacion } from "../../../errors/error-aplicacion.js";
import * as R from "./concentrados.repository.js";
import * as H from "./concentrados.elaboraciones.repository.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import { Alimentacion_exigirGrafoSinCiclos } from "./concentrados.politicas.js";
import type { AlimentacionActorConcentrados, AlimentacionRecetaConcentradoEntrada, AlimentacionRecetaConcentradoEdicion } from "./concentrados.types.js";
import { ObjConcentradoRecetaCrear, ObjConcentradoRecetaEditar, ObjConcentradoPrevisualizar } from "./concentrados.schemas.js";
import { Fecha_parsearFechaCivil, Fecha_formatearFechaCivil } from "../../../datetime/fecha.js";
import { Alimentacion_calcularPrevisualizacion, type AlimentacionIngredientePrevio } from "./concentrados.previsualizacion.js";

export const Alimentacion_catalogos = R.Alimentacion_catalogosConcentrados;
export const Alimentacion_buscarProductos = R.Alimentacion_productosConcentrados;
export function Alimentacion_historial(ObjConsulta: Parameters<typeof H.Alimentacion_historialConTx>[1]) {
  return R.Alimentacion_ejecutarConcentradosTx(ObjTx => H.Alimentacion_historialConTx(ObjTx, ObjConsulta));
}
export async function Alimentacion_detalleElaboracion(IntId: number) {
  const Obj = await R.Alimentacion_ejecutarConcentradosTx(ObjTx => H.Alimentacion_detallePresentacionConTx(ObjTx, IntId));
  if (!Obj) throw new ErrorAplicacion(404, "ELABORACION_NO_ENCONTRADA", "La elaboración no existe.");
  return Obj;
}
/** Consulta coherente sin app lock, reservas, auditoría ni ninguna escritura. */
export async function Alimentacion_previsualizarElaboracion(ObjDatos: unknown) {
  const ObjValidacion = ObjConcentradoPrevisualizar.safeParse(ObjDatos);
  if (!ObjValidacion.success) throw new ErrorAplicacion(400, "ELABORACION_DATOS_INVALIDOS", "Revise cantidades, fecha, unidad, versión y motivo de diferencia.");
  const ObjEntrada = ObjValidacion.data;
  return R.Alimentacion_ejecutarConcentradosTx(async ObjTx => (await Alimentacion_previsualizarConTx(ObjTx, ObjEntrada)).ObjPrevia);
}
export async function Alimentacion_previsualizarConTx(ObjTx: Prisma.TransactionClient, ObjEntrada: import("./concentrados.types.js").AlimentacionElaboracionPrevisualizacionEntrada) {
    const ObjReceta = await R.Alimentacion_detalleRecetaConTx(ObjTx, ObjEntrada.recetaId);
    if (!ObjReceta) throw new ErrorAplicacion(404, "RECETA_NO_ENCONTRADA", "La receta no existe.");
    if (ObjReceta.version !== ObjEntrada.versionReceta) throw new ErrorAplicacion(409, "CONCENTRADOS_VERSION_CAMBIADA", "La receta cambió. Solicite una nueva vista previa.");
    if (!ObjReceta.activo || !ObjReceta.detalles.length) throw new ErrorAplicacion(409, "RECETA_INVALIDA", "La receta debe estar activa y contener ingredientes.");
    const ObjConcentrado = await R.Alimentacion_concentradoConTx(ObjTx, ObjReceta.concentradoId);
    if (!ObjConcentrado?.activo) throw new ErrorAplicacion(409, "CONCENTRADO_INACTIVO", "El concentrado está inactivo.");
    const ObjProducto = await Alimentacion_exigirProductoMasa(ObjTx, ObjReceta.productoId);
    if (!ObjProducto.manejaLotes) throw new ErrorAplicacion(409, "CONCENTRADO_PRODUCTO_INVALIDO", "El producto terminado debe manejar lotes.");
    const ObjDestino = await R.Alimentacion_destinoPrevisualizacionConTx(ObjTx, ObjEntrada.inventarioDestinoId);
    if (!ObjDestino?.activo) throw new ErrorAplicacion(409, "ELABORACION_DESTINO_INVALIDO", "El almacén de destino no existe o está inactivo.");
    const ArrUnidades = await R.Alimentacion_unidadesExactasConTx(ObjTx);
    function Alimentacion_factor(StrUnidad: string) {
      const ObjUnidad = ArrUnidades.find(Obj => Obj.codigo === StrUnidad);
      if (!ObjUnidad?.activo || ObjUnidad.dimension !== "PESO" || !new Prisma.Decimal(ObjUnidad.factor).gt(0)) {
        throw new ErrorAplicacion(409, "CONCENTRADOS_UNIDAD_INVALIDA", "Todas las unidades deben ser de masa y estar activas.");
      }
      return ObjUnidad.factor;
    }
    const DtDia = Fecha_parsearFechaCivil(ObjEntrada.fechaEfectiva.slice(0, 10));
    const ArrIngredientes: AlimentacionIngredientePrevio[] = [];
    for (const ObjDetalle of ObjReceta.detalles) {
      const ObjIngrediente = await R.Alimentacion_productoConTx(ObjTx, ObjDetalle.productoId);
      if (!ObjIngrediente) throw new ErrorAplicacion(409, "CONCENTRADOS_PRODUCTO_INVALIDO", "Un ingrediente no existe.");
      const BoolUtilizable = ObjIngrediente.activo && ObjIngrediente.manejaLotes && (ObjIngrediente.concentrado?.activo ?? true);
      const ArrFuentes = BoolUtilizable ? await R.Alimentacion_fuentesPrevisualizacionConTx(ObjTx, ObjDetalle.productoId, DtDia) : [];
      ArrIngredientes.push({ productoId: ObjIngrediente.productoId, codigo: ObjIngrediente.codigo, nombre: ObjIngrediente.nombre,
        unidadBase: ObjIngrediente.unidadMedida, cantidadReceta: ObjDetalle.cantidad.toString(), unidadReceta: ObjDetalle.unidadMedida,
        factorReceta: Alimentacion_factor(ObjDetalle.unidadMedida), factorBase: Alimentacion_factor(ObjIngrediente.unidadMedida),
        fuentes: ArrFuentes.map(Obj => ({ ...Obj, fechaVencimiento: Obj.fechaVencimiento ? Fecha_formatearFechaCivil(Obj.fechaVencimiento) : null })) });
    }
    const ObjContexto = {
      receta: { recetaId: ObjReceta.recetaId, version: ObjReceta.version, nombre: ObjReceta.nombre,
        cantidadBase: ObjReceta.cantidadBase.toString(), unidadBase: ObjReceta.unidadBase, factor: Alimentacion_factor(ObjReceta.unidadBase) },
      producto: { productoId: ObjProducto.productoId, codigo: ObjProducto.codigo, nombre: ObjProducto.nombre,
        unidadBase: ObjProducto.unidadMedida, factor: Alimentacion_factor(ObjProducto.unidadMedida) },
      destino: { inventarioId: ObjDestino.inventarioId, codigo: ObjDestino.codigo, nombre: ObjDestino.nombre },
      factorCaptura: Alimentacion_factor(ObjEntrada.unidadCaptura), ingredientes: ArrIngredientes,
    };
    return { ObjPrevia: Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto), ObjContexto };
}

export async function Alimentacion_obtenerConcentrado(IntConcentradoId: number) {
  const ObjConcentrado = await R.Alimentacion_obtenerConcentrado(IntConcentradoId);
  if (!ObjConcentrado) throw new ErrorAplicacion(404, "CONCENTRADO_NO_ENCONTRADO", "El concentrado no existe.");
  return ObjConcentrado;
}

async function Alimentacion_operar<T>(Alimentacion_operacion: (ObjTx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  try {
    return await R.Alimentacion_ejecutarConcentradosTx(async ObjTx => {
      await R.Alimentacion_bloquearGrafoConTx(ObjTx);
      return Alimentacion_operacion(ObjTx);
    });
  } catch (ObjError) {
    if (ObjError instanceof ErrorAplicacion) throw ObjError;
    if (ObjError instanceof Error && ["CONCENTRADOS_VERSION_CAMBIADA", "CONCENTRADOS_CONCURRENCIA"].includes(ObjError.message)) {
      throw new ErrorAplicacion(409, ObjError.message, "Los datos cambiaron o están siendo modificados. Recargue y vuelva a intentar.");
    }
    if (ObjError instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(ObjError.code)) {
      throw new ErrorAplicacion(409, "CONCENTRADOS_CONFLICTO", "El registro ya existe o fue modificado concurrentemente.");
    }
    throw ObjError;
  }
}
async function Alimentacion_exigirProductoMasa(ObjTx: Prisma.TransactionClient, IntProductoId: number) {
  const ObjProducto = await R.Alimentacion_productoConTx(ObjTx, IntProductoId);
  if (!ObjProducto) throw new ErrorAplicacion(404, "PRODUCTO_NO_ENCONTRADO", "El producto no existe.");
  if (!ObjProducto.activo || !ObjProducto.unidad.activo || ObjProducto.unidad.dimension !== "PESO" || !ObjProducto.unidad.factorReferencia.gt(0)) {
    throw new ErrorAplicacion(409, "CONCENTRADOS_PRODUCTO_INVALIDO", "El producto debe estar activo y utilizar una unidad de masa activa del catálogo.");
  }
  return ObjProducto;
}
async function Alimentacion_exigirUnidadMasa(ObjTx: Prisma.TransactionClient, StrUnidad: string) {
  const ObjUnidad = await R.Alimentacion_unidadConTx(ObjTx, StrUnidad);
  if (!ObjUnidad?.activo || ObjUnidad.dimension !== "PESO" || !ObjUnidad.factorReferencia.gt(0)) {
    throw new ErrorAplicacion(409, "CONCENTRADOS_UNIDAD_INVALIDA", "La unidad debe ser de masa y estar activa en el catálogo.");
  }
}
async function Alimentacion_validarGrafo(ObjTx: Prisma.TransactionClient, IntRecetaSustituida?: number,
  ObjNueva?: { IntProductoTerminadoId: number; ArrIngredientesIds: number[] }) {
  const ArrRecetas = await R.Alimentacion_grafoConTx(ObjTx);
  const ArrGrafo = ArrRecetas.filter(ObjReceta => ObjReceta.recetaId !== IntRecetaSustituida)
    .map(ObjReceta => ({ IntProductoTerminadoId: ObjReceta.productoId, ArrIngredientesIds: ObjReceta.detalles.map(ObjDetalle => ObjDetalle.productoId) }));
  if (ObjNueva) ArrGrafo.push(ObjNueva);
  Alimentacion_exigirGrafoSinCiclos(ArrGrafo);
}
async function Alimentacion_validarReceta(ObjTx: Prisma.TransactionClient, ObjEntrada: AlimentacionRecetaConcentradoEntrada) {
  const ObjConcentrado = await R.Alimentacion_concentradoConTx(ObjTx, ObjEntrada.concentradoId);
  if (!ObjConcentrado?.activo) throw new ErrorAplicacion(409, "CONCENTRADO_INACTIVO", "El concentrado no existe o está inactivo.");
  await Alimentacion_exigirProductoMasa(ObjTx, ObjConcentrado.productoId);
  await Alimentacion_exigirUnidadMasa(ObjTx, ObjEntrada.unidadBase);
  for (const ObjDetalle of ObjEntrada.detalles) {
    const ObjProducto = await Alimentacion_exigirProductoMasa(ObjTx, ObjDetalle.productoId);
    if (ObjProducto.concentrado && !ObjProducto.concentrado.activo) throw new ErrorAplicacion(409, "CONCENTRADO_INGREDIENTE_INACTIVO", "Un concentrado ingrediente está inactivo.");
    await Alimentacion_exigirUnidadMasa(ObjTx, ObjDetalle.unidadMedida);
  }
  return ObjConcentrado;
}
export function Alimentacion_clasificarConcentrado(IntProductoId: number, ObjActor: AlimentacionActorConcentrados) {
  return Alimentacion_operar(async ObjTx => {
    const ObjProducto = await Alimentacion_exigirProductoMasa(ObjTx, IntProductoId);
    if (ObjProducto.concentrado) throw new ErrorAplicacion(409, "CONCENTRADO_EXISTENTE", "El producto ya está clasificado como concentrado.");
    await Alimentacion_validarGrafo(ObjTx);
    const ObjRegistro = await R.Alimentacion_clasificarConTx(ObjTx, IntProductoId, ObjActor.IntUsuarioId);
    await R.Alimentacion_auditarConTx(ObjTx, ObjActor.IntUsuarioId, "CONCENTRADO_CLASIFICADO", `Producto ${IntProductoId}.`, ObjActor.StrIp);
    return ObjRegistro;
  });
}
export function Alimentacion_cambiarEstadoConcentrado(IntId: number, BoolActivo: boolean, ObjActor: AlimentacionActorConcentrados) {
  return Alimentacion_operar(async ObjTx => {
    const ObjRegistro = await R.Alimentacion_concentradoConTx(ObjTx, IntId);
    if (!ObjRegistro) throw new ErrorAplicacion(404, "CONCENTRADO_NO_ENCONTRADO", "El concentrado no existe.");
    if (BoolActivo) { await Alimentacion_exigirProductoMasa(ObjTx, ObjRegistro.productoId); await Alimentacion_validarGrafo(ObjTx); }
    const ObjResultado = await R.Alimentacion_estadoConcentradoConTx(ObjTx, IntId, BoolActivo);
    await R.Alimentacion_auditarConTx(ObjTx, ObjActor.IntUsuarioId, "CONCENTRADO_ESTADO", `Concentrado ${IntId}; activo ${BoolActivo}.`, ObjActor.StrIp);
    return ObjResultado;
  });
}
export function Alimentacion_crearRecetaConcentrado(ObjEntrada: AlimentacionRecetaConcentradoEntrada, ObjActor: AlimentacionActorConcentrados) {
  if (!ObjConcentradoRecetaCrear.safeParse(ObjEntrada).success) throw new ErrorAplicacion(400, "RECETA_DATOS_INVALIDOS", "Revise cantidades, unidades e ingredientes repetidos.");
  return Alimentacion_operar(async ObjTx => {
    const ObjConcentrado = await Alimentacion_validarReceta(ObjTx, ObjEntrada);
    await Alimentacion_validarGrafo(ObjTx, undefined, { IntProductoTerminadoId: ObjConcentrado.productoId, ArrIngredientesIds: ObjEntrada.detalles.map(ObjDetalle => ObjDetalle.productoId) });
    const ObjReceta = await R.Alimentacion_guardarRecetaConTx(ObjTx, null, ObjConcentrado.productoId, ObjEntrada, ObjActor.IntUsuarioId);
    await R.Alimentacion_auditarConTx(ObjTx, ObjActor.IntUsuarioId, "RECETA_CONCENTRADO_CREADA", `Receta ${ObjReceta.recetaId}; version 1.`, ObjActor.StrIp);
    return ObjReceta;
  });
}
export function Alimentacion_editarRecetaConcentrado(IntId: number, ObjEntrada: AlimentacionRecetaConcentradoEdicion, ObjActor: AlimentacionActorConcentrados) {
  if (!ObjConcentradoRecetaEditar.safeParse(ObjEntrada).success) throw new ErrorAplicacion(400, "RECETA_DATOS_INVALIDOS", "Revise cantidades, unidades, ingredientes y versión.");
  return Alimentacion_operar(async ObjTx => {
    const ObjActual = await R.Alimentacion_recetaConTx(ObjTx, IntId);
    if (!ObjActual) throw new ErrorAplicacion(404, "RECETA_NO_ENCONTRADA", "La receta no existe.");
    if (ObjActual.version !== ObjEntrada.versionEsperada) throw new Error("CONCENTRADOS_VERSION_CAMBIADA");
    if (ObjActual.concentradoId !== ObjEntrada.concentradoId) throw new ErrorAplicacion(409, "RECETA_DESTINO_INMUTABLE", "Cree otra receta para un concentrado diferente.");
    const ObjConcentrado = await Alimentacion_validarReceta(ObjTx, ObjEntrada);
    await Alimentacion_validarGrafo(ObjTx, IntId, { IntProductoTerminadoId: ObjConcentrado.productoId, ArrIngredientesIds: ObjEntrada.detalles.map(ObjDetalle => ObjDetalle.productoId) });
    const ObjReceta = await R.Alimentacion_guardarRecetaConTx(ObjTx, IntId, ObjConcentrado.productoId, ObjEntrada, ObjActor.IntUsuarioId, ObjEntrada.versionEsperada);
    await R.Alimentacion_auditarConTx(ObjTx, ObjActor.IntUsuarioId, "RECETA_CONCENTRADO_EDITADA", `Receta ${IntId}; version ${ObjReceta.version}.`, ObjActor.StrIp);
    return ObjReceta;
  });
}
export function Alimentacion_cambiarEstadoReceta(IntId: number, IntVersion: number, BoolActivo: boolean, ObjActor: AlimentacionActorConcentrados) {
  return Alimentacion_operar(async ObjTx => {
    const ObjActual = await R.Alimentacion_recetaConTx(ObjTx, IntId);
    if (!ObjActual) throw new ErrorAplicacion(404, "RECETA_NO_ENCONTRADA", "La receta no existe.");
    if (ObjActual.version !== IntVersion) throw new Error("CONCENTRADOS_VERSION_CAMBIADA");
    if (BoolActivo) {
      const ArrGrafo = await R.Alimentacion_grafoConTx(ObjTx);
      const ObjReceta = ArrGrafo.find(ObjRegistro => ObjRegistro.recetaId === IntId)!;
      // Recuperar unidades/cantidades actuales desde el mismo TransactionClient.
      const ObjCompleta = await R.Alimentacion_detalleRecetaConTx(ObjTx, IntId);
      if (!ObjCompleta || ObjReceta.detalles.length === 0) throw new ErrorAplicacion(409, "RECETA_INVALIDA", "La receta no tiene ingredientes.");
      await Alimentacion_validarReceta(ObjTx, { concentradoId: ObjActual.concentradoId, nombre: ObjActual.nombre,
        cantidadBase: ObjActual.cantidadBase.toString(), unidadBase: ObjActual.unidadBase as AlimentacionRecetaConcentradoEntrada["unidadBase"],
        detalles: ObjCompleta.detalles.map(ObjDetalle => ({ productoId: ObjDetalle.productoId, cantidad: ObjDetalle.cantidad.toString(), unidadMedida: ObjDetalle.unidadMedida as AlimentacionRecetaConcentradoEntrada["unidadBase"] })) });
      await Alimentacion_validarGrafo(ObjTx);
    }
    const ObjResultado = await R.Alimentacion_estadoRecetaConTx(ObjTx, IntId, IntVersion, BoolActivo, ObjActor.IntUsuarioId);
    await R.Alimentacion_auditarConTx(ObjTx, ObjActor.IntUsuarioId, "RECETA_CONCENTRADO_ESTADO", `Receta ${IntId}; activo ${BoolActivo}; version ${ObjResultado.version}.`, ObjActor.StrIp);
    return ObjResultado;
  });
}
export const Alimentacion_listarConcentrados = R.Alimentacion_listarConcentrados;
export const Alimentacion_listarRecetas = R.Alimentacion_listarRecetas;
export async function Alimentacion_obtenerReceta(IntId: number) {
  const ObjReceta = await R.Alimentacion_obtenerReceta(IntId);
  if (!ObjReceta) throw new ErrorAplicacion(404, "RECETA_NO_ENCONTRADA", "La receta no existe.");
  return ObjReceta;
}
