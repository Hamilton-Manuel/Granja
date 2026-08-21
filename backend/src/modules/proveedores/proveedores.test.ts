import assert from "node:assert/strict";
import test from "node:test";

import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import { ArrCatalogoPermisosProveedores, ArrCatalogoTiposProveedores, Proveedores_canonicalizarIdentificacion } from "./proveedores.constants.js";
import { ObjConsultaProveedores, ObjCrearProveedor, ObjEditarProveedor, ObjParametroProveedor } from "./proveedores.schemas.js";
import { Proveedores_validarCf } from "./proveedores.service.js";

test("Proveedores canonicaliza identificaciones y convierte vacios en null", () => {
  assert.equal(Proveedores_canonicalizarIdentificacion(" gt-123 4 "), "GT1234");
  assert.equal(Proveedores_canonicalizarIdentificacion(" -  "), null);
});

test("Proveedores rechaza CF tanto en NIT como en documento", () => {
  assert.throws(() => Proveedores_validarCf("CF", null), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "VALIDACION_INVALIDA");
  assert.throws(() => Proveedores_validarCf(null, "CF"), ErrorAplicacion);
  assert.doesNotThrow(() => Proveedores_validarCf("123", "456"));
});

test("schema de Proveedores exige tipo y nombre y rechaza campos de servidor", () => {
  assert.equal(ObjCrearProveedor.safeParse({ tipoProveedorId: 1, nombre: "Proveedor" }).success, true);
  assert.equal(ObjCrearProveedor.safeParse({ tipoProveedorId: 1, nombre: "Proveedor", codigo: "PRO000001" }).success, false);
  assert.equal(ObjCrearProveedor.safeParse({ tipoProveedorId: 1, nombre: "Proveedor", activo: false }).success, false);
});

test("edicion de Proveedores requiere al menos un campo permitido", () => {
  assert.equal(ObjEditarProveedor.safeParse({ nombreComercial: null }).success, true);
  assert.equal(ObjEditarProveedor.safeParse({}).success, false);
  assert.equal(ObjEditarProveedor.safeParse({ codigo: "PRO000001" }).success, false);
});

test("consulta de Proveedores usa defaults y limite maximo 100", () => {
  assert.deepEqual(ObjConsultaProveedores.parse({}), { pagina: 1, limite: 20 });
  assert.equal(ObjConsultaProveedores.safeParse({ pagina: "2", limite: "100", estado: "INACTIVO", tipoProveedorId: "1" }).success, true);
  assert.equal(ObjConsultaProveedores.safeParse({ limite: 101 }).success, false);
  assert.equal(ObjParametroProveedor.safeParse({ proveedorId: "3" }).success, true);
});

test("catalogos iniciales de Proveedores contienen cuatro permisos y dos tipos", () => {
  assert.equal(ArrCatalogoPermisosProveedores.length, 4);
  assert.deepEqual(ArrCatalogoTiposProveedores.map((ObjTipo) => ObjTipo.StrCodigo), ["PERSONA_INDIVIDUAL", "PERSONA_JURIDICA"]);
});
