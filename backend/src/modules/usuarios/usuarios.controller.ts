import type { Request, Response } from "express";
import type { ZodType } from "zod";

import { Autenticacion_crearCookieEliminada, Autenticacion_crearCookieSesion } from "../../auth/autenticacion.js";
import { Configuracion_obtenerEntorno } from "../../config/configuracion-entorno.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import * as ObjEsquemas from "./usuarios.schemas.js";
import * as ObjServicio from "./usuarios.service.js";

function Usuarios_validarEntrada<T>(ObjEsquema: ZodType<T>, ObjValor: unknown): T {
  const ObjResultado = ObjEsquema.safeParse(ObjValor);
  if (!ObjResultado.success) {
    throw new ErrorAplicacion(400, "VALIDACION_INVALIDA", "Los datos proporcionados no son válidos.");
  }
  return ObjResultado.data;
}

function Usuarios_obtenerAutenticacion(ObjSolicitud: Request) {
  if (ObjSolicitud.ObjAutenticacion === undefined) {
    throw new ErrorAplicacion(401, "NO_AUTENTICADO", "Debe iniciar sesión.");
  }
  return ObjSolicitud.ObjAutenticacion;
}

function Usuarios_esProduccion(): boolean {
  return Configuracion_obtenerEntorno().NODE_ENV === "production";
}

export async function Usuarios_iniciarSesion(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  ObjRespuesta.setHeader("Cache-Control", "no-store");
  const ObjDatos = Usuarios_validarEntrada(ObjEsquemas.ObjLoginUsuario, ObjSolicitud.body);
  const ObjResultado = await ObjServicio.Usuarios_iniciarSesion(ObjDatos.identificador, ObjDatos.contrasena, ObjSolicitud.ip);
  ObjRespuesta.setHeader("Set-Cookie", Autenticacion_crearCookieSesion(ObjResultado.StrToken, ObjResultado.DtFechaExpiracion, Usuarios_esProduccion()));
  ObjRespuesta.status(200).json({ datos: { usuario: ObjResultado.ObjUsuario, sesion: { fechaExpiracion: ObjResultado.StrFechaExpiracion } } });
}

export async function Usuarios_cerrarSesion(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  const ObjAutenticacion = Usuarios_obtenerAutenticacion(ObjSolicitud);
  await ObjServicio.Usuarios_cerrarSesion(ObjAutenticacion.IntSesionId, ObjAutenticacion.IntUsuarioId, ObjSolicitud.ip);
  ObjRespuesta.setHeader("Cache-Control", "no-store");
  ObjRespuesta.setHeader("Set-Cookie", Autenticacion_crearCookieEliminada(Usuarios_esProduccion()));
  ObjRespuesta.status(204).end();
}

export async function Usuarios_obtenerSesion(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  const ObjAutenticacion = Usuarios_obtenerAutenticacion(ObjSolicitud);
  const ObjUsuario = await ObjServicio.Usuarios_obtenerSesionActual(ObjAutenticacion.IntUsuarioId);
  ObjRespuesta.setHeader("Cache-Control", "no-store");
  ObjRespuesta.status(200).json({ datos: { usuario: ObjUsuario } });
}

export async function Usuarios_listar(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  const ObjConsulta = Usuarios_validarEntrada(ObjEsquemas.ObjConsultaUsuarios, ObjSolicitud.query);
  const ObjResultado = await ObjServicio.Usuarios_listar({ IntPagina: ObjConsulta.pagina, IntLimite: ObjConsulta.limite, StrBusqueda: ObjConsulta.busqueda, StrEstado: ObjConsulta.estado, IntRolId: ObjConsulta.rolId });
  ObjRespuesta.json({ datos: ObjResultado.ArrUsuarios, paginacion: { pagina: ObjConsulta.pagina, limite: ObjConsulta.limite, total: ObjResultado.IntTotal } });
}

export async function Usuarios_obtenerPorId(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  const ObjParametro = Usuarios_validarEntrada(ObjEsquemas.ObjParametroUsuario, ObjSolicitud.params);
  ObjRespuesta.json({ datos: await ObjServicio.Usuarios_obtenerPorId(ObjParametro.usuarioId) });
}

export async function Usuarios_crear(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  const ObjDatos = Usuarios_validarEntrada(ObjEsquemas.ObjCrearUsuario, ObjSolicitud.body);
  const ObjActor = Usuarios_obtenerAutenticacion(ObjSolicitud);
  const ObjUsuario = await ObjServicio.Usuarios_crear({ IntRolId: ObjDatos.rolId, StrNombreCompleto: ObjDatos.nombreCompleto, StrNombreUsuario: ObjDatos.nombreUsuario, StrCorreo: ObjDatos.correo, StrContrasenaHash: ObjDatos.contrasena, IntUsuarioActorId: ObjActor.IntUsuarioId, StrDireccionIp: ObjSolicitud.ip });
  ObjRespuesta.status(201).json({ datos: ObjUsuario });
}

export async function Usuarios_editar(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  const ObjParametro = Usuarios_validarEntrada(ObjEsquemas.ObjParametroUsuario, ObjSolicitud.params);
  const ObjDatos = Usuarios_validarEntrada(ObjEsquemas.ObjEditarUsuario, ObjSolicitud.body);
  const ObjActor = Usuarios_obtenerAutenticacion(ObjSolicitud);
  const ObjUsuario = await ObjServicio.Usuarios_editar({ IntUsuarioId: ObjParametro.usuarioId, StrNombreCompleto: ObjDatos.nombreCompleto, StrNombreUsuario: ObjDatos.nombreUsuario, StrCorreo: ObjDatos.correo, IntUsuarioActorId: ObjActor.IntUsuarioId, StrDireccionIp: ObjSolicitud.ip });
  ObjRespuesta.json({ datos: ObjUsuario });
}

export async function Usuarios_cambiarEstado(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  const ObjParametro = Usuarios_validarEntrada(ObjEsquemas.ObjParametroUsuario, ObjSolicitud.params);
  const ObjDatos = Usuarios_validarEntrada(ObjEsquemas.ObjCambiarEstadoUsuario, ObjSolicitud.body);
  const ObjActor = Usuarios_obtenerAutenticacion(ObjSolicitud);
  const ObjUsuario = await ObjServicio.Usuarios_cambiarEstado({ IntUsuarioId: ObjParametro.usuarioId, StrEstado: ObjDatos.estado, IntUsuarioActorId: ObjActor.IntUsuarioId, StrDireccionIp: ObjSolicitud.ip });
  ObjRespuesta.json({ datos: ObjUsuario });
}

export async function Usuarios_cambiarRol(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  const ObjParametro = Usuarios_validarEntrada(ObjEsquemas.ObjParametroUsuario, ObjSolicitud.params);
  const ObjDatos = Usuarios_validarEntrada(ObjEsquemas.ObjCambiarRolUsuario, ObjSolicitud.body);
  const ObjActor = Usuarios_obtenerAutenticacion(ObjSolicitud);
  const ObjUsuario = await ObjServicio.Usuarios_cambiarRol({ IntUsuarioId: ObjParametro.usuarioId, IntRolId: ObjDatos.rolId, IntUsuarioActorId: ObjActor.IntUsuarioId, StrDireccionIp: ObjSolicitud.ip });
  ObjRespuesta.json({ datos: ObjUsuario });
}

export async function Usuarios_cambiarContrasena(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  const ObjDatos = Usuarios_validarEntrada(ObjEsquemas.ObjCambiarContrasena, ObjSolicitud.body);
  const ObjActor = Usuarios_obtenerAutenticacion(ObjSolicitud);
  await ObjServicio.Usuarios_cambiarContrasena({ IntUsuarioId: ObjActor.IntUsuarioId, StrContrasenaActual: ObjDatos.contrasenaActual, StrContrasenaNueva: ObjDatos.contrasenaNueva, StrDireccionIp: ObjSolicitud.ip });
  ObjRespuesta.setHeader("Cache-Control", "no-store");
  ObjRespuesta.setHeader("Set-Cookie", Autenticacion_crearCookieEliminada(Usuarios_esProduccion()));
  ObjRespuesta.status(204).end();
}

export async function Usuarios_obtenerRoles(_ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  ObjRespuesta.json({ datos: await ObjServicio.Usuarios_obtenerRoles() });
}

export async function Usuarios_obtenerPermisos(_ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  ObjRespuesta.json({ datos: await ObjServicio.Usuarios_obtenerPermisos() });
}

export async function Usuarios_revocarSesiones(ObjSolicitud: Request, ObjRespuesta: Response): Promise<void> {
  const ObjParametro = Usuarios_validarEntrada(ObjEsquemas.ObjParametroUsuario, ObjSolicitud.params);
  const ObjActor = Usuarios_obtenerAutenticacion(ObjSolicitud);
  await ObjServicio.Usuarios_revocarSesiones({ IntUsuarioId: ObjParametro.usuarioId, IntUsuarioActorId: ObjActor.IntUsuarioId, StrDireccionIp: ObjSolicitud.ip });
  ObjRespuesta.status(204).end();
}
