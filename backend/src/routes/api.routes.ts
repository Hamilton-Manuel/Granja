import { Router } from "express";

import { Salud_crearRouter } from "../modules/salud/salud.routes.js";

export function Api_crearRouter(): Router {
  const ObjRouter = Router();

  ObjRouter.use("/health", Salud_crearRouter());

  return ObjRouter;
}
