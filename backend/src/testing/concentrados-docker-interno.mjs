import { cp, mkdir, readFile, symlink } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const ObjLock = JSON.parse(await readFile("/source/package-lock.json", "utf8"));
for (const StrNombre of ["prisma", "@prisma/client", "@prisma/adapter-mssql", "tsx", "zod", "argon2"]) {
  const ObjPaquete = JSON.parse(await readFile(`/app/node_modules/${StrNombre}/package.json`, "utf8"));
  if (ObjPaquete.version !== ObjLock.packages[`node_modules/${StrNombre}`].version) throw new Error(`Dependencia local incompatible: ${StrNombre}`);
}
const StrTrabajo = "/tmp/granja-concentrados";
await mkdir(StrTrabajo);
await symlink("/app/node_modules", `${StrTrabajo}/node_modules`, "dir");
// La regresión temporal existente importa este helper; solo lectura, sin desarrollar frontend.
await mkdir("/tmp/frontend/src/utils", { recursive: true });
await cp("/fecha-frontend.ts", "/tmp/frontend/src/utils/fecha.ts");
for (const StrNombre of ["src", "prisma", "prisma.config.ts", "tsconfig.json", "package.json"]) {
  await cp(`/source/${StrNombre}`, `${StrTrabajo}/${StrNombre}`, { recursive: true });
}
process.chdir(StrTrabajo);
process.env.DATABASE_URL = "sqlserver://127.0.0.1:1433;database=master;user=sa;password=" + process.env.DB_SA_PASSWORD + ";encrypt=true;trustServerCertificate=true";
process.env.CONCENTRADOS_PRUEBAS_INTERNAS = "1";
execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "generate"], { stdio: "inherit" });
const ArrSuites = process.argv.includes("--confirmacion") || process.argv.includes("--reversion") ? ["src/modules/alimentacion/concentrados/concentrados.confirmacion.integration.test.ts"] : [
  "src/modules/alimentacion/concentrados/concentrados.confirmacion.integration.test.ts",
  "src/modules/alimentacion/concentrados/concentrados.integration.test.ts",
  "src/modules/inventario/inventario.fase0.integration.test.ts",
  "src/modules/alimentacion/alimentacion.integration.test.ts",
  "src/modules/alimentacion/alimentacion.formulas.integration.test.ts"];
execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "--test", "--test-concurrency=1", ...(process.argv.includes("--reversion") ? ["--test-name-pattern", "^3C"] : []), ...ArrSuites], { stdio: "inherit" });
