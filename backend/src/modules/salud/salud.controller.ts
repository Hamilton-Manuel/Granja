import type { Request, Response } from "express";

import { Salud_consultarEstado } from "./salud.service.js";

export async function Salud_obtenerEstado(
  _ObjSolicitud: Request,
  ObjRespuesta: Response,
): Promise<void> {
  const ObjEstadoSalud = await Salud_consultarEstado();

  ObjRespuesta.status(200).json(ObjEstadoSalud);
}
