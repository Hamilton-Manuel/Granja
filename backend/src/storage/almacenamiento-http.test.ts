import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { BaseDatos_obtenerCliente, BaseDatos_desconectar } from "../database/prisma.js";
import { Almacenamiento_reiniciarParaPruebas } from "./almacenamiento-blob.js";

async function Servidor_abrir(ObjServidor: Server): Promise<string> {
  ObjServidor.listen(0, "127.0.0.1");
  await new Promise<void>((ObjResolver) => ObjServidor.once("listening", ObjResolver));
  return `http://127.0.0.1:${(ObjServidor.address() as AddressInfo).port}`;
}
async function Servidor_cerrarPrueba(ObjServidor: Server): Promise<void> {
  ObjServidor.closeAllConnections();
  await new Promise<void>((ObjResolver) => ObjServidor.close(() => ObjResolver()));
}

test("API conserva health y auth con Blob degradado, luego recupera foto sin reiniciar", async (ObjContexto) => {
  const ObjVariables = { ...process.env };
  let BoolDisponible = false;
  const ObjContenido = Buffer.from("foto-local-de-prueba");
  // Servidor local que simula el protocolo Blob; nunca contacta Azure.
  const ObjBlob = createServer((Req, Res) => {
    if (!BoolDisponible) { Res.statusCode = 503; Res.end(); return; }
    Res.setHeader("x-ms-request-id", "prueba-local");
    Res.setHeader("x-ms-version", "2025-11-05");
    Res.setHeader("ETag", '"prueba"');
    Res.setHeader("Last-Modified", new Date().toUTCString());
    if (Req.method === "PUT") { Res.statusCode = 201; Res.end(); return; }
    if (Req.method === "HEAD") { Res.end(); return; }
    Res.setHeader("Content-Type", "image/webp");
    Res.setHeader("Content-Length", ObjContenido.length);
    Res.end(ObjContenido);
  });
  const StrBlob = await Servidor_abrir(ObjBlob);
  let ObjApi: Server | undefined;
  try {
    const StrClaveFicticia = Buffer.from("credencial-ficticia-del-servidor-http-local").toString("base64");
    process.env.AZURE_STORAGE_CONNECTION_STRING = `DefaultEndpointsProtocol=http;AccountName=prueba;AccountKey=${StrClaveFicticia};BlobEndpoint=${StrBlob}/prueba;`;
    delete process.env.AZURE_STORAGE_ACCOUNT_URL;
    process.env.AZURE_BLOB_CONTAINER_ANIMALES = "prueba";
    Almacenamiento_reiniciarParaPruebas();
    const ObjPrisma = BaseDatos_obtenerCliente();
    // Prisma expone sus métodos mediante Proxy, sin descriptor propio para mock.method.
    function Pruebas_reemplazarMetodo(ObjDestino: object, StrMetodo: string, ObjFuncion: (...ArrArgumentos: unknown[]) => unknown): void {
      const ObjOriginal: unknown = Reflect.get(ObjDestino, StrMetodo);
      Reflect.set(ObjDestino, StrMetodo, ObjFuncion);
      ObjContexto.after(() => { Reflect.set(ObjDestino, StrMetodo, ObjOriginal); });
    }
    let BoolSqlDisponible = true;
    Pruebas_reemplazarMetodo(ObjPrisma, "$queryRaw", async () => { if (!BoolSqlDisponible) throw new Error("SQL caído"); return [{ estado: 1 }]; });
    Pruebas_reemplazarMetodo(ObjPrisma.usuarioSesion, "findUnique", async () => ({
      sesionId: 1, usuarioId: 1, estado: "ACTIVA", fechaExpiracion: new Date("2099-01-01T00:00:00Z"),
      usuario: { estado: "ACTIVO", permisosDirectos: [], rol: { activo: true, rolesPermisos: [{ permiso: { codigo: "PRODUCCION_CONSULTAR", activo: true } }] } },
    }));
    Pruebas_reemplazarMetodo(ObjPrisma.produccionAnimalFoto, "findFirst", async () => ({ blobNombre: "foto.webp", tamanoBytes: ObjContenido.length }));
    const { Api_crearAplicacion } = await import("../app.js");
    ObjApi = createServer(Api_crearAplicacion());
    const StrApi = await Servidor_abrir(ObjApi);
    assert.equal((await fetch(`${StrApi}/api/health/live`)).status, 200);
    assert.equal((await fetch(`${StrApi}/api/health`)).status, 200);
    assert.equal((await fetch(`${StrApi}/api/produccion/animales/1/foto`)).status, 401);
    const ObjFallo = await fetch(`${StrApi}/api/produccion/animales/1/foto`, { headers: { Cookie: "id=token-ficticio" } });
    assert.equal(ObjFallo.status, 503);
    assert.equal((await ObjFallo.json() as { error: { codigo: string } }).error.codigo, "ALMACENAMIENTO_NO_DISPONIBLE");
    assert.equal((await fetch(`${StrApi}/api/health`)).status, 200);
    BoolDisponible = true;
    const ObjFoto = await fetch(`${StrApi}/api/produccion/animales/1/foto`, { headers: { Cookie: "id=token-ficticio" } });
    assert.equal(ObjFoto.status, 200);
    assert.equal(await ObjFoto.text(), ObjContenido.toString());
    BoolSqlDisponible = false;
    assert.equal((await fetch(`${StrApi}/api/health`)).status, 503);
    assert.equal((await fetch(`${StrApi}/api/health/live`)).status, 200);
  } finally {
    if (ObjApi) await Servidor_cerrarPrueba(ObjApi);
    await Servidor_cerrarPrueba(ObjBlob);
    await BaseDatos_desconectar();
    for (const StrClave of ["AZURE_STORAGE_CONNECTION_STRING", "AZURE_STORAGE_ACCOUNT_URL", "AZURE_BLOB_CONTAINER_ANIMALES"]) {
      if (ObjVariables[StrClave] === undefined) delete process.env[StrClave]; else process.env[StrClave] = ObjVariables[StrClave];
    }
    Almacenamiento_reiniciarParaPruebas();
  }
});
