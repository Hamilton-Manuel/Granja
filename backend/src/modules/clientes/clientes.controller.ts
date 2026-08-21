import type { Request, Response } from "express";
import type { ZodType } from "zod";

import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import * as ObjEsquemas from "./clientes.schemas.js";
import * as ObjServicio from "./clientes.service.js";

function Clientes_validarEntrada<T>(ObjEsquema: ZodType<T>, ObjValor: unknown): T {
  const ObjResultado = ObjEsquema.safeParse(ObjValor);
  if (!ObjResultado.success) throw new ErrorAplicacion(400, "VALIDACION_INVALIDA", "Los datos proporcionados no son validos.");
  return ObjResultado.data;
}
function Clientes_obtenerActor(ObjSolicitud: Request) {
  if (ObjSolicitud.ObjAutenticacion === undefined) throw new ErrorAplicacion(401, "NO_AUTENTICADO", "Debe iniciar sesion.");
  return ObjSolicitud.ObjAutenticacion;
}
export async function Clientes_listar(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  const ObjConsulta = Clientes_validarEntrada(ObjEsquemas.ObjConsultaClientes, ObjSolicitud.query);
  const ObjResultado = await ObjServicio.Clientes_listar({ IntPagina: ObjConsulta.pagina, IntLimite: ObjConsulta.limite, StrBusqueda: ObjConsulta.busqueda, StrEstado: ObjConsulta.estado, IntTipoClienteId: ObjConsulta.tipoClienteId });
  ObjRespuesta.json({ datos: ObjResultado.ArrClientes, paginacion: { pagina: ObjConsulta.pagina, limite: ObjConsulta.limite, total: ObjResultado.IntTotal } });
}
export async function Clientes_obtenerTipos(_ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> { ObjRespuesta.json({ datos: await ObjServicio.Clientes_obtenerTipos() }); }
export async function Clientes_obtenerPorId(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> { const ObjParametro = Clientes_validarEntrada(ObjEsquemas.ObjParametroCliente, ObjSolicitud.params); ObjRespuesta.json({ datos: await ObjServicio.Clientes_obtenerPorId(ObjParametro.clienteId) }); }
export async function Clientes_crear(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> { const ObjDatos = Clientes_validarEntrada(ObjEsquemas.ObjCrearCliente, ObjSolicitud.body); const ObjActor = Clientes_obtenerActor(ObjSolicitud); ObjRespuesta.status(201).json({ datos: await ObjServicio.Clientes_crear({ IntTipoClienteId: ObjDatos.tipoClienteId, StrNombreCompleto: ObjDatos.nombreCompleto, StrNumeroDocumento: ObjDatos.numeroDocumento, StrNit: ObjDatos.nit, StrTelefono: ObjDatos.telefono, StrCorreo: ObjDatos.correo, StrDireccion: ObjDatos.direccion, StrObservaciones: ObjDatos.observaciones, IntUsuarioActorId: ObjActor.IntUsuarioId, StrDireccionIp: ObjSolicitud.ip }) }); }
export async function Clientes_editar(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> { const ObjParametro = Clientes_validarEntrada(ObjEsquemas.ObjParametroCliente, ObjSolicitud.params); const ObjDatos = Clientes_validarEntrada(ObjEsquemas.ObjEditarCliente, ObjSolicitud.body); const ObjActor = Clientes_obtenerActor(ObjSolicitud); ObjRespuesta.json({ datos: await ObjServicio.Clientes_editar({ IntClienteId: ObjParametro.clienteId, IntTipoClienteId: ObjDatos.tipoClienteId, StrNombreCompleto: ObjDatos.nombreCompleto, StrNumeroDocumento: ObjDatos.numeroDocumento, StrNit: ObjDatos.nit, StrTelefono: ObjDatos.telefono, StrCorreo: ObjDatos.correo, StrDireccion: ObjDatos.direccion, StrObservaciones: ObjDatos.observaciones, IntUsuarioActorId: ObjActor.IntUsuarioId, StrDireccionIp: ObjSolicitud.ip }) }); }
export async function Clientes_cambiarEstado(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> { const ObjParametro = Clientes_validarEntrada(ObjEsquemas.ObjParametroCliente, ObjSolicitud.params); const ObjDatos = Clientes_validarEntrada(ObjEsquemas.ObjCambiarEstadoCliente, ObjSolicitud.body); const ObjActor = Clientes_obtenerActor(ObjSolicitud); ObjRespuesta.json({ datos: await ObjServicio.Clientes_cambiarEstado(ObjParametro.clienteId, ObjDatos.activo, ObjActor.IntUsuarioId, ObjSolicitud.ip) }); }
