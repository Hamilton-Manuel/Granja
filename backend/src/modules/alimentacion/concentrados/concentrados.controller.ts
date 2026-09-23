import type { Request, Response } from "express";
import { ErrorAplicacion } from "../../../errors/error-aplicacion.js";
import { ObjConcentradoParametro } from "./concentrados.schemas.js";
import { Alimentacion_obtenerConcentrado as Alimentacion_consultarConcentrado } from "./concentrados.service.js";
import { z } from "zod";
import * as E from "./concentrados.schemas.js";
import * as S from "./concentrados.service.js";
import { Alimentacion_confirmarElaboracion as Alimentacion_confirmar } from "./concentrados.elaboraciones.service.js";
import { Alimentacion_formatearRespuesta } from "../alimentacion.service.js";
import * as V from "./concentrados.reversion.service.js";

function Alimentacion_validar<T>(ObjEsquema: z.ZodType<T>, ObjEntrada: unknown): T {
  const ObjResultado = ObjEsquema.safeParse(ObjEntrada);
  if (!ObjResultado.success) throw new ErrorAplicacion(400, "VALIDACION_INVALIDA", "Los datos de concentrados no son válidos.");
  return ObjResultado.data;
}
function Alimentacion_actor(ObjReq: Request) {
  if (!ObjReq.ObjAutenticacion) throw new ErrorAplicacion(401, "NO_AUTENTICADO", "Debe iniciar sesión.");
  return { IntUsuarioId: ObjReq.ObjAutenticacion.IntUsuarioId, ...(ObjReq.ip ? { StrIp: ObjReq.ip } : {}) };
}

export async function Alimentacion_obtenerConcentrado(ObjReq: Request, ObjRes: Response) {
  const ObjResultado = ObjConcentradoParametro.safeParse(ObjReq.params);
  if (!ObjResultado.success) throw new ErrorAplicacion(400, "VALIDACION_INVALIDA", "Identificador de concentrado inválido.");
  ObjRes.json({ datos: await Alimentacion_consultarConcentrado(ObjResultado.data.concentradoId) });
}
export async function Alimentacion_listarConcentrados(ObjReq: Request, ObjRes: Response) {
  ObjRes.json(await S.Alimentacion_listarConcentrados(Alimentacion_validar(E.ObjConcentradoConsulta, ObjReq.query)));
}
export async function Alimentacion_catalogos(_ObjReq: Request, ObjRes: Response) {
  ObjRes.json({ datos: await S.Alimentacion_catalogos() });
}
export async function Alimentacion_productos(ObjReq: Request, ObjRes: Response) {
  const Obj = Alimentacion_validar(E.ObjConcentradoConsulta, ObjReq.query);
  ObjRes.json({ datos: await S.Alimentacion_buscarProductos(Obj.busqueda ?? "") });
}
export async function Alimentacion_historial(ObjReq: Request, ObjRes: Response) {
  ObjRes.json(await S.Alimentacion_historial(Alimentacion_validar(E.ObjConcentradoConsulta, ObjReq.query)));
}
export async function Alimentacion_detalleElaboracion(ObjReq: Request, ObjRes: Response) {
  const Obj = Alimentacion_validar(E.ObjConcentradoElaboracionParametro, ObjReq.params);
  ObjRes.json({ datos: await S.Alimentacion_detalleElaboracion(Obj.elaboracionId) });
}
export async function Alimentacion_clasificarConcentrado(ObjReq: Request, ObjRes: Response) {
  const ObjEntrada = Alimentacion_validar(E.ObjConcentradoCrear, ObjReq.body);
  ObjRes.status(201).json({ datos: await S.Alimentacion_clasificarConcentrado(ObjEntrada.productoId, Alimentacion_actor(ObjReq)) });
}
export async function Alimentacion_estadoConcentrado(ObjReq: Request, ObjRes: Response) {
  const ObjParametro = Alimentacion_validar(E.ObjConcentradoParametro, ObjReq.params);
  const ObjEntrada = Alimentacion_validar(E.ObjConcentradoEstado, ObjReq.body);
  ObjRes.json({ datos: await S.Alimentacion_cambiarEstadoConcentrado(ObjParametro.concentradoId, ObjEntrada.activo, Alimentacion_actor(ObjReq)) });
}
export async function Alimentacion_listarRecetas(ObjReq: Request, ObjRes: Response) {
  ObjRes.json(await S.Alimentacion_listarRecetas(Alimentacion_validar(E.ObjConcentradoConsulta, ObjReq.query)));
}
export async function Alimentacion_obtenerReceta(ObjReq: Request, ObjRes: Response) {
  const ObjParametro = Alimentacion_validar(E.ObjConcentradoRecetaParametro, ObjReq.params);
  ObjRes.json({ datos: await S.Alimentacion_obtenerReceta(ObjParametro.recetaId) });
}
export async function Alimentacion_crearReceta(ObjReq: Request, ObjRes: Response) {
  ObjRes.status(201).json({ datos: await S.Alimentacion_crearRecetaConcentrado(Alimentacion_validar(E.ObjConcentradoRecetaCrear, ObjReq.body), Alimentacion_actor(ObjReq)) });
}
export async function Alimentacion_editarReceta(ObjReq: Request, ObjRes: Response) {
  const ObjParametro = Alimentacion_validar(E.ObjConcentradoRecetaParametro, ObjReq.params);
  ObjRes.json({ datos: await S.Alimentacion_editarRecetaConcentrado(ObjParametro.recetaId, Alimentacion_validar(E.ObjConcentradoRecetaEditar, ObjReq.body), Alimentacion_actor(ObjReq)) });
}
export async function Alimentacion_estadoReceta(ObjReq: Request, ObjRes: Response) {
  const ObjParametro = Alimentacion_validar(E.ObjConcentradoRecetaParametro, ObjReq.params);
  const ObjEntrada = Alimentacion_validar(E.ObjConcentradoRecetaEstado, ObjReq.body);
  ObjRes.json({ datos: await S.Alimentacion_cambiarEstadoReceta(ObjParametro.recetaId, ObjEntrada.versionEsperada, ObjEntrada.activo, Alimentacion_actor(ObjReq)) });
}

export async function Alimentacion_previsualizarElaboracion(ObjReq: Request, ObjRes: Response) {
  ObjRes.json({ datos: await S.Alimentacion_previsualizarElaboracion(Alimentacion_validar(E.ObjConcentradoPrevisualizar, ObjReq.body)) });
}
export async function Alimentacion_confirmarElaboracion(ObjReq: Request, ObjRes: Response) {
  const ObjResultado = await Alimentacion_confirmar(ObjReq.body, Alimentacion_actor(ObjReq));
  ObjRes.status(ObjResultado.reutilizada ? 200 : 201).json(Alimentacion_formatearRespuesta(ObjResultado));
}
export async function Alimentacion_consultarDependencias(ObjReq: Request, ObjRes: Response) {
  const ObjParametro = Alimentacion_validar(E.ObjConcentradoElaboracionParametro, ObjReq.params);
  ObjRes.json({ datos: Alimentacion_formatearRespuesta(await V.Alimentacion_consultarDependencias(ObjParametro.elaboracionId, Alimentacion_actor(ObjReq))) });
}
export async function Alimentacion_revertirElaboracion(ObjReq: Request, ObjRes: Response) {
  const ObjParametro = Alimentacion_validar(E.ObjConcentradoElaboracionParametro, ObjReq.params);
  try {
    ObjRes.json(Alimentacion_formatearRespuesta(await V.Alimentacion_revertirElaboracion(ObjParametro.elaboracionId, ObjReq.body, Alimentacion_actor(ObjReq))));
  } catch (ObjError) {
    if (!(ObjError instanceof V.AlimentacionReversionBloqueada)) throw ObjError;
    ObjRes.status(409).json({ error: { codigo: ObjError.StrCodigo, mensaje: ObjError.message }, datos: Alimentacion_formatearRespuesta(ObjError.ObjDiagnostico) });
  }
}
