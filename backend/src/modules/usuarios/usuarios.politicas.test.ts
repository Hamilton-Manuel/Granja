import assert from "node:assert/strict";
import { test } from "node:test";

import { ArrCodigosPermisosUsuarios, ArrDefinicionesRolesUsuarios, ObjRolesUsuarios } from "./usuarios.constants.js";
import { Usuarios_esRolReservado, Usuarios_obtenerIdsFaltantes, Usuarios_puedeOperarSobreCuenta } from "./usuarios.politicas.js";

test("WEBMASTER es un rol reservado para creación y asignación administrativa", () => {
  assert.equal(Usuarios_esRolReservado(ObjRolesUsuarios.WEBMASTER), true);
  assert.equal(Usuarios_esRolReservado(ObjRolesUsuarios.ADMINISTRADOR), false);
  assert.equal(Usuarios_esRolReservado(ObjRolesUsuarios.OPERADOR), false);
});

test("otro usuario no puede editar ni revocar sesiones de WEBMASTER", () => {
  assert.equal(Usuarios_puedeOperarSobreCuenta(2, ObjRolesUsuarios.ADMINISTRADOR, 1, ObjRolesUsuarios.WEBMASTER, "EDITAR"), false);
  assert.equal(Usuarios_puedeOperarSobreCuenta(2, ObjRolesUsuarios.ADMINISTRADOR, 1, ObjRolesUsuarios.WEBMASTER, "REVOCAR_SESIONES"), false);
  assert.equal(Usuarios_puedeOperarSobreCuenta(2, ObjRolesUsuarios.WEBMASTER, 1, ObjRolesUsuarios.WEBMASTER, "EDITAR"), false);
});

test("estado y rol de WEBMASTER nunca cambian mediante el CRUD normal", () => {
  assert.equal(Usuarios_puedeOperarSobreCuenta(1, ObjRolesUsuarios.WEBMASTER, 1, ObjRolesUsuarios.WEBMASTER, "CAMBIAR_ESTADO"), false);
  assert.equal(Usuarios_puedeOperarSobreCuenta(1, ObjRolesUsuarios.WEBMASTER, 1, ObjRolesUsuarios.WEBMASTER, "CAMBIAR_ROL"), false);
});

test("WEBMASTER puede editarse y autorrevocar sus sesiones", () => {
  assert.equal(Usuarios_puedeOperarSobreCuenta(1, ObjRolesUsuarios.WEBMASTER, 1, ObjRolesUsuarios.WEBMASTER, "EDITAR"), true);
  assert.equal(Usuarios_puedeOperarSobreCuenta(1, ObjRolesUsuarios.WEBMASTER, 1, ObjRolesUsuarios.WEBMASTER, "REVOCAR_SESIONES"), true);
});

test("las cuentas no reservadas conservan sus operaciones administrativas", () => {
  assert.equal(Usuarios_puedeOperarSobreCuenta(1, ObjRolesUsuarios.ADMINISTRADOR, 2, ObjRolesUsuarios.OPERADOR, "CAMBIAR_ESTADO"), true);
  assert.equal(Usuarios_puedeOperarSobreCuenta(1, ObjRolesUsuarios.WEBMASTER, 2, ObjRolesUsuarios.ADMINISTRADOR, "CAMBIAR_ROL"), true);
});

test("el catálogo inicial define tres roles, siete permisos y ninguna asignación automática a OPERADOR", () => {
  assert.deepEqual(ArrDefinicionesRolesUsuarios.map((ObjRol) => ObjRol.StrNombre), ["WEBMASTER", "ADMINISTRADOR", "OPERADOR"]);
  assert.equal(ArrCodigosPermisosUsuarios.length, 7);
  const ArrPermisosOperador: string[] = [];
  assert.equal(ArrPermisosOperador.length, 0);
});

test("el cálculo aditivo de vínculos es idempotente", () => {
  assert.deepEqual(Usuarios_obtenerIdsFaltantes([1, 2, 3], []), [1, 2, 3]);
  assert.deepEqual(Usuarios_obtenerIdsFaltantes([1, 2, 3], [1, 2, 3]), []);
  assert.deepEqual(Usuarios_obtenerIdsFaltantes([1, 2, 3], [1, 3]), [2]);
});
