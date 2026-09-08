// Solo Docker local y SELECT sobre SQL local; no aplica migraciones ni bootstrap.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import dotenv from "dotenv";

const ObjVariables = dotenv.parse(fs.readFileSync(new URL("../../.env", import.meta.url)));
const StrUrl = ObjVariables.DATABASE_URL ?? "";
if (!/^sqlserver:\/\/(localhost|127\.0\.0\.1):1433;/i.test(StrUrl)) throw new Error("La validación exige SQL local en localhost:1433.");
const ObjEnv = { ...process.env, DATABASE_URL: StrUrl.replace(/^sqlserver:\/\/[^;]+;/, "sqlserver://host.docker.internal:1433;") };
function Docker_ejecutar(ArrArgumentos, BoolCapturar = false) {
  const ObjResultado = spawnSync("docker", ArrArgumentos, { env: ObjEnv, encoding: "utf8", stdio: BoolCapturar ? "pipe" : "inherit" });
  if (ObjResultado.status !== 0) throw new Error("Falló la validación Docker local; revise el comando anterior.");
  return ObjResultado.stdout?.trim();
}

const StrModo = process.argv[2] ?? "tests";
if (StrModo === "tests") {
  Docker_ejecutar(["run", "--rm", "--env", "DATABASE_URL", "--env", "NODE_ENV=test", "granja-backend-pruebas:azure-prep", "sh", "-c", "node --version && npm run typecheck && npm test && npm run build && npx prisma validate"]);
} else if (StrModo === "runtime") {
  const StrNombre = `granja-validacion-backend-${process.pid}`;
  try {
    Docker_ejecutar(["run", "-d", "--name", StrNombre, "--env", "DATABASE_URL", "--env", "NODE_ENV=production", "--env", "CORS_FRONTEND_ORIGIN=https://frontend.example.invalid", "--env", "TRUST_PROXY_HOPS=1", "--env", "AZURE_STORAGE_ACCOUNT_URL=valor-invalido", "granja/backend:azure-prep"], true);
    const StrPrueba = `
      const assert = (await import('node:assert/strict')).default;
      const argon2 = (await import('argon2')).default;
      const sharp = (await import('sharp')).default;
      const hash = await argon2.hash('prueba-local', {type:argon2.argon2id});
      assert.equal(await argon2.verify(hash,'prueba-local'),true);
      const foto = await sharp({create:{width:2,height:2,channels:3,background:'red'}}).webp().toBuffer();
      assert.equal((await sharp(foto).metadata()).format,'webp');
      for(let i=0;i<30;i++){try {const r=await fetch('http://127.0.0.1:3000/api/health');if(r.ok)break;} catch {} await new Promise(r=>setTimeout(r,500));}
      assert.equal((await fetch('http://127.0.0.1:3000/api/health')).status,200);
      assert.equal((await fetch('http://127.0.0.1:3000/api/health/live')).status,200);
      assert.equal((await fetch('http://127.0.0.1:3000/api/usuarios/login',{method:'POST'})).status,403);
      const fs=await import('node:fs');
      for(const p of ['/app/.env','/app/prisma','/app/src','/app/node_modules/prisma','/app/dist/src/testing','/app/dist/src/scripts'])assert.equal(fs.existsSync(p),false);
      assert.notEqual(process.getuid(),0);
      console.log('Runtime: Node '+process.version+' '+process.platform+'/'+process.arch+'; argon2, sharp, SQL/Prisma, health y liveness OK con configuración Blob inválida.');
    `;
    Docker_ejecutar(["exec", StrNombre, "node", "--input-type=module", "-e", StrPrueba]);
    Docker_ejecutar(["stop", "--time", "30", StrNombre], true);
    const StrLogs = Docker_ejecutar(["logs", StrNombre], true);
    assert.match(StrLogs, /Cierre solicitado por SIGTERM/);
    assert.match(StrLogs, /cerrados correctamente/);
    assert.equal(Docker_ejecutar(["inspect", "--format", "{{.State.ExitCode}}", StrNombre], true), "0");
    console.log("SIGTERM: cierre ordenado y exit code 0.");
  } finally { Docker_ejecutar(["rm", "-f", StrNombre], true); }
} else if (StrModo === "operaciones") {
  const StrBase = /(?:^|;)database=([^;]+)/i.exec(StrUrl)?.[1];
  if (!StrBase) throw new Error("Nombre de base local requerido.");
  Docker_ejecutar(["run", "--rm", "--env", "DATABASE_URL", "--env", `BASE_DATOS_ESPERADA=${StrBase}`, "granja/operaciones:azure-prep", "status"]);
  const ObjRechazo = spawnSync("docker", ["run", "--rm", "--env", "DATABASE_URL", "--env", "BASE_DATOS_ESPERADA=base_que_no_coincide", "granja/operaciones:azure-prep", "status"], { env: ObjEnv, encoding: "utf8" });
  assert.equal(ObjRechazo.status, 1);
  assert.doesNotMatch(ObjRechazo.stdout + ObjRechazo.stderr, /password=/i);
  console.log("Operaciones: status local 11/11 y rechazo de base equivocada OK; no se ejecutó migrate ni bootstrap.");
} else { throw new Error("Use tests, runtime u operaciones."); }
