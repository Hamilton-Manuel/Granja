import { Router } from "express";

import { Salud_obtenerEstado, Salud_obtenerVida } from "./salud.controller.js";

export function Salud_crearRouter(): Router {
  const ObjRouter = Router();

  ObjRouter.get("/", Salud_obtenerEstado);
  ObjRouter.get("/live", Salud_obtenerVida);

  return ObjRouter;
}
