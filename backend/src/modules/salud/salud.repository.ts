import { BaseDatos_obtenerCliente } from "../../database/prisma.js";

export async function Salud_verificarConexionBaseDatos(): Promise<void> {
  const ObjPrisma = BaseDatos_obtenerCliente();

  await ObjPrisma.$queryRaw`SELECT 1 AS estado`;
}
