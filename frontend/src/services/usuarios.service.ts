import { Api_solicitar } from "./api.service";
import type { ConsultaUsuarios, DatosCrearUsuario, DatosEditarUsuario, EstadoAcceso, EstadoUsuario, RespuestaDetalleAccesos, RespuestaListadoAccesos, RespuestaListadoUsuarios, RespuestaRoles, RespuestaUsuario } from "../types/usuarios.types";

export function Usuarios_listar(ObjConsulta: ConsultaUsuarios): Promise<RespuestaListadoUsuarios> {
  const ObjParametros = new URLSearchParams({ pagina: String(ObjConsulta.pagina), limite: String(ObjConsulta.limite) });
  if (ObjConsulta.busqueda) ObjParametros.set("busqueda", ObjConsulta.busqueda);
  if (ObjConsulta.estado) ObjParametros.set("estado", ObjConsulta.estado);
  if (ObjConsulta.rolId) ObjParametros.set("rolId", String(ObjConsulta.rolId));
  return Api_solicitar<RespuestaListadoUsuarios>(`/api/usuarios?${ObjParametros.toString()}`);
}

export function Usuarios_obtenerRoles(): Promise<RespuestaRoles> {
  return Api_solicitar<RespuestaRoles>("/api/usuarios/roles");
}

export function Usuarios_crear(ObjDatos: DatosCrearUsuario): Promise<RespuestaUsuario> {
  return Api_solicitar<RespuestaUsuario>("/api/usuarios", { method: "POST", ObjCuerpo: ObjDatos });
}

export function Usuarios_editar(IntUsuarioId: number, ObjDatos: DatosEditarUsuario): Promise<RespuestaUsuario> {
  return Api_solicitar<RespuestaUsuario>(`/api/usuarios/${IntUsuarioId}`, { method: "PATCH", ObjCuerpo: ObjDatos });
}

export function Usuarios_cambiarEstado(IntUsuarioId: number, StrEstado: EstadoUsuario): Promise<RespuestaUsuario> {
  return Api_solicitar<RespuestaUsuario>(`/api/usuarios/${IntUsuarioId}/estado`, { method: "PATCH", ObjCuerpo: { estado: StrEstado } });
}

export function Usuarios_cambiarRol(IntUsuarioId: number, IntRolId: number): Promise<RespuestaUsuario> {
  return Api_solicitar<RespuestaUsuario>(`/api/usuarios/${IntUsuarioId}/rol`, { method: "PATCH", ObjCuerpo: { rolId: IntRolId } });
}

export function Usuarios_revocarSesiones(IntUsuarioId: number): Promise<void> {
  return Api_solicitar<void>(`/api/usuarios/${IntUsuarioId}/sesiones/revocar`, { method: "POST" });
}
export function Usuarios_listarAccesos(StrBusqueda = ""): Promise<RespuestaListadoAccesos> { return Api_solicitar(`/api/usuarios/accesos?pagina=1&limite=50&busqueda=${encodeURIComponent(StrBusqueda)}`); }
export function Usuarios_obtenerAccesos(IntUsuarioId: number): Promise<RespuestaDetalleAccesos> { return Api_solicitar(`/api/usuarios/${IntUsuarioId}/accesos`); }
export function Usuarios_actualizarAccesos(IntUsuarioId: number, ObjDatos: { versionAccesos: number; rolId: number; cambios: Array<{ permisoId: number; estado: EstadoAcceso }> }): Promise<RespuestaDetalleAccesos> { return Api_solicitar(`/api/usuarios/${IntUsuarioId}/accesos`, { method: "PATCH", ObjCuerpo: ObjDatos }); }
