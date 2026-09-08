import assert from "node:assert/strict";
import test from "node:test";
import { Configuracion_validarAlmacenamiento, Configuracion_obtenerEntorno, Configuracion_obtenerAlmacenamiento, Configuracion_validarHttp } from "./configuracion-entorno.js";

test("Configuracion_validarAlmacenamiento acepta exactamente un metodo", () => {
  assert.doesNotThrow(() => Configuracion_validarAlmacenamiento({ AZURE_STORAGE_CONNECTION_STRING: "UseDevelopmentStorage=true" }));
  assert.doesNotThrow(() => Configuracion_validarAlmacenamiento({ AZURE_STORAGE_ACCOUNT_URL: "https://cuenta.blob.core.windows.net" }));
});

test("Configuracion_validarAlmacenamiento rechaza ausencia y simultaneidad", () => {
  assert.throws(() => Configuracion_validarAlmacenamiento({}));
  assert.throws(() => Configuracion_validarAlmacenamiento({ AZURE_STORAGE_CONNECTION_STRING: "cadena", AZURE_STORAGE_ACCOUNT_URL: "https://cuenta.blob.core.windows.net" }));
});

test("configuración Blob inválida no invalida SQL/API", () => {
  const StrAnterior = process.env.AZURE_STORAGE_ACCOUNT_URL;
  try {
    process.env.AZURE_STORAGE_ACCOUNT_URL = "no-es-url";
    assert.doesNotThrow(() => Configuracion_obtenerEntorno());
    assert.throws(() => Configuracion_obtenerAlmacenamiento(), /almacenamiento/);
  } finally {
    if (StrAnterior === undefined) delete process.env.AZURE_STORAGE_ACCOUNT_URL;
    else process.env.AZURE_STORAGE_ACCOUNT_URL = StrAnterior;
  }
});

test("producción HTTP requiere origen HTTPS y mantiene cookies independientes de Blob", () => {
  const ObjBase = { ...Configuracion_obtenerEntorno(), NODE_ENV: "production" as const };
  for (const StrOrigen of ["http://frontend.example.com", "https://localhost", "https://127.0.0.1"]) {
    assert.throws(() => Configuracion_validarHttp({ ...ObjBase, CORS_FRONTEND_ORIGIN: StrOrigen }));
  }
  assert.doesNotThrow(() => Configuracion_validarHttp({ ...ObjBase, CORS_FRONTEND_ORIGIN: "https://frontend.example.com" }));
});
