import assert from "node:assert/strict";
import test from "node:test";
import { Configuracion_validarAlmacenamiento } from "./configuracion-entorno.js";

test("Configuracion_validarAlmacenamiento acepta exactamente un metodo", () => {
  assert.doesNotThrow(() => Configuracion_validarAlmacenamiento({ AZURE_STORAGE_CONNECTION_STRING: "UseDevelopmentStorage=true" }));
  assert.doesNotThrow(() => Configuracion_validarAlmacenamiento({ AZURE_STORAGE_ACCOUNT_URL: "https://cuenta.blob.core.windows.net" }));
});

test("Configuracion_validarAlmacenamiento rechaza ausencia y simultaneidad", () => {
  assert.throws(() => Configuracion_validarAlmacenamiento({}));
  assert.throws(() => Configuracion_validarAlmacenamiento({ AZURE_STORAGE_CONNECTION_STRING: "cadena", AZURE_STORAGE_ACCOUNT_URL: "https://cuenta.blob.core.windows.net" }));
});
