import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import dotenv from "dotenv";
import { BaseDatos_obtenerCliente } from "../database/prisma.js";
import { Usuarios_ejecutarBootstrap } from "../scripts/bootstrap-usuarios.js";
import { PruebasBaseDatos_crearTemporal } from "./base-datos-temporal.js";

dotenv.config({ path: "../.env" });
process.env.BOOTSTRAP_WEBMASTER_NOMBRE_COMPLETO ??= "Webmaster temporal validación";
process.env.BOOTSTRAP_WEBMASTER_USUARIO ??= "webmaster_validacion";
process.env.BOOTSTRAP_WEBMASTER_CORREO ??= "webmaster.validacion@example.invalid";
process.env.BOOTSTRAP_WEBMASTER_CONTRASENA ??= "Temporal-validacion-2026";
const ejecutar = promisify(execFile);
const Temporal = await PruebasBaseDatos_crearTemporal("accesos_fresh");
try {
  await Usuarios_ejecutarBootstrap();
  const Db = BaseDatos_obtenerCliente();
  const conteos1 = await Db.$queryRawUnsafe<Record<string, bigint>[]>(`SELECT (SELECT COUNT_BIG(*) FROM usuarios_cuentas) usuarios,(SELECT COUNT_BIG(*) FROM usuarios_roles) roles,(SELECT COUNT_BIG(*) FROM usuarios_permisos) permisos,(SELECT COUNT_BIG(*) FROM usuarios_roles_permisos) asignaciones,(SELECT COUNT_BIG(*) FROM usuarios_permisos_directos) overrides,(SELECT COUNT_BIG(*) FROM usuarios_accesos_eventos) eventos`);
  await Usuarios_ejecutarBootstrap();
  const conteos2 = await Db.$queryRawUnsafe<Record<string, bigint>[]>(`SELECT (SELECT COUNT_BIG(*) FROM usuarios_cuentas) usuarios,(SELECT COUNT_BIG(*) FROM usuarios_roles) roles,(SELECT COUNT_BIG(*) FROM usuarios_permisos) permisos,(SELECT COUNT_BIG(*) FROM usuarios_roles_permisos) asignaciones,(SELECT COUNT_BIG(*) FROM usuarios_permisos_directos) overrides,(SELECT COUNT_BIG(*) FROM usuarios_accesos_eventos) eventos`);
  const marcadores = await Db.$queryRawUnsafe(`SELECT R.nombre,R.es_reservado,C.usuario_id,C.nombre_usuario,C.es_protegida FROM usuarios_roles R LEFT JOIN usuarios_cuentas C ON C.rol_id=R.rol_id ORDER BY R.rol_id`);
  const columnas = await Db.$queryRawUnsafe(`SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE,COLUMN_DEFAULT,IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE (TABLE_NAME IN ('usuarios_roles','usuarios_cuentas') AND COLUMN_NAME IN ('es_reservado','version_accesos','es_protegida')) OR TABLE_NAME IN ('usuarios_permisos_directos','usuarios_accesos_eventos') ORDER BY TABLE_NAME,ORDINAL_POSITION`);
  const restricciones = await Db.$queryRawUnsafe(`SELECT O.name tabla, K.name restriccion, K.type_desc tipo FROM sys.key_constraints K JOIN sys.objects O ON O.object_id=K.parent_object_id WHERE O.name IN ('usuarios_permisos_directos','usuarios_accesos_eventos') UNION ALL SELECT O.name,C.name,'CHECK_CONSTRAINT' FROM sys.check_constraints C JOIN sys.objects O ON O.object_id=C.parent_object_id WHERE O.name IN ('usuarios_permisos_directos','usuarios_accesos_eventos') UNION ALL SELECT O.name,F.name,'FOREIGN_KEY_CONSTRAINT' FROM sys.foreign_keys F JOIN sys.objects O ON O.object_id=F.parent_object_id WHERE O.name IN ('usuarios_permisos_directos','usuarios_accesos_eventos') ORDER BY tabla,tipo,restriccion`);
  const indices = await Db.$queryRawUnsafe(`SELECT O.name tabla,I.name indice,I.is_unique FROM sys.indexes I JOIN sys.objects O ON O.object_id=I.object_id WHERE O.name IN ('usuarios_permisos_directos','usuarios_accesos_eventos') AND I.name IS NOT NULL ORDER BY O.name,I.name`);
  const dbcc = await Db.$queryRawUnsafe(`DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS`);
  const { stdout } = await ejecutar(process.execPath,[path.join(process.cwd(),"node_modules","prisma","build","index.js"),"migrate","status"],{cwd:process.cwd(),env:{...process.env}});
  const serializar = (_K:string,V:unknown) => typeof V === "bigint" ? V.toString() : V;
  console.log(JSON.stringify({ base: Temporal.StrNombre, conteos1:conteos1[0], conteos2:conteos2[0], idempotente:JSON.stringify(conteos1,serializar)===JSON.stringify(conteos2,serializar), marcadores,columnas,restricciones,indices,dbccProblemas:(dbcc as unknown[]).length,migrateStatus:stdout.trim() },serializar,2));
} finally { await Temporal.eliminar(); console.log("CLEANUP_FRESH_OK"); }
