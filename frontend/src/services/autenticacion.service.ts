import { Api_solicitar } from "./api.service";
import type { RespuestaLogin, RespuestaSesion } from "../types/autenticacion.types";

export function Autenticacion_consultarSesion(): Promise<RespuestaSesion> {
  return Api_solicitar<RespuestaSesion>("/api/usuarios/sesion");
}

export function Autenticacion_iniciarSesion(
  StrIdentificador: string,
  StrContrasena: string,
): Promise<RespuestaLogin> {
  return Api_solicitar<RespuestaLogin>("/api/usuarios/login", {
    method: "POST",
    ObjCuerpo: { identificador: StrIdentificador, contrasena: StrContrasena },
  });
}

export function Autenticacion_cerrarSesion(): Promise<void> {
  return Api_solicitar<void>("/api/usuarios/logout", { method: "POST" });
}
