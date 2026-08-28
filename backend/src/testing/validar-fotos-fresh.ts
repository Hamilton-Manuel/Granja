import dotenv from "dotenv";
import { BaseDatos_obtenerCliente } from "../database/prisma.js";
import { PruebasBaseDatos_crearTemporal } from "./base-datos-temporal.js";

dotenv.config({ path: "../.env" });
const ObjTemporal = await PruebasBaseDatos_crearTemporal("fotos_fresh");
try {
  const ObjDb = BaseDatos_obtenerCliente();
  const ArrColumnas = await ObjDb.$queryRawUnsafe<Array<{ COLUMN_NAME: string }>>(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'produccion_animales_fotos'",
  );
  const ArrIndices = await ObjDb.$queryRawUnsafe<Array<{ name: string; is_unique: boolean; filter_definition: string | null }>>(
    "SELECT name, is_unique, filter_definition FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.produccion_animales_fotos') AND name IS NOT NULL",
  );
  const ArrChecks = await ObjDb.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.produccion_animales_fotos')",
  );
  if (ArrColumnas.length !== 11 || !ArrIndices.some((ObjIndice) => ObjIndice.name === "produccion_animales_fotos_principal_unica" && ObjIndice.is_unique && ObjIndice.filter_definition?.includes("[es_principal]=(1)")) || ArrChecks.length !== 1) {
    throw new Error("MIGRACION_FOTOS_INVALIDA");
  }
  console.info("MIGRACION_FOTOS_FRESH_OK");
} finally {
  await ObjTemporal.eliminar();
  console.info("CLEANUP_FOTOS_FRESH_OK");
}
