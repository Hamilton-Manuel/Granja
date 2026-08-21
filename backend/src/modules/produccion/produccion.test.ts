import assert from "node:assert/strict";
import test from "node:test";
import { ArrCatalogoPermisosProduccion, ArrPermisosProduccionOperador, Produccion_canonicalizarCodigo } from "./produccion.constants.js";
import { ObjCompra, ObjCrearLote, ObjCrearMedicion, ObjIngresoInicial, ObjNacimiento, ObjTraslado } from "./produccion.schemas.js";

const ObjAnimal = { identificacion: "A-001", tipoAnimalId: 1, sexo: "HEMBRA" as const };

test("Produccion define permisos granulares y minimo privilegio para operador", () => {
  assert.equal(ArrCatalogoPermisosProduccion.length, 19);
  assert.deepEqual([...ArrPermisosProduccionOperador], [
    "PRODUCCION_CONSULTAR",
    "PRODUCCION_NACIMIENTOS_CREAR",
    "PRODUCCION_TRASLADOS_CREAR",
    "PRODUCCION_MEDICIONES_CREAR",
  ]);
  assert.equal(ArrPermisosProduccionOperador.includes("PRODUCCION_LOTES_CREAR" as never), false);
  assert.equal(ArrPermisosProduccionOperador.includes("PRODUCCION_COMPRAS_CREAR" as never), false);
});

test("Produccion exige lote existente y rechaza definicion indirecta de lote", () => {
  assert.equal(ObjCrearLote.safeParse({ tipoAnimalId: 1, codigo: "LOT-1", nombre: "Lote 1" }).success, true);
  for (const ObjEsquema of [ObjIngresoInicial, ObjNacimiento]) {
    assert.equal(ObjEsquema.safeParse({ lote: { codigo: "NUEVO" }, animales: [ObjAnimal] }).success, false);
    assert.equal(ObjEsquema.safeParse({ loteDestinoId: 1, animales: [ObjAnimal] }).success, true);
  }
});

test("Produccion registra costo individual exacto en cada animal comprado", () => {
  const ObjResultado = ObjCompra.safeParse({ proveedorId: 1, loteDestinoId: 2, animales: [
    { ...ObjAnimal, costoAdquisicion: "4500.00" },
    { ...ObjAnimal, identificacion: "A-002", costoAdquisicion: "4750.25" },
  ] });
  assert.equal(ObjResultado.success, true);
  assert.equal(ObjCompra.safeParse({ proveedorId: 1, loteDestinoId: 2, costoUnitario: "4500.00", animales: [ObjAnimal] }).success, false);
});

test("Produccion limita PESO a medicion individual positiva", () => {
  assert.equal(ObjCrearMedicion.safeParse({ animalId: 1, valor: "25.5000" }).success, true);
  assert.equal(ObjCrearMedicion.safeParse({ loteProduccionId: 1, valor: "25.5000" }).success, false);
  assert.equal(ObjCrearMedicion.safeParse({ animalId: 1, valor: "0.0000" }).success, false);
});

test("Produccion traslado solo acepta lotes existentes y animales identificados", () => {
  assert.equal(ObjTraslado.safeParse({ loteOrigenId: 1, loteDestinoId: 2, animalIds: [1], motivo: "Reclasificacion" }).success, true);
  assert.equal(ObjTraslado.safeParse({ loteOrigenId: 1, loteDestino: { codigo: "NUEVO" }, animalIds: [1], motivo: "Reclasificacion" }).success, false);
});

test("Produccion canonicaliza codigos sin generar identificadores", () => {
  assert.equal(Produccion_canonicalizarCodigo(" lote 01 "), "LOTE01");
});
