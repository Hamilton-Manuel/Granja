import type { Request, Response } from "express";

import { Salud_consultarEstado } from "./salud.service.js";

export function Salud_obtenerVida(_ObjSolicitud: Request, ObjRespuesta: Response): void {
  ObjRespuesta.setHeader("Cache-Control", "no-store");
  ObjRespuesta.status(200).json({ estado: "ok" });
}

export async function Salud_obtenerEstado(
  _ObjSolicitud: Request,
  ObjRespuesta: Response,
): Promise<void> {
  const ObjEstadoSalud = await Salud_consultarEstado();
  ObjRespuesta.setHeader("Cache-Control", "no-store");
  ObjRespuesta.status(200).json(ObjEstadoSalud);
}
