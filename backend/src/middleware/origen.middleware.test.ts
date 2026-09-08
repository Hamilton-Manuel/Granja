import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { Middleware_crearProteccionOrigen } from "./origen.middleware.js";
import { Middleware_manejarErrores } from "./manejo-errores.middleware.js";

let ObjServidor: Server;
let StrBase: string;
let IntMutaciones = 0;
before(async () => {
  const ObjApp = express();
  ObjApp.set("trust proxy", 1);
  ObjApp.use(Middleware_crearProteccionOrigen({ NODE_ENV: "production", CORS_FRONTEND_ORIGIN: "https://frontend.example.com" }));
  ObjApp.get("/", (Req, Res) => Res.json({ ip: Req.ip }));
  ObjApp.post("/", (_Req, Res) => { IntMutaciones++; Res.sendStatus(204); });
  ObjApp.get("/error", (_Req, _Res, Next) => Next(new Error("secreto")));
  ObjApp.use(Middleware_manejarErrores);
  ObjServidor = ObjApp.listen(0, "127.0.0.1");
  await new Promise<void>((ObjResolver) => ObjServidor.once("listening", ObjResolver));
  StrBase = `http://127.0.0.1:${(ObjServidor.address() as AddressInfo).port}`;
});
after(async () => { await new Promise<void>((ObjResolver) => ObjServidor.close(() => ObjResolver())); });
test("CORS exacto y errores sanitizados con credentials", async () => {
  const ObjRespuesta = await fetch(`${StrBase}/error`, { headers: { Origin: "https://frontend.example.com" } });
  assert.equal(ObjRespuesta.status, 500);
  assert.equal(ObjRespuesta.headers.get("access-control-allow-origin"), "https://frontend.example.com");
  assert.equal(ObjRespuesta.headers.get("access-control-allow-credentials"), "true");
  assert.match(ObjRespuesta.headers.get("vary")!, /Origin/);
  assert.doesNotMatch(await ObjRespuesta.text(), /secreto/);
});
test("preflight sin sesión solo acepta métodos y cabeceras previstos", async () => {
  const ObjHeaders = { Origin: "https://frontend.example.com", "Access-Control-Request-Method": "PATCH", "Access-Control-Request-Headers": "Content-Type" };
  assert.equal((await fetch(StrBase, { method: "OPTIONS", headers: ObjHeaders })).status, 204);
  assert.equal((await fetch(StrBase, { method: "OPTIONS", headers: { ...ObjHeaders, "Access-Control-Request-Headers": "X-Evil" } })).status, 403);
});
test("origen ausente, null, ajeno o engañoso no ejecutan multipart mutable", async () => {
  for (const StrOrigen of [undefined, "null", "https://evil.example", "https://frontend.example.com.evil.example"]) {
    const ObjRespuesta = await fetch(StrBase, { method: "POST", headers: StrOrigen ? { Origin: StrOrigen } : {}, body: new FormData() });
    assert.equal(ObjRespuesta.status, 403);
    assert.equal(ObjRespuesta.headers.get("access-control-allow-origin"), null);
  }
  assert.equal(IntMutaciones, 0);
  assert.equal((await fetch(StrBase, { method: "POST", headers: { Origin: "https://frontend.example.com" } })).status, 204);
  assert.equal(IntMutaciones, 1);
});
test("un hop ignora prefijos falsificados de X-Forwarded-For", async () => {
  const ObjRespuesta = await fetch(StrBase, { headers: { "X-Forwarded-For": "203.0.113.99, 198.51.100.7" } });
  assert.equal((await ObjRespuesta.json() as { ip: string }).ip, "198.51.100.7");
});
