import type { RequestHandler } from "express";
import type { ConfiguracionEntorno } from "../config/configuracion-entorno.js";
import { ErrorAplicacion } from "../errors/error-aplicacion.js";

const ArrMetodos = ["GET", "HEAD", "POST", "PUT", "PATCH", "OPTIONS"];
const ArrEncabezados = ["content-type", "if-none-match"];

export function Middleware_crearProteccionOrigen(ObjEntorno: Pick<ConfiguracionEntorno, "CORS_FRONTEND_ORIGIN" | "NODE_ENV">): RequestHandler {
  return (ObjSolicitud, ObjRespuesta, ObjSiguiente) => {
    const StrOrigen = ObjSolicitud.get("origin");
    const BoolPermitido = StrOrigen === ObjEntorno.CORS_FRONTEND_ORIGIN;
    ObjRespuesta.vary("Origin");
    if (StrOrigen !== undefined && !BoolPermitido) {
      ObjSiguiente(new ErrorAplicacion(403, "ORIGEN_NO_PERMITIDO", "Origen no permitido."));
      return;
    }
    if (BoolPermitido) {
      ObjRespuesta.setHeader("Access-Control-Allow-Origin", ObjEntorno.CORS_FRONTEND_ORIGIN);
      ObjRespuesta.setHeader("Access-Control-Allow-Credentials", "true");
      ObjRespuesta.setHeader("Access-Control-Expose-Headers", "ETag");
    }
    if (ObjSolicitud.method === "OPTIONS") {
      const StrMetodo = ObjSolicitud.get("access-control-request-method");
      const ArrSolicitados = (ObjSolicitud.get("access-control-request-headers") ?? "").split(",").map((StrValor) => StrValor.trim().toLowerCase()).filter(Boolean);
      if (!BoolPermitido || !StrMetodo || !ArrMetodos.includes(StrMetodo) || ArrSolicitados.some((StrValor) => !ArrEncabezados.includes(StrValor))) {
        ObjSiguiente(new ErrorAplicacion(403, "ORIGEN_NO_PERMITIDO", "Preflight no permitido."));
        return;
      }
      ObjRespuesta.vary("Access-Control-Request-Method");
      ObjRespuesta.vary("Access-Control-Request-Headers");
      ObjRespuesta.setHeader("Access-Control-Allow-Methods", ArrMetodos.join(", "));
      ObjRespuesta.setHeader("Access-Control-Allow-Headers", "Content-Type, If-None-Match");
      ObjRespuesta.status(204).end();
      return;
    }
    const BoolMutable = !["GET", "HEAD"].includes(ObjSolicitud.method);
    // Los clientes CLI locales existentes pueden omitir Origin; producción nunca.
    if (BoolMutable && !BoolPermitido && ObjEntorno.NODE_ENV === "production") {
      ObjSiguiente(new ErrorAplicacion(403, "ORIGEN_NO_PERMITIDO", "Origen requerido."));
      return;
    }
    ObjSiguiente();
  };
}
