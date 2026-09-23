// Orquestador local: no usa DATABASE_URL ni ejecuta el entrypoint de producción.
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "dotenv";
const ObjEjecutar = promisify(execFile);
const StrContexto = "desktop-linux";
async function Pruebas_docker(...ArrArgumentos) { return (await ObjEjecutar("docker", ["--context", StrContexto, ...ArrArgumentos])).stdout.trim(); }
try {
  const StrEndpoint = JSON.parse(await Pruebas_docker("context", "inspect", StrContexto, "--format", "{{json .Endpoints.docker.Host}}"));
  if (StrEndpoint !== "npipe:////./pipe/dockerDesktopLinuxEngine") throw new Error("Docker Desktop local no verificado");
  const StrId = JSON.parse(await Pruebas_docker("inspect", "--format", "{{json .Id}}", "granja-database"));
  const ObjEtiquetas = JSON.parse(await Pruebas_docker("inspect", "--format", "{{json .Config.Labels}}", StrId));
  const BoolActivo = JSON.parse(await Pruebas_docker("inspect", "--format", "{{json .State.Running}}", StrId));
  if (!BoolActivo || !/^[a-f0-9]{64}$/.test(StrId) || ObjEtiquetas["com.docker.compose.project"] !== "granja-el-chiflon" || ObjEtiquetas["com.docker.compose.service"] !== "database" ||
      resolve(ObjEtiquetas["com.docker.compose.project.working_dir"] ?? "").toLowerCase() !== resolve("..").toLowerCase()) throw new Error("Contenedor local no verificado");
  const StrImagen = JSON.parse(await Pruebas_docker("image", "inspect", "--format", "{{json .Id}}", "granja/operaciones:azure-prep"));
  const ObjEntornoLocal = parse(await readFile(resolve("../.env")));
  const StrPassword = process.env.DB_SA_PASSWORD ?? ObjEntornoLocal.DB_SA_PASSWORD;
  if (!StrPassword || /[;{}\r\n]/.test(StrPassword)) throw new Error("Credencial local ausente o no compatible con el formato de pruebas");
  console.log("Verificado Docker Desktop local; pruebas por loopback en red del contenedor", StrId.slice(0, 12));
  const ArrArgumentos = ["--context", StrContexto, "run", "--rm", "--pull", "never", "--network", `container:${StrId}`,
    "--mount", `type=bind,source=${process.cwd()},target=/source,readonly`,
    "--mount", `type=bind,source=${resolve("../frontend/src/utils/fecha.ts")},target=/fecha-frontend.ts,readonly`,
    "--env", "DB_SA_PASSWORD", "--env", `CONCENTRADOS_CONTENEDOR_ID=${StrId}`,
    "--env", "NODE_ENV=test", "--entrypoint", "node", StrImagen, "/source/src/testing/concentrados-docker-interno.mjs",
    ...(process.argv.includes("--reversion") ? ["--reversion"] : process.argv.includes("--confirmacion") ? ["--confirmacion"] : [])];
  const ObjHijo = spawn("docker", ArrArgumentos, { stdio: "inherit", env: { ...process.env, DB_SA_PASSWORD: StrPassword }, windowsHide: true });
  ObjHijo.on("error", () => { console.error("No se pudo iniciar el contenedor temporal"); process.exitCode = 1; });
  ObjHijo.on("exit", IntCodigo => { process.exitCode = IntCodigo ?? 1; });
} catch (ObjError) {
  // No serializar errores de execFile: podrían contener argumentos de conexión.
  console.error("No se inició SQL temporal:", ObjError instanceof Error && !('cmd' in ObjError) ? ObjError.message : "falló la verificación local");
  process.exitCode = 1;
}
