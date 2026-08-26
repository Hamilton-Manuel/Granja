import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { Fecha_parsearFechaCivil } from "../../datetime/fecha.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import * as VentasServicio from "./ventas.service.js";
import * as VentasEsquemas from "./ventas.schemas.js";

function Ventas_validar<T>(ObjEsquema: z.ZodType<T>, ObjValor: unknown): T {
  const ObjResultado = ObjEsquema.safeParse(ObjValor);
  if (!ObjResultado.success) throw new ErrorAplicacion(400, "VALIDACION_INVALIDA", "Los datos proporcionados no son válidos.");
  return ObjResultado.data;
}

function Ventas_actor(Req: Request) {
  if (!Req.ObjAutenticacion) throw new Error("NO_AUTENTICADO");
  return { IntUsuarioId: Req.ObjAutenticacion.IntUsuarioId, ...(Req.ip === undefined ? {} : { StrIp: Req.ip }) };
}

export async function Ventas_listar(Req: Request, Res: Response, Next: NextFunction) {
  try {
    const ObjConsulta = Ventas_validar(VentasEsquemas.ObjConsultaVentas, Req.query);
    const ObjResultado = await VentasServicio.Ventas_listar({ IntPagina: ObjConsulta.pagina, IntLimite: ObjConsulta.limite,
      ...(ObjConsulta.busqueda === undefined ? {} : { StrBusqueda: ObjConsulta.busqueda }), ...(ObjConsulta.estado === undefined ? {} : { StrEstado: ObjConsulta.estado }),
      ...(ObjConsulta.clienteId === undefined ? {} : { IntClienteId: ObjConsulta.clienteId }), ...(ObjConsulta.animalIdentificacion === undefined ? {} : { StrAnimalIdentificacion: ObjConsulta.animalIdentificacion }),
      ...(ObjConsulta.loteProduccionId === undefined ? {} : { IntLoteProduccionId: ObjConsulta.loteProduccionId }), ...(ObjConsulta.formaPago === undefined ? {} : { StrFormaPago: ObjConsulta.formaPago }),
      ...(ObjConsulta.fechaDesde === undefined ? {} : { DtDesde: Fecha_parsearFechaCivil(ObjConsulta.fechaDesde) }), ...(ObjConsulta.fechaHasta === undefined ? {} : { DtHasta: Fecha_parsearFechaCivil(ObjConsulta.fechaHasta) }) });
    Res.json({ ok: true, datos: ObjResultado.datos, paginacion: { pagina: ObjConsulta.pagina, limite: ObjConsulta.limite, total: ObjResultado.total } });
  } catch (ObjError) { Next(ObjError); }
}

export async function Ventas_obtener(Req: Request, Res: Response, Next: NextFunction) {
  try { const ObjParametro = Ventas_validar(VentasEsquemas.ObjParametroVenta, Req.params); const ObjVenta = await VentasServicio.Ventas_obtener(ObjParametro.ventaId); if (!ObjVenta) throw new ErrorAplicacion(404, "VENTA_NO_ENCONTRADA", "La venta no existe."); Res.json({ ok: true, datos: ObjVenta }); } catch (ObjError) { Next(ObjError); }
}

export async function Ventas_registrar(Req: Request, Res: Response, Next: NextFunction) {
  try { const ObjCuerpo = Ventas_validar(VentasEsquemas.ObjRegistrarVenta, Req.body); Res.status(201).json({ ok: true, datos: await VentasServicio.Ventas_registrar({ ...ObjCuerpo, ...Ventas_actor(Req) }) }); } catch (ObjError) { Next(ObjError); }
}

export async function Ventas_revertir(Req: Request, Res: Response, Next: NextFunction) {
  try { const ObjParametro = Ventas_validar(VentasEsquemas.ObjParametroVenta, Req.params); const ObjCuerpo = Ventas_validar(VentasEsquemas.ObjRevertirVenta, Req.body); const ObjActor = Ventas_actor(Req); Res.json({ ok: true, datos: await VentasServicio.Ventas_revertir(ObjParametro.ventaId, ObjCuerpo.motivo, ObjActor.IntUsuarioId, ObjActor.StrIp) }); } catch (ObjError) { Next(ObjError); }
}

export async function Ventas_clientes(Req: Request, Res: Response, Next: NextFunction) {
  try { const ObjConsulta = Ventas_validar(VentasEsquemas.ObjConsultaLookupVentas, Req.query); const ObjResultado = await VentasServicio.Ventas_buscarClientes({ IntPagina: ObjConsulta.pagina, IntLimite: ObjConsulta.limite, ...(ObjConsulta.busqueda === undefined ? {} : { StrBusqueda: ObjConsulta.busqueda }) }); Res.json({ ok: true, datos: ObjResultado.datos, paginacion: { pagina: ObjConsulta.pagina, limite: ObjConsulta.limite, total: ObjResultado.total } }); } catch (ObjError) { Next(ObjError); }
}

export async function Ventas_lotes(Req: Request, Res: Response, Next: NextFunction) {
  try { const ObjConsulta = Ventas_validar(VentasEsquemas.ObjConsultaLookupVentas, Req.query); const ObjResultado = await VentasServicio.Ventas_buscarLotes({ IntPagina: ObjConsulta.pagina, IntLimite: ObjConsulta.limite, ...(ObjConsulta.busqueda === undefined ? {} : { StrBusqueda: ObjConsulta.busqueda }) }); Res.json({ ok: true, datos: ObjResultado.datos, paginacion: { pagina: ObjConsulta.pagina, limite: ObjConsulta.limite, total: ObjResultado.total } }); } catch (ObjError) { Next(ObjError); }
}

export async function Ventas_animales(Req: Request, Res: Response, Next: NextFunction) {
  try { const ObjConsulta = Ventas_validar(VentasEsquemas.ObjConsultaAnimalesVentas, Req.query); const ObjResultado = await VentasServicio.Ventas_buscarAnimales({ IntPagina: ObjConsulta.pagina, IntLimite: ObjConsulta.limite, ...(ObjConsulta.busqueda === undefined ? {} : { StrBusqueda: ObjConsulta.busqueda }), ...(ObjConsulta.loteProduccionId === undefined ? {} : { IntLoteProduccionId: ObjConsulta.loteProduccionId }) }); Res.json({ ok: true, datos: ObjResultado.datos, paginacion: { pagina: ObjConsulta.pagina, limite: ObjConsulta.limite, total: ObjResultado.total } }); } catch (ObjError) { Next(ObjError); }
}

export async function Ventas_diagnostico(Req: Request, Res: Response, Next: NextFunction) {
  try { Ventas_validar(VentasEsquemas.ObjCuerpoVacioVentas, Req.body ?? {}); const ObjActor = Ventas_actor(Req); Res.json({ ok: true, datos: await VentasServicio.Ventas_diagnosticar(ObjActor.IntUsuarioId, ObjActor.StrIp) }); } catch (ObjError) { Next(ObjError); }
}
