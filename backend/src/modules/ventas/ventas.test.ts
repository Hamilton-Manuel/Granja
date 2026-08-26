import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ArrCatalogoPermisosVentas, ArrFormasPagoVentas, ArrPermisosVentasOperador, StrSerieInicialVentas } from "./ventas.constants.js";
import { ObjConsultaVentas, ObjRegistrarVenta } from "./ventas.schemas.js";

const ObjVentaValida = {
  clienteId: 1,
  fechaVenta: "2026-08-25T08:30:00.000-06:00",
  formaPago: "EFECTIVO",
  animales: [
    { animalId: 10, precioVenta: "4500.00" },
    { animalId: 11, precioVenta: "4750.25" },
  ],
};

test("Ventas acepta animales exactos con precios individuales Decimal", () => {
  assert.equal(ObjRegistrarVenta.safeParse(ObjVentaValida).success, true);
  assert.equal(ObjRegistrarVenta.safeParse({ ...ObjVentaValida, descuento: "1.00" }).success, false);
  assert.equal(ObjRegistrarVenta.safeParse({ ...ObjVentaValida, animales: [{ animalId: 10, precioVenta: "0.00" }] }).success, false);
});

test("Ventas usa fecha civil Guatemala y formas de pago cerradas", () => {
  assert.equal(ObjRegistrarVenta.safeParse({ ...ObjVentaValida, fechaVenta: "2026-08-25T08:30:00.000Z" }).success, false);
  assert.equal(ObjRegistrarVenta.safeParse({ ...ObjVentaValida, formaPago: "CHEQUE" }).success, false);
  assert.deepEqual([...ArrFormasPagoVentas], ["EFECTIVO", "TRANSFERENCIA", "DEPOSITO", "CREDITO"]);
});

test("Ventas define cuatro permisos y Operador solo consulta y registra", () => {
  assert.equal(ArrCatalogoPermisosVentas.length, 4);
  assert.deepEqual([...ArrPermisosVentasOperador], ["VENTAS_CONSULTAR", "VENTAS_REGISTRAR"]);
  assert.equal(StrSerieInicialVentas, "A");
});

test("Ventas conserva paginación estable y filtros canónicos", () => {
  assert.deepEqual(ObjConsultaVentas.parse({}), { pagina: 1, limite: 20 });
  assert.equal(ObjConsultaVentas.safeParse({ pagina: 1, limite: 101 }).success, false);
});

test("router protege lookups, registro, reversión y diagnóstico sin DELETE", async () => {
  const StrRutas = await readFile(new URL("./ventas.routes.ts", import.meta.url), "utf8");
  assert.equal(StrRutas.includes(".delete("), false);
  assert.match(StrRutas, /VENTAS_REGISTRAR/);
  assert.match(StrRutas, /VENTAS_REVERTIR/);
  assert.match(StrRutas, /VENTAS_RECONCILIACION_EJECUTAR/);
  assert.match(StrRutas, /\/clientes/);
  assert.match(StrRutas, /\/animales/);
});

test("Ventas reutiliza primitivas transaccionales de Producción", async () => {
  const StrRepositorio = await readFile(new URL("./ventas.repository.ts", import.meta.url), "utf8");
  assert.match(StrRepositorio, /Produccion_venderAnimalesConTx/);
  assert.match(StrRepositorio, /Produccion_revertirVentaConTx/);
  assert.match(StrRepositorio, /TransactionIsolationLevel\.Serializable/);
  assert.equal(StrRepositorio.includes("descuento"), false);
});
