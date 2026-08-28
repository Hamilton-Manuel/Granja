import type { NextFunction, Request, Response } from "express";

import {
  Autenticacion_hashearTokenSesion,
  Autenticacion_obtenerTokenCookie,
} from "../auth/autenticacion.js";
import { ErrorAplicacion } from "../errors/error-aplicacion.js";
import {
  Fecha_convertirAlmacenamientoGuatemalaAInstante,
  Fecha_obtenerInstanteActual,
} from "../datetime/fecha.js";
import {
  Usuarios_marcarSesionExpirada,
  Usuarios_obtenerSesionParaAutenticacion,
} from "../modules/usuarios/usuarios.repository.js";
import { Usuarios_resolverCodigos } from "../modules/usuarios/usuarios-accesos.js";

export async function Middleware_requerirAutenticacion(
  ObjSolicitud: Request,
  ObjRespuesta: Response,
  ObjSiguiente: NextFunction,
): Promise<void> {
  ObjRespuesta.setHeader("Cache-Control", "no-store");

  try {
    const StrToken = Autenticacion_obtenerTokenCookie(
      ObjSolicitud.headers.cookie,
    );

    if (StrToken === undefined || StrToken.length === 0) {
      throw new ErrorAplicacion(
        401,
        "NO_AUTENTICADO",
        "Debe iniciar sesión para acceder a este recurso.",
      );
    }

    const StrTokenHash = Autenticacion_hashearTokenSesion(StrToken);
    const ObjSesion = await Usuarios_obtenerSesionParaAutenticacion(
      StrTokenHash,
    );

    if (ObjSesion === null) {
      throw new ErrorAplicacion(401, "SESION_INVALIDA", "La sesión no es válida.");
    }

    if (ObjSesion.estado === "REVOCADA") {
      throw new ErrorAplicacion(401, "SESION_REVOCADA", "La sesión fue revocada.");
    }

    if (ObjSesion.estado !== "ACTIVA") {
      throw new ErrorAplicacion(401, "SESION_INVALIDA", "La sesión no es válida.");
    }

    const DtFechaExpiracionInstante =
      Fecha_convertirAlmacenamientoGuatemalaAInstante(
        ObjSesion.fechaExpiracion,
      );
    if (
      DtFechaExpiracionInstante.getTime() <=
      Fecha_obtenerInstanteActual().getTime()
    ) {
      await Usuarios_marcarSesionExpirada(ObjSesion.sesionId);
      throw new ErrorAplicacion(401, "SESION_EXPIRADA", "La sesión expiró.");
    }

    if (ObjSesion.usuario.estado !== "ACTIVO") {
      throw new ErrorAplicacion(403, "USUARIO_INACTIVO", "El usuario está inactivo.");
    }

    if (!ObjSesion.usuario.rol.activo) {
      throw new ErrorAplicacion(403, "ROL_INACTIVO", "El rol del usuario está inactivo.");
    }

    const ArrPermisos = Usuarios_resolverCodigos(ObjSesion.usuario);

    ObjSolicitud.ObjAutenticacion = {
      IntUsuarioId: ObjSesion.usuarioId,
      IntSesionId: ObjSesion.sesionId,
      StrTokenHash,
      ArrPermisos,
    };
    ObjSiguiente();
  } catch (ObjError) {
    ObjSiguiente(ObjError);
  }
}

export function Middleware_requerirPermiso(StrCodigoPermiso: string) {
  return function Middleware_validarPermiso(
    ObjSolicitud: Request,
    _ObjRespuesta: Response,
    ObjSiguiente: NextFunction,
  ): void {
    if (
      ObjSolicitud.ObjAutenticacion === undefined ||
      !ObjSolicitud.ObjAutenticacion.ArrPermisos.includes(StrCodigoPermiso)
    ) {
      ObjSiguiente(
        new ErrorAplicacion(
          403,
          "PERMISO_INSUFICIENTE",
          "No tiene permiso para realizar esta operación.",
        ),
      );
      return;
    }

    ObjSiguiente();
  };
}
