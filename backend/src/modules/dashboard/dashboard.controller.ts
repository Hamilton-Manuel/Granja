import type { NextFunction, Request, Response } from "express";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import { Dashboard_obtener } from "./dashboard.service.js";

export async function Dashboard_consultar(Req: Request, Res: Response, Next: NextFunction) {
  try {
    if (!Req.ObjAutenticacion) throw new ErrorAplicacion(401, "NO_AUTENTICADO", "Debe iniciar sesión.");
    Res.json({ ok: true, datos: await Dashboard_obtener(Req.ObjAutenticacion.ArrPermisos) });
  } catch (ObjError) { Next(ObjError); }
}
