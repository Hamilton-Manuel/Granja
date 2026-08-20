import { Router } from "express";

import { Salud_crearRouter } from "../modules/salud/salud.routes.js";
import { Usuarios_crearRouter } from "../modules/usuarios/usuarios.routes.js";

export function Api_crearRouter(): Router {
  const ObjRouter = Router();

  ObjRouter.use("/health", Salud_crearRouter());
  ObjRouter.use("/usuarios", Usuarios_crearRouter());

  return ObjRouter;
}
