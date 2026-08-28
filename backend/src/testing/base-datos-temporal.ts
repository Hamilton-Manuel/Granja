import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";

import { PrismaMssql } from "@prisma/adapter-mssql";

import { PrismaClient } from "../../generated/prisma/client.js";
import { BaseDatos_desconectar } from "../database/prisma.js";

const StrPrefijoBaseTemporal = "granja_test_";
const ObjEjecutarArchivo = promisify(execFile);

function PruebasBaseDatos_validarNombreTemporal(StrNombre: string): void {
  if (!/^granja_test_[a-z0-9_]+$/.test(StrNombre) || !StrNombre.startsWith(StrPrefijoBaseTemporal)) {
    throw new Error("BASE_PRUEBAS_NOMBRE_NO_AUTORIZADO");
  }
  if (StrNombre === "granja_el_chiflon") {
    throw new Error("BASE_PRUEBAS_PROTEGIDA");
  }
}

function PruebasBaseDatos_cambiarBase(StrUrl: string, StrNombre: string): string {
  if (!/(^|;)database=[^;]+/i.test(StrUrl)) throw new Error("DATABASE_URL_SIN_BASE");
  return StrUrl.replace(/(^|;)database=[^;]+/i, `$1database=${StrNombre}`);
}

async function PruebasBaseDatos_ejecutarAdministrador(StrUrl: string, StrSql: string): Promise<void> {
  const ObjAdministrador = new PrismaClient({ adapter: new PrismaMssql(StrUrl) });
  try {
    await ObjAdministrador.$executeRawUnsafe(StrSql);
  } finally {
    await ObjAdministrador.$disconnect();
  }
}

export type BaseDatosTemporalPruebas = {
  StrNombre: string;
  eliminar: () => Promise<void>;
};

export async function PruebasBaseDatos_crearTemporal(StrAmbito: string): Promise<BaseDatosTemporalPruebas> {
  const StrAmbitoSeguro = StrAmbito.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (StrAmbitoSeguro.length === 0) throw new Error("BASE_PRUEBAS_AMBITO_INVALIDO");

  const StrNombre = `${StrPrefijoBaseTemporal}${StrAmbitoSeguro}_${process.pid}_${Date.now()}_${randomBytes(4).toString("hex")}`;
  PruebasBaseDatos_validarNombreTemporal(StrNombre);

  const StrUrlOriginal = process.env.DATABASE_URL;
  if (StrUrlOriginal === undefined) throw new Error("DATABASE_URL_REQUERIDA");
  const StrBaseEsperadaOriginal = process.env.BASE_DATOS_ESPERADA;
  const StrUrlAdministrador = PruebasBaseDatos_cambiarBase(StrUrlOriginal, "master");
  const StrUrlTemporal = PruebasBaseDatos_cambiarBase(StrUrlOriginal, StrNombre);
  let BoolCreada = false;
  let BoolEliminada = false;

  const eliminar = async (): Promise<void> => {
    if (BoolEliminada) return;
    PruebasBaseDatos_validarNombreTemporal(StrNombre);
    await BaseDatos_desconectar();
    if (BoolCreada) {
      await PruebasBaseDatos_ejecutarAdministrador(
        StrUrlAdministrador,
        `IF DB_ID(N'${StrNombre}') IS NOT NULL BEGIN ALTER DATABASE [${StrNombre}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${StrNombre}]; END`,
      );
    }
    BoolEliminada = true;
    process.env.DATABASE_URL = StrUrlOriginal;
    if (StrBaseEsperadaOriginal === undefined) delete process.env.BASE_DATOS_ESPERADA;
    else process.env.BASE_DATOS_ESPERADA = StrBaseEsperadaOriginal;
  };

  try {
    await PruebasBaseDatos_ejecutarAdministrador(StrUrlAdministrador, `CREATE DATABASE [${StrNombre}]`);
    BoolCreada = true;
    process.env.DATABASE_URL = StrUrlTemporal;
    process.env.BASE_DATOS_ESPERADA = StrNombre;
    await ObjEjecutarArchivo(process.execPath, [path.join(process.cwd(), "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: StrUrlTemporal },
    });
    return { StrNombre, eliminar };
  } catch (ObjError) {
    await eliminar();
    throw ObjError;
  }
}

export function PruebasBaseDatos_exigirNombreTemporal(StrNombre: string): void {
  PruebasBaseDatos_validarNombreTemporal(StrNombre);
}
