import assert from "node:assert/strict";
import test from "node:test";

import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import { ArrCatalogoPermisosClientes, ArrCatalogoTiposClientes, Clientes_canonicalizarIdentificacion } from "./clientes.constants.js";
import { ObjCambiarEstadoCliente, ObjConsultaClientes, ObjCrearCliente, ObjEditarCliente, ObjParametroCliente } from "./clientes.schemas.js";
import { Clientes_validarDocumento } from "./clientes.service.js";

test("Clientes canonicaliza NIT y documento sin espacios, guiones ni diferencias de mayusculas", () => {
  assert.equal(Clientes_canonicalizarIdentificacion("  12-34 ab  "), "1234AB");
  assert.equal(Clientes_canonicalizarIdentificacion("  "), null);
  assert.equal(Clientes_canonicalizarIdentificacion(null), null);
  assert.equal(Clientes_canonicalizarIdentificacion(" cf "), "CF");
});

test("Clientes permite CF como NIT pero lo rechaza como documento", () => {
  assert.equal(Clientes_canonicalizarIdentificacion("CF"), "CF");
  assert.throws(() => Clientes_validarDocumento("CF"), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "VALIDACION_INVALIDA");
  assert.doesNotThrow(() => Clientes_validarDocumento(null));
});

test("schema de creacion exige tipo y nombre y no acepta campos administrados por servidor", () => {
  assert.equal(ObjCrearCliente.safeParse({ tipoClienteId: 1, nombreCompleto: "Cliente" }).success, true);
  for (const ObjCampo of [{ codigo: "CLI000001" }, { activo: false }, { fechaCreacion: "x" }, { fechaActualizacion: "x" }]) {
    assert.equal(ObjCrearCliente.safeParse({ tipoClienteId: 1, nombreCompleto: "Cliente", ...ObjCampo }).success, false);
  }
  assert.equal(ObjCrearCliente.safeParse({ nombreCompleto: "Cliente" }).success, false);
});

test("schema de edicion es parcial, no acepta codigo y requiere un cambio", () => {
  assert.equal(ObjEditarCliente.safeParse({ nombreCompleto: "Nuevo" }).success, true);
  assert.equal(ObjEditarCliente.safeParse({}).success, false);
  assert.equal(ObjEditarCliente.safeParse({ codigo: "CLI000001" }).success, false);
});

test("consulta, ID y estado aplican paginacion y validaciones cerradas", () => {
  assert.deepEqual(ObjConsultaClientes.parse({}), { pagina: 1, limite: 20 });
  assert.equal(ObjConsultaClientes.safeParse({ limite: 101 }).success, false);
  assert.equal(ObjConsultaClientes.safeParse({ estado: "ACTIVO", tipoClienteId: "2" }).success, true);
  assert.equal(ObjParametroCliente.safeParse({ clienteId: "1" }).success, true);
  assert.equal(ObjParametroCliente.safeParse({ clienteId: "0" }).success, false);
  assert.equal(ObjCambiarEstadoCliente.safeParse({ activo: false }).success, true);
});

test("catalogos iniciales de Clientes contienen cuatro permisos y dos tipos", () => {
  assert.deepEqual(ArrCatalogoPermisosClientes.map((ObjPermiso) => ObjPermiso.StrCodigo), ["CLIENTES_CONSULTAR", "CLIENTES_CREAR", "CLIENTES_EDITAR", "CLIENTES_CAMBIAR_ESTADO"]);
  assert.deepEqual(ArrCatalogoTiposClientes.map((ObjTipo) => ObjTipo.StrCodigo), ["PERSONA_INDIVIDUAL", "PERSONA_JURIDICA"]);
});
