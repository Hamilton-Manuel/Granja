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
  SESSION_DURATION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
  CORS_FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
}).superRefine((ObjDatos, ObjContexto) => {
  try {
    const ObjUrl = new URL(ObjDatos.CORS_FRONTEND_ORIGIN);
    if (ObjUrl.origin !== ObjDatos.CORS_FRONTEND_ORIGIN || !["http:", "https:"].includes(ObjUrl.protocol) ||
        ObjUrl.username || ObjUrl.password) throw new Error();
  } catch { ObjContexto.addIssue({ code: "custom", path: ["CORS_FRONTEND_ORIGIN"], message: "Origen frontend inválido" }); }
});

const ObjEsquemaAlmacenamiento = z.object({
  AZURE_BLOB_CONTAINER_ANIMALES: z.string().trim().min(3).default("animales"),
  AZURE_STORAGE_CONNECTION_STRING: z.string().trim().min(1).optional(),
  AZURE_STORAGE_ACCOUNT_URL: z.string().trim().url().optional(),
  AZURE_STORAGE_MANAGED_IDENTITY_CLIENT_ID: z.string().trim().min(1).optional(),
});

export type ConfiguracionEntorno = z.infer<typeof ObjEsquemaEntorno>;

export function Configuracion_validarHttp(ObjEntorno: ConfiguracionEntorno): void {
  const ObjUrl = new URL(ObjEntorno.CORS_FRONTEND_ORIGIN);
  if (ObjEntorno.NODE_ENV === "production" && (ObjUrl.protocol !== "https:" || /^(localhost|127\..*|\[::1\])$/.test(ObjUrl.hostname))) {
    throw new Error("Producción requiere CORS_FRONTEND_ORIGIN HTTPS público.");
  }
}

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

export function Configuracion_obtenerAlmacenamiento() {
  const ObjResultado = ObjEsquemaAlmacenamiento.safeParse(process.env);
  if (!ObjResultado.success) throw new Error("Configuración de almacenamiento inválida.");
  const ObjConfiguracion = ObjResultado.data;
  Configuracion_validarAlmacenamiento(ObjConfiguracion);
  if (Configuracion_obtenerEntorno().NODE_ENV === "production" &&
      (ObjConfiguracion.AZURE_STORAGE_CONNECTION_STRING || !ObjConfiguracion.AZURE_STORAGE_ACCOUNT_URL?.startsWith("https://"))) {
    throw new Error("Producción requiere almacenamiento HTTPS con identidad administrada.");
  }
  return ObjConfiguracion;
}

export function Configuracion_validarAlmacenamiento(ObjConfiguracion: Pick<z.infer<typeof ObjEsquemaAlmacenamiento>, "AZURE_STORAGE_CONNECTION_STRING" | "AZURE_STORAGE_ACCOUNT_URL">): void {
  const BoolTieneCadena = ObjConfiguracion.AZURE_STORAGE_CONNECTION_STRING !== undefined;
  const BoolTieneUrl = ObjConfiguracion.AZURE_STORAGE_ACCOUNT_URL !== undefined;
  if (BoolTieneCadena === BoolTieneUrl) {
    throw new Error("Debe configurar exactamente una de AZURE_STORAGE_CONNECTION_STRING o AZURE_STORAGE_ACCOUNT_URL.");
  }
}
