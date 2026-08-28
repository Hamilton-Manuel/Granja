import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Autenticacion_crearCookieEliminada,
  Autenticacion_crearCookieSesion,
  Autenticacion_generarTokenSesion,
  Autenticacion_hashearContrasena,
  Autenticacion_hashearTokenSesion,
  Autenticacion_obtenerTokenCookie,
  Autenticacion_verificarContrasena,
} from "./autenticacion.js";
import {
  ObjCambiarContrasena,
  ObjCrearUsuario,
  ObjEditarUsuario,
  ObjLoginUsuario,
} from "../modules/usuarios/usuarios.schemas.js";

test("Argon2id genera y verifica contraseñas correctamente", async () => {
  const StrContrasena = "clave segura de prueba";
  const StrHash = await Autenticacion_hashearContrasena(StrContrasena);
  assert.match(StrHash, /^\$argon2id\$/);
  assert.equal(await Autenticacion_verificarContrasena(StrHash, StrContrasena), true);
  assert.equal(await Autenticacion_verificarContrasena(StrHash, "otra clave"), false);
});

test("el token opaco tiene 256 bits y solo su SHA-256 se destina a persistencia", () => {
  const StrToken = Autenticacion_generarTokenSesion();
  const StrHash = Autenticacion_hashearTokenSesion(StrToken);
  assert.equal(Buffer.from(StrToken, "base64url").length, 32);
  assert.match(StrHash, /^[a-f0-9]{64}$/);
  assert.notEqual(StrHash, StrToken);
});

test("la cookie de sesión es HttpOnly, Strict y no define Domain", () => {
  const StrCookie = Autenticacion_crearCookieSesion("token-prueba", new Date("2030-01-01T00:00:00.000Z"), true);
  assert.match(StrCookie, /HttpOnly/);
  assert.match(StrCookie, /SameSite=Strict/);
  assert.match(StrCookie, /Secure/);
  assert.equal(StrCookie.includes("Domain="), false);
  assert.equal(Autenticacion_obtenerTokenCookie(StrCookie), "token-prueba");
  assert.match(Autenticacion_crearCookieEliminada(true), /Max-Age=0/);
});

test("la política exige de 8 a 128 caracteres sin reglas de composición", () => {
  const ObjBaseUsuario = {
    rolId: 1,
    nombreCompleto: "Usuario de prueba",
    nombreUsuario: "usuario.prueba",
    correo: "usuario@example.com",
  };
  assert.equal(ObjCrearUsuario.safeParse({ ...ObjBaseUsuario, contrasena: "abcdefgh" }).success, true);
  assert.equal(ObjCambiarContrasena.safeParse({ contrasenaActual: "actual", contrasenaNueva: "a".repeat(128) }).success, true);
  assert.equal(ObjCrearUsuario.safeParse({ ...ObjBaseUsuario, contrasena: "a".repeat(7) }).success, false);
  assert.equal(ObjCrearUsuario.safeParse({ ...ObjBaseUsuario, contrasena: "a".repeat(129) }).success, false);
  assert.equal(ObjEditarUsuario.safeParse({ nuevaContrasena: "abcdefgh" }).success, true);
  assert.equal(ObjEditarUsuario.safeParse({ nuevaContrasena: "a".repeat(7) }).success, false);
});

test("el login acepta una contraseña incorrecta corta para responderla como credencial inválida", () => {
  assert.equal(ObjLoginUsuario.safeParse({ identificador: "usuario", contrasena: "x" }).success, true);
});
