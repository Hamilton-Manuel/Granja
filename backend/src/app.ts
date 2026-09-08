import express, { type Express } from "express";

import { Middleware_manejarErrores } from "./middleware/manejo-errores.middleware.js";
import { Middleware_rutaNoEncontrada } from "./middleware/ruta-no-encontrada.middleware.js";
import { Api_crearRouter } from "./routes/api.routes.js";
import { Configuracion_obtenerEntorno, Configuracion_validarHttp } from "./config/configuracion-entorno.js";
import { Middleware_crearProteccionOrigen } from "./middleware/origen.middleware.js";

export function Api_crearAplicacion(): Express {
  const ObjAplicacion = express();
  const ObjEntorno = Configuracion_obtenerEntorno();
  Configuracion_validarHttp(ObjEntorno);

  ObjAplicacion.disable("x-powered-by");
  ObjAplicacion.set("trust proxy", ObjEntorno.TRUST_PROXY_HOPS);
  ObjAplicacion.use("/api", Middleware_crearProteccionOrigen(ObjEntorno));
  ObjAplicacion.use(express.json());
  ObjAplicacion.use("/api", Api_crearRouter());
  ObjAplicacion.use(Middleware_rutaNoEncontrada);
  ObjAplicacion.use(Middleware_manejarErrores);

  return ObjAplicacion;
}

const ObjAplicacion = Api_crearAplicacion();

export default ObjAplicacion;
