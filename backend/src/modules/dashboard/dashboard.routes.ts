import { Router } from "express";
import { Middleware_requerirAutenticacion } from "../../middleware/autenticacion.middleware.js";
import { Dashboard_consultar } from "./dashboard.controller.js";

export function Dashboard_crearRouter() {
  const ObjRouter = Router();
  ObjRouter.use(Middleware_requerirAutenticacion);
  ObjRouter.get("/", Dashboard_consultar);
  return ObjRouter;
}
