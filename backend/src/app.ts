import express, { type Express } from "express";

import { Middleware_manejarErrores } from "./middleware/manejo-errores.middleware.js";
import { Middleware_rutaNoEncontrada } from "./middleware/ruta-no-encontrada.middleware.js";
import { Api_crearRouter } from "./routes/api.routes.js";

export function Api_crearAplicacion(): Express {
  const ObjAplicacion = express();

  ObjAplicacion.disable("x-powered-by");
  ObjAplicacion.use(express.json());
  ObjAplicacion.use("/api", Api_crearRouter());
  ObjAplicacion.use(Middleware_rutaNoEncontrada);
  ObjAplicacion.use(Middleware_manejarErrores);

  return ObjAplicacion;
}

const ObjAplicacion = Api_crearAplicacion();

export default ObjAplicacion;
