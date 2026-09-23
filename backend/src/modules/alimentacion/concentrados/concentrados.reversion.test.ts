import assert from "node:assert/strict";
import test from "node:test";
import { Alimentacion_operacionResuelta, Alimentacion_loteCompletoEnOrigen } from "./concentrados.reversion.js";
import { ObjConcentradoRevertir, ObjConcentradoElaboracionParametro } from "./concentrados.schemas.js";
import type { AlimentacionOperacionPosterior } from "./concentrados.reversion.repository.js";
const ObjOperacion: AlimentacionOperacionPosterior = { transaccionId: 1, subtipo: "CONTEO_FISICO", cantidad: "-1.000001", costo: "1.123456789123456789",
  fecha: new Date(), existenciaLoteId: 1, inventarioId: 1, codigoAlmacen: "A", loteInventarioId: 1, reversionId: 2,
  cantidadReversion: "1.000001", costoReversion: "1.123456789123456789", alimentacionId: null, estadoAlimentacion: null,
  elaboracionId: null, estadoElaboracion: null, transferenciaId: null, sanidadFuenteId: null };
test("reversión exige motivo no vacío y parámetros válidos; rechaza campos adicionales", () => {
  assert.equal(ObjConcentradoRevertir.safeParse({ motivo: "Corrección" }).success, true);
  for (const Obj of [{ motivo: " " }, { motivo: "a".repeat(501) }, { motivo: "Corrección", forzar: true }]) assert.equal(ObjConcentradoRevertir.safeParse(Obj).success, false);
  assert.equal(ObjConcentradoElaboracionParametro.safeParse({ elaboracionId: "1" }).success, true);
  assert.equal(ObjConcentradoElaboracionParametro.safeParse({ elaboracionId: "-1" }).success, false);
});
test("dependencia solo se resuelve con compensación vinculada exacta, no por saldo neto", () => {
  assert.equal(Alimentacion_operacionResuelta(ObjOperacion), true);
  for (const Obj of [{ reversionId: null }, { cantidadReversion: "1" }, { costoReversion: "1.123456789123456788" }, { costo: null }]) {
    assert.equal(Alimentacion_operacionResuelta({ ...ObjOperacion, ...Obj }), false);
  }
});
test("dependencias de Alimentación y otras elaboraciones exigen reversión del registro de dominio", () => {
  assert.equal(Alimentacion_operacionResuelta({ ...ObjOperacion, alimentacionId: 10, estadoAlimentacion: "CONFIRMADA" }), false);
  assert.equal(Alimentacion_operacionResuelta({ ...ObjOperacion, alimentacionId: 10, estadoAlimentacion: "REVERTIDA" }), true);
  assert.equal(Alimentacion_operacionResuelta({ ...ObjOperacion, elaboracionId: 20, estadoElaboracion: "CONFIRMADA" }), false);
  assert.equal(Alimentacion_operacionResuelta({ ...ObjOperacion, elaboracionId: 20, estadoElaboracion: "REVERTIDA" }), true);
});
test("lote completo exige fuente original exacta, saldo agregado y cero en otros almacenes", () => {
  const Obj = { existenciaLoteId: 1, cantidad: "9007199254740993.123456", saldoAlmacen: "9007199254740993.123456" };
  assert.equal(Alimentacion_loteCompletoEnOrigen([Obj], 1, Obj.cantidad), true);
  assert.equal(Alimentacion_loteCompletoEnOrigen([Obj], 2, Obj.cantidad), false);
  assert.equal(Alimentacion_loteCompletoEnOrigen([{ ...Obj, cantidad: "9007199254740993.123455" }], 1, Obj.cantidad), false);
  assert.equal(Alimentacion_loteCompletoEnOrigen([{ ...Obj, saldoAlmacen: "0" }], 1, Obj.cantidad), false);
  assert.equal(Alimentacion_loteCompletoEnOrigen([Obj, { existenciaLoteId: 2, cantidad: "1", saldoAlmacen: "1" }], 1, Obj.cantidad), false);
  assert.equal(Alimentacion_loteCompletoEnOrigen([Obj, { existenciaLoteId: 2, cantidad: "0", saldoAlmacen: "1" }], 1, Obj.cantidad), true);
});
