import type { NextFunction, Request, Response } from "express";

import { ErrorAplicacion } from "../errors/error-aplicacion.js";

export function Middleware_rutaNoEncontrada(
  _ObjSolicitud: Request,
  _ObjRespuesta: Response,
  ObjSiguiente: NextFunction,
): void {
  ObjSiguiente(
    new ErrorAplicacion(
      404,
      "RUTA_NO_ENCONTRADA",
      "La ruta solicitada no existe.",
    ),
  );
}
