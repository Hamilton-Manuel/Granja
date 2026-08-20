import { Router } from "express";

import { Middleware_requerirAutenticacion, Middleware_requerirPermiso } from "../../middleware/autenticacion.middleware.js";
import { Middleware_crearLimitadorIntentosLogin } from "../../middleware/limite-login.middleware.js";
import * as ObjController from "./usuarios.controller.js";

const ObjLimitadorIntentosLogin = Middleware_crearLimitadorIntentosLogin();

export function Usuarios_crearRouter(): Router {
  const ObjRouter = Router();

  ObjRouter.post(
    "/login",
    ObjLimitadorIntentosLogin,
    ObjController.Usuarios_iniciarSesion,
  );
  ObjRouter.post("/logout", Middleware_requerirAutenticacion, ObjController.Usuarios_cerrarSesion);
  ObjRouter.get("/sesion", Middleware_requerirAutenticacion, ObjController.Usuarios_obtenerSesion);
  ObjRouter.patch("/contrasena", Middleware_requerirAutenticacion, ObjController.Usuarios_cambiarContrasena);
  ObjRouter.get("/roles", Middleware_requerirAutenticacion, Middleware_requerirPermiso("USUARIOS_CONSULTAR_CATALOGOS"), ObjController.Usuarios_obtenerRoles);
  ObjRouter.get("/permisos", Middleware_requerirAutenticacion, Middleware_requerirPermiso("USUARIOS_CONSULTAR_CATALOGOS"), ObjController.Usuarios_obtenerPermisos);
  ObjRouter.get("/", Middleware_requerirAutenticacion, Middleware_requerirPermiso("USUARIOS_CONSULTAR"), ObjController.Usuarios_listar);
  ObjRouter.post("/", Middleware_requerirAutenticacion, Middleware_requerirPermiso("USUARIOS_CREAR"), ObjController.Usuarios_crear);
  ObjRouter.get("/:usuarioId", Middleware_requerirAutenticacion, Middleware_requerirPermiso("USUARIOS_CONSULTAR"), ObjController.Usuarios_obtenerPorId);
  ObjRouter.patch("/:usuarioId", Middleware_requerirAutenticacion, Middleware_requerirPermiso("USUARIOS_EDITAR"), ObjController.Usuarios_editar);
  ObjRouter.patch("/:usuarioId/estado", Middleware_requerirAutenticacion, Middleware_requerirPermiso("USUARIOS_CAMBIAR_ESTADO"), ObjController.Usuarios_cambiarEstado);
  ObjRouter.patch("/:usuarioId/rol", Middleware_requerirAutenticacion, Middleware_requerirPermiso("USUARIOS_ASIGNAR_ROL"), ObjController.Usuarios_cambiarRol);
  ObjRouter.post("/:usuarioId/sesiones/revocar", Middleware_requerirAutenticacion, Middleware_requerirPermiso("USUARIOS_REVOCAR_SESIONES"), ObjController.Usuarios_revocarSesiones);

  return ObjRouter;
}
