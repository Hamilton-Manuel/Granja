import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import { Salud_verificarConexionBaseDatos } from "./salud.repository.js";

export interface EstadoSalud {
  estado: "ok";
  baseDatos: "conectada";
  fecha: string;
}

export async function Salud_consultarEstado(): Promise<EstadoSalud> {
  try {
    await Salud_verificarConexionBaseDatos();
  } catch {
    throw new ErrorAplicacion(
      503,
      "SERVICIO_NO_DISPONIBLE",
      "La base de datos no está disponible.",
    );
  }

  return {
    estado: "ok",
    baseDatos: "conectada",
    fecha: new Date().toISOString(),
  };
}
