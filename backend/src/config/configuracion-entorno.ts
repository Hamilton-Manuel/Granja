import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { z } from "zod";

const StrDirectorioActual = path.dirname(fileURLToPath(import.meta.url));

function Configuracion_buscarRutaEntorno(
  StrDirectorioInicial: string,
): string | undefined {
  let StrDirectorioBusqueda = StrDirectorioInicial;

  while (true) {
    const StrRutaCandidata = path.join(StrDirectorioBusqueda, ".env");

    if (fs.existsSync(StrRutaCandidata)) {
      return StrRutaCandidata;
    }

    const StrDirectorioPadre = path.dirname(StrDirectorioBusqueda);

    if (StrDirectorioPadre === StrDirectorioBusqueda) {
      return undefined;
    }

    StrDirectorioBusqueda = StrDirectorioPadre;
  }
}

const StrRutaEntorno = Configuracion_buscarRutaEntorno(StrDirectorioActual);

if (StrRutaEntorno !== undefined) {
  dotenv.config({
    path: StrRutaEntorno,
    quiet: true,
  });
}

const ObjEsquemaEntorno = z.object({
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL es obligatoria"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type ConfiguracionEntorno = z.infer<typeof ObjEsquemaEntorno>;

let ObjEntorno: ConfiguracionEntorno | undefined;

export function Configuracion_obtenerEntorno(): ConfiguracionEntorno {
  if (ObjEntorno !== undefined) {
    return ObjEntorno;
  }

  const ObjResultado = ObjEsquemaEntorno.safeParse(process.env);

  if (!ObjResultado.success) {
    const StrVariablesInvalidas = ObjResultado.error.issues
      .map((ObjProblema) => ObjProblema.path.join("."))
      .filter((StrVariable) => StrVariable.length > 0)
      .join(", ");

    throw new Error(
      `Configuración de entorno inválida: ${StrVariablesInvalidas || "variables desconocidas"}.`,
    );
  }

  ObjEntorno = ObjResultado.data;
  return ObjEntorno;
}
