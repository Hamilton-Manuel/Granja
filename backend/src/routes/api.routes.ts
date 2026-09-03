import { Router } from "express";

import { Clientes_crearRouter } from "../modules/clientes/clientes.routes.js";
import { Proveedores_crearRouter } from "../modules/proveedores/proveedores.routes.js";
import { Inventario_crearRouter } from "../modules/inventario/inventario.routes.js";
import { Produccion_crearRouter } from "../modules/produccion/produccion.routes.js";
import { Alimentacion_crearRouter } from "../modules/alimentacion/alimentacion.routes.js";
import { Sanidad_crearRouter } from "../modules/sanidad/sanidad.routes.js";
import { Ventas_crearRouter } from "../modules/ventas/ventas.routes.js";
import { Salud_crearRouter } from "../modules/salud/salud.routes.js";
import { Usuarios_crearRouter } from "../modules/usuarios/usuarios.routes.js";
import { Reportes_crearRouter } from "../modules/reportes/reportes.routes.js";
import { Dashboard_crearRouter } from "../modules/dashboard/dashboard.routes.js";

export function Api_crearRouter(): Router {
  const ObjRouter = Router();

  ObjRouter.use("/health", Salud_crearRouter());
  ObjRouter.use("/usuarios", Usuarios_crearRouter());
  ObjRouter.use("/clientes", Clientes_crearRouter());
  ObjRouter.use("/proveedores", Proveedores_crearRouter());
  ObjRouter.use("/inventario", Inventario_crearRouter());
  ObjRouter.use("/produccion", Produccion_crearRouter());
  ObjRouter.use("/alimentacion", Alimentacion_crearRouter());
  ObjRouter.use("/sanidad", Sanidad_crearRouter());
  ObjRouter.use("/ventas", Ventas_crearRouter());
  ObjRouter.use("/reportes", Reportes_crearRouter());
  ObjRouter.use("/dashboard", Dashboard_crearRouter());

  return ObjRouter;
}
