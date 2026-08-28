import assert from "node:assert/strict";
import test from "node:test";
import { ObjRegistrarSanidad } from "./sanidad.schemas.js";

const ObjBase={tipoAplicacionId:1,fechaAplicacion:"2026-08-27T08:00:00.000-06:00",destino:{tipo:"ANIMAL" as const,animalId:1},motivo:"Prueba",detalles:[{productoId:1,dosisClinica:"1.0000",unidadDosisId:1,viaAdministracionId:1,alcanceDosis:"INDIVIDUAL" as const,fuentes:[{inventarioId:1,cantidad:"1.0000"}]}]};
test("Sanidad exige lote en cada fuente física",()=>{
  assert.equal(ObjRegistrarSanidad.safeParse(ObjBase).success,false);
  assert.equal(ObjRegistrarSanidad.safeParse({...ObjBase,detalles:[{...ObjBase.detalles[0]!,fuentes:[{...ObjBase.detalles[0]!.fuentes[0]!,loteInventarioId:1}]}]}).success,true);
});
