import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "../../../../generated/prisma/client.js";
import { Alimentacion_calcularPrevisualizacion, type AlimentacionContextoPrevio, type AlimentacionFuentePrevia } from "./concentrados.previsualizacion.js";
import { ObjConcentradoPrevisualizar } from "./concentrados.schemas.js";
import type { AlimentacionElaboracionPrevisualizacionEntrada } from "./concentrados.types.js";

function Alimentacion_fuente(IntId: number, StrCantidad = "1000", StrCosto = "2"): AlimentacionFuentePrevia {
  return { existenciaLoteId: IntId, inventarioProductoId: IntId, inventarioId: IntId, loteInventarioId: IntId,
    codigoLote: `L${IntId}`, unidadBase: "lb", fechaVencimiento: null, transaccionOrigenId: IntId,
    existenciaActual: StrCantidad, saldoAlmacen: StrCantidad, costoUnitario: StrCosto };
}
function Alimentacion_caso() {
  const ObjEntrada: AlimentacionElaboracionPrevisualizacionEntrada = { recetaId: 1, versionReceta: 1,
    fechaEfectiva: "2026-09-22T12:00:00.000-06:00", cantidadTeorica: "500", cantidadReal: "500", unidadCaptura: "lb", inventarioDestinoId: 1 };
  const ObjContexto: AlimentacionContextoPrevio = {
    receta: { recetaId: 1, version: 1, nombre: "Crecimiento", cantidadBase: "100", unidadBase: "lb", factor: "453.59237" },
    producto: { productoId: 2, codigo: "C", nombre: "Concentrado", unidadBase: "lb", factor: "453.59237" },
    destino: { inventarioId: 1, codigo: "A", nombre: "Almacén" }, factorCaptura: "453.59237",
    ingredientes: [{ productoId: 1, codigo: "M", nombre: "Maíz", unidadBase: "lb", cantidadReceta: "100", unidadReceta: "lb",
      factorBase: "453.59237", factorReceta: "453.59237", fuentes: [Alimentacion_fuente(1)] }],
  };
  return { ObjEntrada, ObjContexto };
}
test("previa escala por cantidad teórica; merma altera costo unitario, no ingredientes", () => {
  const { ObjEntrada, ObjContexto } = Alimentacion_caso();
  ObjEntrada.cantidadReal = "400"; ObjEntrada.motivoDiferencia = "Secado";
  const Obj = Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto);
  assert.equal(Obj.ingredientes[0]!.cantidadRequerida, "500.000000");
  assert.equal(Obj.costoEstimado?.unitario, "2.500000000000000000");
  assert.equal(Obj.rendimiento.porcentaje, "80");
  assert.equal(Obj.balanceMasa.diferenciaEntradaSalida, "45359.237");
});
test("previa convierte tonelada métrica y quintal según factores recibidos del catálogo", () => {
  const { ObjEntrada, ObjContexto } = Alimentacion_caso();
  ObjEntrada.cantidadTeorica = ObjEntrada.cantidadReal = "1"; ObjEntrada.unidadCaptura = "t";
  ObjContexto.factorCaptura = "1000000";
  ObjContexto.receta = { ...ObjContexto.receta, cantidadBase: "1", unidadBase: "qq", factor: "45359.237" };
  ObjContexto.ingredientes[0]!.fuentes = [Alimentacion_fuente(1, "3000")];
  const Obj = Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto);
  assert.equal(Obj.ingredientes[0]!.cantidadRequerida, "2204.622622");
  assert.equal(Obj.cantidadRealBase, "2204.622622");
  assert.equal(Obj.balanceMasa.salidaReal, "1000000");
});
test("previa cuantiza una vez a seis decimales, HALF_UP, después del escalado", () => {
  const { ObjEntrada, ObjContexto } = Alimentacion_caso();
  ObjEntrada.cantidadTeorica = ObjEntrada.cantidadReal = "1";
  ObjContexto.receta.cantidadBase = "3"; ObjContexto.ingredientes[0]!.cantidadReceta = "1";
  let Obj = Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto);
  assert.equal(Obj.ingredientes[0]!.cantidadRequerida, "0.333333");
  ObjEntrada.cantidadTeorica = ObjEntrada.cantidadReal = "3";
  Obj = Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto);
  assert.equal(Obj.ingredientes[0]!.cantidadRequerida, "1.000000");
  ObjContexto.receta.cantidadBase = "2"; ObjContexto.ingredientes[0]!.cantidadReceta = "0.000001";
  ObjEntrada.cantidadTeorica = ObjEntrada.cantidadReal = "1";
  assert.equal(Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto).ingredientes[0]!.cantidadRequerida, "0.000001");
});
test("previa reparte en orden recibido por varios lotes y almacenes sin exceder saldo agregado", () => {
  const { ObjEntrada, ObjContexto } = Alimentacion_caso();
  const ObjA = Alimentacion_fuente(1, "100", "1"); ObjA.saldoAlmacen = "150";
  const ObjB = { ...Alimentacion_fuente(2, "100", "2"), inventarioProductoId: 1, inventarioId: 1, saldoAlmacen: "150" };
  ObjContexto.ingredientes[0]!.fuentes = [ObjA, ObjB, Alimentacion_fuente(3, "500", "3")];
  const Obj = Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto);
  assert.deepEqual(Obj.ingredientes[0]!.fuentes.map(Obj => Obj.cantidad), ["100.000000", "50.000000", "350.000000"]);
  assert.equal(Obj.costoEstimado?.total, "1250.000000000000000000000000");
});
test("previa devuelve todos los faltantes y no presenta costo parcial como costo completo", () => {
  const { ObjEntrada, ObjContexto } = Alimentacion_caso();
  ObjContexto.ingredientes[0]!.fuentes = [Alimentacion_fuente(1, "100")];
  ObjContexto.ingredientes.push({ ...ObjContexto.ingredientes[0]!, productoId: 3, fuentes: [] });
  const Obj = Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto);
  assert.deepEqual(Obj.faltantes.map(Obj => Obj.cantidadFaltante), ["400.000000", "500.000000"]);
  assert.equal(Obj.disponible, false); assert.equal(Obj.costoEstimado, null);
  assert.equal(Obj.costoDisponible, "200.000000000000000000000000");
});
test("previa costo exacto de fuente, costo unitario y residual concilian sin Number", () => {
  const { ObjEntrada, ObjContexto } = Alimentacion_caso();
  ObjEntrada.cantidadTeorica = "1"; ObjEntrada.cantidadReal = "3"; ObjEntrada.motivoDiferencia = "Diferencia documentada";
  ObjContexto.ingredientes[0]!.fuentes = [Alimentacion_fuente(1, "1", "1.123456789012345678")];
  const Obj = Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto), ObjCosto = Obj.costoEstimado!;
  assert.equal(ObjCosto.total, "1.123456789012345678000000");
  const DecimalExacto = Prisma.Decimal.clone({ precision: 100 });
  assert.equal(new DecimalExacto(ObjCosto.unitario).mul(Obj.cantidadRealBase).add(ObjCosto.residualValoracion).toFixed(24), ObjCosto.total);
  assert.equal(ObjCosto.residualValoracion, "0.000000000000000001000000");
});
test("previa rechaza cantidad cuantizada cero, desbordamiento y costo fuera de rango", () => {
  const { ObjEntrada, ObjContexto } = Alimentacion_caso();
  ObjContexto.ingredientes[0]!.cantidadReceta = "0.000001"; ObjContexto.receta.cantidadBase = "1000000";
  assert.throws(() => Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto), /cero/);
  ObjContexto.ingredientes[0]!.cantidadReceta = "999999999999999999"; ObjContexto.receta.cantidadBase = "1";
  assert.throws(() => Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto), /excede/);
  ObjContexto.ingredientes[0]!.cantidadReceta = "1";
  ObjContexto.ingredientes[0]!.fuentes[0]!.costoUnitario = "99999999999999999999";
  assert.throws(() => Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto), /costo estimado/);
});
test("previa no valora una fuente con unidad histórica incompatible", () => {
  const { ObjEntrada, ObjContexto } = Alimentacion_caso();
  ObjContexto.ingredientes[0]!.fuentes[0]!.unidadBase = "kg";
  assert.throws(() => Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto), /histórica/);
});
test("huella estable cambia con receta, stock, costo, factor, destino o solicitud", () => {
  const { ObjEntrada, ObjContexto } = Alimentacion_caso();
  const StrOriginal = Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjContexto).huellaPrevisualizacion;
  assert.equal(Alimentacion_calcularPrevisualizacion(ObjEntrada, structuredClone(ObjContexto)).huellaPrevisualizacion, StrOriginal);
  for (const Alimentacion_cambiar of [
    (Obj: AlimentacionContextoPrevio) => { Obj.receta.version++; },
    (Obj: AlimentacionContextoPrevio) => { Obj.ingredientes[0]!.fuentes[0]!.existenciaActual = "999"; },
    (Obj: AlimentacionContextoPrevio) => { Obj.ingredientes[0]!.fuentes[0]!.costoUnitario = "2.000000000000000001"; },
    (Obj: AlimentacionContextoPrevio) => { Obj.factorCaptura = "453.592371"; },
    (Obj: AlimentacionContextoPrevio) => { Obj.destino.inventarioId++; },
  ]) {
    const ObjCopia = structuredClone(ObjContexto); Alimentacion_cambiar(ObjCopia);
    assert.notEqual(Alimentacion_calcularPrevisualizacion(ObjEntrada, ObjCopia).huellaPrevisualizacion, StrOriginal);
  }
  assert.notEqual(Alimentacion_calcularPrevisualizacion({ ...ObjEntrada, observaciones: "Otro" }, ObjContexto).huellaPrevisualizacion, StrOriginal);
});
test("esquema rechaza costos/fuentes externos, fechas inválidas, volumen y merma sin motivo", () => {
  const { ObjEntrada } = Alimentacion_caso();
  assert.equal(ObjConcentradoPrevisualizar.safeParse(ObjEntrada).success, true);
  for (const ObjCambio of [{ costo: "1" }, { fuentes: [] }, { fechaEfectiva: "2026-02-30T12:00:00.000-06:00" },
    { unidadCaptura: "L" }, { cantidadReal: "499" }, { cantidadTeorica: "0" }, { fechaVencimiento: "2026-09-21" }]) {
    assert.equal(ObjConcentradoPrevisualizar.safeParse({ ...ObjEntrada, ...ObjCambio }).success, false);
  }
});
