import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { ObjRegistrarSanidad, ObjConsultaSanidad } from "./sanidad.schemas.js";
import {
  ArrCatalogoPermisosSanidad,
  ArrPermisosSanidadOperador,
  ArrTiposSanidad,
  ArrViasSanidad,
  ArrUnidadesSanidad,
} from "./sanidad.constants.js";
const ObjBase = {
  tipoAplicacionId: 1,
  fechaAplicacion: "2026-08-24T07:00:00.000-06:00",
  destino: { tipo: "ANIMAL", animalId: 1 },
  motivo: "Vacunación",
  detalles: [],
};
test("Sanidad acepta aplicación sin productos", () =>
  assert.equal(ObjRegistrarSanidad.safeParse(ObjBase).success, true));
test("Sanidad conserva vía por detalle y Decimal string", () =>
  assert.equal(
    ObjRegistrarSanidad.safeParse({
      ...ObjBase,
      detalles: [
        {
          productoId: 1,
          dosisClinica: "5.0000",
          unidadDosisId: 1,
          viaAdministracionId: 1,
          alcanceDosis: "INDIVIDUAL",
          fuentes: [{ inventarioId: 1, cantidad: "2.5000" }],
        },
      ],
    }).success,
    true,
  ));
test("Sanidad rechaza dosis o consumo cero", () =>
  assert.equal(
    ObjRegistrarSanidad.safeParse({
      ...ObjBase,
      detalles: [
        {
          productoId: 1,
          dosisClinica: "0.0000",
          unidadDosisId: 1,
          viaAdministracionId: 1,
          alcanceDosis: "INDIVIDUAL",
          fuentes: [{ inventarioId: 1, cantidad: "0" }],
        },
      ],
    }).success,
    false,
  ));
test("catálogos estructurales y permisos aprobados", () => {
  assert.equal(ArrCatalogoPermisosSanidad.length, 14);
  assert.deepEqual(
    [...ArrPermisosSanidadOperador],
    ["SANIDAD_CONSULTAR", "SANIDAD_REGISTRAR"],
  );
  assert.equal(ArrTiposSanidad.length, 6);
  assert.equal(ArrViasSanidad.length, 6);
  assert.equal(ArrUnidadesSanidad.length, 6);
});
test("consulta usa paginación estable", () =>
  assert.deepEqual(ObjConsultaSanidad.parse({}), { pagina: 1, limite: 20 }));
test("router no expone DELETE, protege registro y reversión", async () => {
  const Str = await readFile(
    new URL("./sanidad.routes.ts", import.meta.url),
    "utf8",
  );
  assert.equal(Str.includes(".delete("), false);
  assert.match(Str, /SANIDAD_REGISTRAR/);
  assert.match(Str, /SANIDAD_REVERTIR/);
});
test("Inventario se integra por fuente y primitivas, sin motor duplicado", async () => {
  const Str = await readFile(
    new URL("./sanidad.repository.ts", import.meta.url),
    "utf8",
  );
  assert.match(Str, /Inventario_aplicarMovimientoConTx/);
  assert.match(Str, /Inventario_revertirMovimientoConTx/);
  assert.match(Str, /subtipo: "SANIDAD"/);
});
