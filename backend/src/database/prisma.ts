import { PrismaMssql } from "@prisma/adapter-mssql";

import { PrismaClient } from "../../generated/prisma/client.js";
import { Configuracion_obtenerEntorno } from "../config/configuracion-entorno.js";

let ObjPrisma: PrismaClient | undefined;

export function BaseDatos_obtenerCliente(): PrismaClient {
  if (ObjPrisma !== undefined) {
    return ObjPrisma;
  }

  const ObjEntorno = Configuracion_obtenerEntorno();
  const ObjAdaptador = new PrismaMssql(ObjEntorno.DATABASE_URL);

  ObjPrisma = new PrismaClient({ adapter: ObjAdaptador });
  return ObjPrisma;
}

export async function BaseDatos_verificarConexion(): Promise<void> {
  const ObjClientePrisma = BaseDatos_obtenerCliente();

  await ObjClientePrisma.$queryRaw`SELECT 1 AS estado`;
}

export async function BaseDatos_desconectar(): Promise<void> {
  if (ObjPrisma === undefined) {
    return;
  }

  await ObjPrisma.$disconnect();
  ObjPrisma = undefined;
}
