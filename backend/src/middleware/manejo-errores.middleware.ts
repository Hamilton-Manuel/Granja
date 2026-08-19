import type { NextFunction, Request, Response } from "express";

import { ErrorAplicacion } from "../errors/error-aplicacion.js";

function Middleware_esErrorJsonMalformado(ObjError: unknown): boolean {
  if (typeof ObjError !== "object" || ObjError === null) {
    return false;
  }

  const BoolEsErrorParseo =
    "type" in ObjError && ObjError.type === "entity.parse.failed";
  const BoolEsSolicitudInvalida =
    ("status" in ObjError && ObjError.status === 400) ||
    ("statusCode" in ObjError && ObjError.statusCode === 400);

  return BoolEsErrorParseo && BoolEsSolicitudInvalida;
}

export function Middleware_manejarErrores(
  ObjError: unknown,
  _ObjSolicitud: Request,
  ObjRespuesta: Response,
  _ObjSiguiente: NextFunction,
): void {
  if (ObjError instanceof ErrorAplicacion) {
    ObjRespuesta.status(ObjError.IntEstadoHttp).json({
      error: {
        codigo: ObjError.StrCodigo,
        mensaje: ObjError.message,
      },
    });
    return;
  }

  if (Middleware_esErrorJsonMalformado(ObjError)) {
    ObjRespuesta.status(400).json({
      error: {
        codigo: "JSON_MALFORMADO",
        mensaje: "El cuerpo de la solicitud contiene JSON mal formado.",
      },
    });
    return;
  }

  console.error("Ocurrió un error interno no controlado en la API.");
  ObjRespuesta.status(500).json({
    error: {
      codigo: "ERROR_INTERNO",
      mensaje: "Ocurrió un error interno.",
    },
  });
}
