import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ArrCatalogoPermisosProduccion, ArrPermisosProduccionOperador, Produccion_canonicalizarCodigo } from "./produccion.constants.js";
import { ObjCompra, ObjCrearLote, ObjCrearMedicion, ObjIngresoInicial, ObjNacimiento, ObjTraslado } from "./produccion.schemas.js";
import { Produccion_calcularPesoSchaeffer, Produccion_convertirKgALb } from "./produccion-mediciones.js";
import { Prisma } from "../../../generated/prisma/client.js";

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
  assert.equal(ObjCrearMedicion.safeParse({ animalId: 1, metodoObtencion:"BASCULA", pesoKg: "25.5000" }).success, true);
  assert.equal(ObjCrearMedicion.safeParse({ animalId: 1, metodoObtencion:"ESTIMACION_SCHAEFFER", perimetroToracicoCm:"177", longitudCorporalCm:"198" }).success, true);
  assert.equal(ObjCrearMedicion.safeParse({ animalId: 1, metodoObtencion:"ESTIMACION_SCHAEFFER", perimetroToracicoCm:"177", longitudCorporalCm:"198", pesoKg:"1" }).success, false);
  assert.equal(ObjCrearMedicion.safeParse({ animalId: 1, metodoObtencion:"ESTIMACION_SCHAEFFER", perimetroToracicoCm:"0", longitudCorporalCm:"198" }).success, false);
  assert.equal(ObjCrearMedicion.safeParse({ animalId: 1, metodoObtencion:"BASCULA", pesoKg:"NaN" }).success, false);
});

test("Produccion calcula Schaeffer y libras con Decimal",()=>{const DecKg=Produccion_calcularPesoSchaeffer(new Prisma.Decimal("177"),new Prisma.Decimal("198"));assert.equal(DecKg.toFixed(4),"572.3512");assert.equal(Produccion_convertirKgALb(DecKg).toFixed(4),"1261.8184");});

test("Produccion traslado solo acepta lotes existentes y animales identificados", () => {
  assert.equal(ObjTraslado.safeParse({ loteOrigenId: 1, loteDestinoId: 2, animalIds: [1], motivo: "Reclasificacion" }).success, true);
  assert.equal(ObjTraslado.safeParse({ loteOrigenId: 1, loteDestino: { codigo: "NUEVO" }, animalIds: [1], motivo: "Reclasificacion" }).success, false);
});

test("Produccion canonicaliza codigos sin generar identificadores", () => {
  assert.equal(Produccion_canonicalizarCodigo(" lote 01 "), "LOTE01");
});

test("Produccion protege y reduce el lookup de proveedores para compras", () => {
  const StrRutas = readFileSync(new URL("./produccion.routes.ts", import.meta.url), "utf8");
  const StrRepositorio = readFileSync(new URL("./produccion.repository.ts", import.meta.url), "utf8");
  assert.match(StrRutas, /R\.get\("\/proveedores",Middleware_requerirPermiso\("PRODUCCION_COMPRAS_CREAR"\),C\.Produccion_listarProveedores\)/);
  assert.match(StrRepositorio, /const where:Prisma\.ProveedorRegistroWhereInput=\{activo:true/);
  assert.match(StrRepositorio, /select:\{proveedorId:true,codigo:true,nombre:true,nombreComercial:true,activo:true\}/);
  for (const StrCampoSensible of ["nit:true", "numeroDocumento:true", "correo:true", "telefono:true", "direccion:true", "observaciones:true"]) assert.equal(StrRepositorio.includes(StrCampoSensible), false);
});

test("Ficha tecnica usa contrato fotografico minimo y excluye modulos administrativos", () => {
  const StrRepositorio = readFileSync(new URL("./produccion-ficha.repository.ts", import.meta.url), "utf8");
  const StrServicio = readFileSync(new URL("./produccion-ficha.service.ts", import.meta.url), "utf8");
  const StrRutas = readFileSync(new URL("./produccion.routes.ts", import.meta.url), "utf8");
  assert.match(StrRutas, /\/animales\/:animalId\/ficha-tecnica",Middleware_requerirPermiso\("PRODUCCION_CONSULTAR"\)/);
  assert.match(StrServicio, /tieneFoto: ObjAnimal\.fotos\.length > 0/);
  assert.match(StrRepositorio, /lt: ObjAsignacion\.fechaFin/);
  assert.match(StrRepositorio, /estado: "CONFIRMADA", animalId: null/);
  for (const StrProhibido of ["alimentacionRegistro", "alimentacionDetalle", "ventaRegistro", "ventaDetalle", "fuentes:", "usuario:", "blobNombre", "mimeType", "tamanoBytes"]) {
    assert.equal(StrRepositorio.includes(StrProhibido), false, `La ficha no debe consultar ${StrProhibido}`);
    assert.equal(StrServicio.includes(StrProhibido), false, `La ficha no debe exponer ${StrProhibido}`);
  }
});
