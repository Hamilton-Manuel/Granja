import { spawn } from "node:child_process";
import { BaseDatos_exigirBaseActual, BaseDatos_desconectar } from "../dist/src/database/prisma.js";

const StrOperacion = process.argv[2];
try {
  if (!["status", "migrate", "bootstrap"].includes(StrOperacion) || process.argv.length !== 3) {
    throw new Error("Use status, migrate o bootstrap.");
  }
  const StrBase = process.env.BASE_DATOS_ESPERADA;
  if (!StrBase) throw new Error("BASE_DATOS_ESPERADA es obligatoria.");
  await BaseDatos_exigirBaseActual(StrBase);
  await BaseDatos_desconectar();
  const ArrArgumentos = StrOperacion === "bootstrap"
    ? ["dist/src/scripts/bootstrap-usuarios.js"]
    : ["node_modules/prisma/build/index.js", "migrate", StrOperacion === "migrate" ? "deploy" : "status"];
  const ObjHijo = spawn(process.execPath, ArrArgumentos, { stdio: "inherit" });
  for (const StrSenal of ["SIGTERM", "SIGINT"]) process.once(StrSenal, () => ObjHijo.kill(StrSenal));
  process.exitCode = await new Promise((ObjResolver, ObjRechazar) => {
    ObjHijo.once("error", ObjRechazar);
    ObjHijo.once("exit", (IntCodigo) => ObjResolver(IntCodigo ?? 1));
  });
} catch {
  console.error("Operación cancelada. Revise operación, configuración, conexión y BASE_DATOS_ESPERADA.");
  process.exitCode = 1;
} finally { await BaseDatos_desconectar(); }
