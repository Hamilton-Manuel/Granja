import dotenv from "dotenv";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../../generated/prisma/client.js";

dotenv.config({ path: "../.env" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_REQUERIDA");
const Db = new PrismaClient({ adapter: new PrismaMssql(process.env.DATABASE_URL) });
const filas = async (sql: string) => Db.$queryRawUnsafe<Record<string, unknown>[]>(sql);
try {
  const [estado] = await filas(`SELECT DB_NAME() base, CAST(SERVERPROPERTY('Edition') AS nvarchar(200)) edicion, CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(100)) version, HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'BACKUP DATABASE') puedeBackup`);
  const migraciones = await filas(`SELECT migration_name, CASE WHEN finished_at IS NOT NULL THEN 1 ELSE 0 END aplicada FROM [_prisma_migrations] ORDER BY started_at`);
  const conteos = await filas(`SELECT
    (SELECT COUNT_BIG(*) FROM usuarios_cuentas) usuarios,
    (SELECT COUNT_BIG(*) FROM usuarios_roles) roles,
    (SELECT COUNT_BIG(*) FROM usuarios_permisos) permisos,
    (SELECT COUNT_BIG(*) FROM usuarios_roles_permisos) asignaciones,
    (SELECT COUNT_BIG(*) FROM usuarios_sesiones) sesiones`);
  const roles = await filas(`SELECT rol_id, nombre, activo, (SELECT COUNT_BIG(*) FROM usuarios_cuentas C WHERE C.rol_id=R.rol_id) usuarios, (SELECT COUNT_BIG(*) FROM usuarios_roles_permisos RP WHERE RP.rol_id=R.rol_id) permisos FROM usuarios_roles R ORDER BY rol_id`);
  const usuarios = await filas(`SELECT usuario_id, nombre_usuario, estado, rol_id FROM usuarios_cuentas ORDER BY usuario_id`);
  const webmaster = await filas(`SELECT C.usuario_id, C.nombre_usuario, C.estado, R.rol_id, R.nombre rol, R.activo rol_activo, (SELECT COUNT_BIG(*) FROM usuarios_sesiones S WHERE S.usuario_id=C.usuario_id) sesiones FROM usuarios_cuentas C JOIN usuarios_roles R ON R.rol_id=C.rol_id WHERE R.nombre=N'WEBMASTER'`);
  const archivos = await filas(`SELECT name nombre_logico, type_desc tipo FROM sys.database_files ORDER BY file_id`);
  const temporales = await filas(`SELECT name FROM sys.databases WHERE name LIKE N'granja_test[_]%' ORDER BY name`);
  console.log(JSON.stringify({ estado, migraciones, conteos: conteos[0], roles, usuarios, webmaster, archivos, temporales }, (_K, V) => typeof V === "bigint" ? V.toString() : V, 2));
} finally { await Db.$disconnect(); }
