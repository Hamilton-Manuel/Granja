import { Router } from "express";

import { Clientes_crearRouter } from "../modules/clientes/clientes.routes.js";
import { Proveedores_crearRouter } from "../modules/proveedores/proveedores.routes.js";
import { Salud_crearRouter } from "../modules/salud/salud.routes.js";
import { Usuarios_crearRouter } from "../modules/usuarios/usuarios.routes.js";

export function Api_crearRouter(): Router {
  const ObjRouter = Router();

  ObjRouter.use("/health", Salud_crearRouter());
  ObjRouter.use("/usuarios", Usuarios_crearRouter());
  ObjRouter.use("/clientes", Clientes_crearRouter());
  ObjRouter.use("/proveedores", Proveedores_crearRouter());

  return ObjRouter;
}
