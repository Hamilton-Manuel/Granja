import { Router } from "express";
import { Middleware_requerirAutenticacion, Middleware_requerirPermiso } from "../../middleware/autenticacion.middleware.js";
import * as C from "./alimentacion.controller.js";
import { Alimentacion_formatearRespuesta } from "./alimentacion.service.js";

export function Alimentacion_crearRouter() {
  const ObjRouter = Router();
  ObjRouter.use(Middleware_requerirAutenticacion);
  ObjRouter.use((_Req, Res, ObjSiguiente) => {
    const Alimentacion_json = Res.json.bind(Res);
    Res.json = ((ObjDatos: unknown) => Alimentacion_json(Alimentacion_formatearRespuesta(ObjDatos))) as typeof Res.json;
    ObjSiguiente();
  });
  ObjRouter.get("/destinos/animales", Middleware_requerirPermiso("ALIMENTACION_REGISTRAR"), C.Alimentacion_destinosAnimales);
  ObjRouter.get("/destinos/lotes", Middleware_requerirPermiso("ALIMENTACION_REGISTRAR"), C.Alimentacion_destinosLotes);
  ObjRouter.get("/almacenes", Middleware_requerirPermiso("ALIMENTACION_REGISTRAR"), C.Alimentacion_almacenes);
  ObjRouter.get("/existencias", Middleware_requerirPermiso("ALIMENTACION_REGISTRAR"), C.Alimentacion_existencias);
  ObjRouter.get("/lotes-inventario", Middleware_requerirPermiso("ALIMENTACION_REGISTRAR"), C.Alimentacion_lotesInventario);
  ObjRouter.get("/productos", Middleware_requerirPermiso("ALIMENTACION_CONSULTAR"), C.Alimentacion_productos);
  ObjRouter.patch("/productos/:productoId/habilitacion", Middleware_requerirPermiso("ALIMENTACION_PRODUCTOS_GESTIONAR"), C.Alimentacion_habilitar);
  ObjRouter.get("/formulas", Middleware_requerirPermiso("ALIMENTACION_CONSULTAR"), C.Alimentacion_formulas);
  ObjRouter.post("/formulas", Middleware_requerirPermiso("ALIMENTACION_FORMULAS_CREAR"), C.Alimentacion_crearFormula);
  ObjRouter.patch("/formulas/:formulaId", Middleware_requerirPermiso("ALIMENTACION_FORMULAS_EDITAR"), C.Alimentacion_editarFormula);
  ObjRouter.patch("/formulas/:formulaId/estado", Middleware_requerirPermiso("ALIMENTACION_FORMULAS_CAMBIAR_ESTADO"), C.Alimentacion_estadoFormula);
  ObjRouter.post("/diagnosticos/reconciliacion", Middleware_requerirPermiso("ALIMENTACION_RECONCILIACION_EJECUTAR"), C.Alimentacion_diagnostico);
  ObjRouter.get("/", Middleware_requerirPermiso("ALIMENTACION_CONSULTAR"), C.Alimentacion_listar);
  ObjRouter.post("/", Middleware_requerirPermiso("ALIMENTACION_REGISTRAR"), C.Alimentacion_registrar);
  ObjRouter.get("/:alimentacionId", Middleware_requerirPermiso("ALIMENTACION_CONSULTAR"), C.Alimentacion_obtener);
  ObjRouter.post("/:alimentacionId/revertir", Middleware_requerirPermiso("ALIMENTACION_REVERTIR"), C.Alimentacion_revertir);
  return ObjRouter;
}
