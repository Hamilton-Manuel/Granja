import type { Request, Response } from "express";
import { rateLimit } from "express-rate-limit";

const IntVentanaLoginMs = 15 * 60 * 1_000;
const IntMaximoIntentosLogin = 5;

function Middleware_responderDemasiadosIntentos(
  _ObjSolicitud: Request,
  ObjRespuesta: Response,
): void {
  ObjRespuesta.status(429).json({
    error: {
      codigo: "DEMASIADOS_INTENTOS",
      mensaje: "Se realizaron demasiados intentos. Intente nuevamente más tarde.",
    },
  });
}

export function Middleware_crearLimitadorIntentosLogin() {
  return rateLimit({
    windowMs: IntVentanaLoginMs,
    limit: IntMaximoIntentosLogin,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipFailedRequests: false,
    skipSuccessfulRequests: true,
    handler: Middleware_responderDemasiadosIntentos,
  });
}
