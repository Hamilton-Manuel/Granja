import { Router } from "express";
import { Middleware_requerirAutenticacion, Middleware_requerirPermiso } from "../../middleware/autenticacion.middleware.js";
import * as ObjController from "./clientes.controller.js";

export function Clientes_crearRouter(): Router {
  const ObjRouter = Router();
  ObjRouter.use(Middleware_requerirAutenticacion);
  ObjRouter.get("/tipos", Middleware_requerirPermiso("CLIENTES_CONSULTAR"), ObjController.Clientes_obtenerTipos);
  ObjRouter.get("/", Middleware_requerirPermiso("CLIENTES_CONSULTAR"), ObjController.Clientes_listar);
  ObjRouter.post("/", Middleware_requerirPermiso("CLIENTES_CREAR"), ObjController.Clientes_crear);
  ObjRouter.get("/:clienteId", Middleware_requerirPermiso("CLIENTES_CONSULTAR"), ObjController.Clientes_obtenerPorId);
  ObjRouter.patch("/:clienteId", Middleware_requerirPermiso("CLIENTES_EDITAR"), ObjController.Clientes_editar);
  ObjRouter.patch("/:clienteId/estado", Middleware_requerirPermiso("CLIENTES_CAMBIAR_ESTADO"), ObjController.Clientes_cambiarEstado);
  return ObjRouter;
}
