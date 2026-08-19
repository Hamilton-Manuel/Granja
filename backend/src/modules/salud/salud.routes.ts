import { Router } from "express";

import { Salud_obtenerEstado } from "./salud.controller.js";

export function Salud_crearRouter(): Router {
  const ObjRouter = Router();

  ObjRouter.get("/", Salud_obtenerEstado);

  return ObjRouter;
}
