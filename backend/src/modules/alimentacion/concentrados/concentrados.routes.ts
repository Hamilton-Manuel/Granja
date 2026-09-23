import { Router } from "express";
import { Middleware_requerirAutenticacion, Middleware_requerirPermiso } from "../../../middleware/autenticacion.middleware.js";
import * as C from "./concentrados.controller.js";

/** Clasificación, recetas, elaboración y reversión integral. */
export function Alimentacion_crearRouterConcentrados() {
  const ObjRouter = Router();
  ObjRouter.use(Middleware_requerirAutenticacion);
  ObjRouter.post("/elaboraciones/previsualizar", Middleware_requerirPermiso("ALIMENTACION_ELABORACIONES_REGISTRAR"), C.Alimentacion_previsualizarElaboracion);
  ObjRouter.post("/elaboraciones", Middleware_requerirPermiso("ALIMENTACION_ELABORACIONES_REGISTRAR"), C.Alimentacion_confirmarElaboracion);
  ObjRouter.get("/elaboraciones", Middleware_requerirPermiso("ALIMENTACION_ELABORACIONES_CONSULTAR"), C.Alimentacion_historial);
  ObjRouter.get("/elaboraciones/:elaboracionId", Middleware_requerirPermiso("ALIMENTACION_ELABORACIONES_CONSULTAR"), C.Alimentacion_detalleElaboracion);
  ObjRouter.get("/elaboraciones/:elaboracionId/dependencias", Middleware_requerirPermiso("ALIMENTACION_ELABORACIONES_CONSULTAR"), C.Alimentacion_consultarDependencias);
  ObjRouter.post("/elaboraciones/:elaboracionId/revertir", Middleware_requerirPermiso("ALIMENTACION_ELABORACIONES_REVERTIR"), C.Alimentacion_revertirElaboracion);
  const Alimentacion_consultar = () => Middleware_requerirPermiso("ALIMENTACION_CONCENTRADOS_CONSULTAR");
  const Alimentacion_gestionar = () => Middleware_requerirPermiso("ALIMENTACION_RECETAS_GESTIONAR");
  ObjRouter.get("/catalogos", Alimentacion_consultar(), C.Alimentacion_catalogos);
  ObjRouter.get("/productos", Alimentacion_consultar(), C.Alimentacion_productos);
  ObjRouter.get("/", Alimentacion_consultar(), C.Alimentacion_listarConcentrados);
  ObjRouter.post("/", Alimentacion_gestionar(), C.Alimentacion_clasificarConcentrado);
  ObjRouter.get("/recetas", Alimentacion_consultar(), C.Alimentacion_listarRecetas);
  ObjRouter.post("/recetas", Alimentacion_gestionar(), C.Alimentacion_crearReceta);
  ObjRouter.get("/recetas/:recetaId", Alimentacion_consultar(), C.Alimentacion_obtenerReceta);
  ObjRouter.patch("/recetas/:recetaId", Alimentacion_gestionar(), C.Alimentacion_editarReceta);
  ObjRouter.patch("/recetas/:recetaId/estado", Alimentacion_gestionar(), C.Alimentacion_estadoReceta);
  ObjRouter.get("/:concentradoId", Alimentacion_consultar(), C.Alimentacion_obtenerConcentrado);
  ObjRouter.patch("/:concentradoId/estado", Alimentacion_gestionar(), C.Alimentacion_estadoConcentrado);
  return ObjRouter;
}
