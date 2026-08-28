import assert from "node:assert/strict";
import test from "node:test";
import { ObjRegistrar } from "./alimentacion.schemas.js";

test("Alimentación exige lote en cada fuente física", () => {
  const ObjBase={fechaEfectiva:"2026-08-27T08:00:00.000-06:00",destino:{tipo:"ANIMAL",animalId:1},detalles:[{productoId:1,inventarioId:1,cantidad:"1.0000"}]};
  assert.equal(ObjRegistrar.safeParse(ObjBase).success,false);
  assert.equal(ObjRegistrar.safeParse({...ObjBase,detalles:[{...ObjBase.detalles[0],loteInventarioId:1}]}).success,true);
});
