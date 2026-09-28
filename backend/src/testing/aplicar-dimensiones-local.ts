// Ejecución explícita tras validar las bases temporales; nunca acepta un servidor remoto.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { parse } from "dotenv";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../../generated/prisma/client.js";
import { PruebasBaseDatos_validarServidorConcentrados } from "./concentrados-base-temporal.js";

const StrMigracion = "20260928160000_concentrados_ingredientes_dimensiones";
const ObjEjecutar = promisify(execFile);
async function Pruebas_aplicar() {
  assert.ok(process.argv.includes("--validacion-temporal-correcta"));
  const ObjEntorno = parse(await readFile("../.env"));
  const StrUrlConfigurada = ObjEntorno.DATABASE_URL;
  assert.ok(StrUrlConfigurada);
  // El validador compartido admite la conexión mínima; dbo es el esquema local.
  const ArrEsquemas = StrUrlConfigurada.split(";").filter(Str => /^schema=/i.test(Str));
  assert.ok(ArrEsquemas.length <= 1 && ArrEsquemas.every(Str => /^schema=dbo$/i.test(Str)));
  const StrUrl = StrUrlConfigurada.split(";").filter(Str => !/^schema=/i.test(Str)).join(";");
  const ObjContexto = await ObjEjecutar("docker", ["context", "inspect", "desktop-linux", "--format", "{{json .Endpoints.docker.Host}}"]);
  assert.equal(JSON.parse(ObjContexto.stdout), "npipe:////./pipe/dockerDesktopLinuxEngine");
  const ObjInspeccion = JSON.parse((await ObjEjecutar("docker", ["--context", "desktop-linux", "inspect", "granja-database"])).stdout)[0];
  PruebasBaseDatos_validarServidorConcentrados(StrUrl, ObjInspeccion);
  assert.equal(resolve(ObjInspeccion.Config.Labels["com.docker.compose.project.working_dir"]).toLowerCase(), resolve("..").toLowerCase());
  assert.match(StrUrl, /;database=granja_el_chiflon(?:;|$)/i);
  const ObjDb = new PrismaClient({ adapter: new PrismaMssql(StrUrl) });
  const Pruebas_hash = (Str: string) => createHash("sha256").update(Str).digest("hex");
  const Pruebas_identificador = (Str: string) => `[${Str.replaceAll("]", "]]")}]`;
  async function Pruebas_servidor() {
    const Arr = await ObjDb.$queryRaw<Array<{ equipo: string; edicion: number; base: string }>>`SELECT CONVERT(NVARCHAR(128),SERVERPROPERTY('MachineName')) equipo, CONVERT(INT,SERVERPROPERTY('EngineEdition')) edicion, DB_NAME() base`;
    assert.equal(Arr[0]?.equipo, ObjInspeccion.Id.slice(0, 12));
    assert.equal(Arr[0]?.edicion, 3);
    assert.equal(Arr[0]?.base, "granja_el_chiflon");
    console.log("Destino verificado:", Arr[0]);
  }
  async function Pruebas_huellas() {
    const ArrTablas = await ObjDb.$queryRaw<Array<{ esquema: string; tabla: string }>>`SELECT SCHEMA_NAME(schema_id) esquema, name tabla FROM sys.tables WHERE is_ms_shipped=0 AND name <> '_prisma_migrations' ORDER BY schema_id,name`;
    const ObjHuellas: Record<string, string> = {};
    for (const ObjTabla of ArrTablas) {
      const StrTabla = `${Pruebas_identificador(ObjTabla.esquema)}.${Pruebas_identificador(ObjTabla.tabla)}`;
      const ArrFilas = await ObjDb.$queryRawUnsafe<Array<{ datos: string }>>(`SELECT (SELECT * FROM ${StrTabla} FOR JSON PATH, INCLUDE_NULL_VALUES) datos`);
      const ArrDatos: unknown[] = JSON.parse(ArrFilas[0]?.datos ?? "[]");
      ObjHuellas[StrTabla] = Pruebas_hash(JSON.stringify(ArrDatos.map(Obj => JSON.stringify(Obj)).sort()));
    }
    return ObjHuellas;
  }
  try {
    await Pruebas_servidor();
    const ArrAplicadas = await ObjDb.$queryRaw<Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>>`SELECT migration_name,checksum,finished_at,rolled_back_at FROM dbo._prisma_migrations`;
    assert.ok(ArrAplicadas.every(Obj => Obj.finished_at || Obj.rolled_back_at), "Existe una migración fallida sin resolver");
    const ArrVigentes = ArrAplicadas.filter(Obj => Obj.finished_at && !Obj.rolled_back_at);
    const ArrDirectorios = (await readdir("prisma/migrations", { withFileTypes: true })).filter(Obj => Obj.isDirectory()).map(Obj => Obj.name).sort();
    assert.deepEqual(ArrDirectorios.filter(Str => !ArrVigentes.some(Obj => Obj.migration_name === Str)), [StrMigracion]);
    for (const Obj of ArrVigentes) assert.equal(Pruebas_hash(await readFile(`prisma/migrations/${Obj.migration_name}/migration.sql`, "utf8")), Obj.checksum, `Checksum distinto: ${Obj.migration_name}`);
    const ObjAntes = await Pruebas_huellas();
    await Pruebas_servidor();
    const ObjResultado = await ObjEjecutar(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: StrUrl }, maxBuffer: 1024 * 1024 });
    console.log(ObjResultado.stdout);
    assert.deepEqual(await Pruebas_huellas(), ObjAntes);
    const ArrChecks = await ObjDb.$queryRaw<Array<{ name: string; is_disabled: boolean; is_not_trusted: boolean }>>`SELECT name,is_disabled,is_not_trusted FROM sys.check_constraints WHERE name IN ('CK_concentrados_ingrediente','CK_elaboraciones_detalle')`;
    assert.equal(ArrChecks.length, 2);
    assert.ok(ArrChecks.every(Obj => !Obj.is_disabled && !Obj.is_not_trusted));
    console.log(`Datos intactos: ${Object.keys(ObjAntes).length} tablas comparadas. Ambos CHECK activos y validados.`);
    console.log((await ObjEjecutar(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "status"], { env: { ...process.env, DATABASE_URL: StrUrl } })).stdout);
  } finally { await ObjDb.$disconnect(); }
}
Pruebas_aplicar().catch(ObjError => {
  console.error(ObjError instanceof Error && !("cmd" in ObjError) ? ObjError.message : "Falló la ejecución de Prisma; no se muestran argumentos de conexión.");
  process.exitCode = 1;
});
