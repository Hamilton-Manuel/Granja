import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "../../../generated/prisma/client.js";
import { Produccion_calcularGananciaPeso, Produccion_detectarPermanenciasInvalidas, Produccion_medicionesEnPermanencia, type MedicionGanancia } from "./produccion-ganancia-peso.js";
import { Produccion_formatearRespuesta } from "./produccion.service.js";
import { ObjConsultaGananciaPeso } from "./produccion.schemas.js";
import { Middleware_requerirPermiso } from "../../middleware/autenticacion.middleware.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import type { Request, Response } from "express";

const Produccion_medicionPrueba = (IntId: number, StrPeso: string, StrFecha: string): MedicionGanancia => ({
  medicionId: IntId, tipoMedicion: "PESO", unidadMedida: "KG", valor: new Prisma.Decimal(StrPeso),
  fechaMedicion: new Date(`${StrFecha}Z`), metodoObtencion: "BASCULA",
});

test("ganancia: sin mediciones y una sola medición no inventan GPD", () => {
  assert.equal(Produccion_calcularGananciaPeso([]).resumen.estado, "SIN_MEDICIONES");
  const Obj = Produccion_calcularGananciaPeso([Produccion_medicionPrueba(1, "100", "2026-09-11T20:32:00")]);
  assert.equal(Obj.resumen.estado, "DATOS_INSUFICIENTES");
  assert.equal(Obj.resumen.gananciaTotalKg, "0");
  assert.equal(Obj.resumen.diasTotales, "0");
  assert.equal(Obj.resumen.gpdAcumuladaKg, null);
  assert.equal(Obj.evolucion[0]!.gananciaAcumuladaKg, null);
});

test("ganancia: orden cronológico, períodos y acumulados independientes sin mutar entrada", () => {
  const Arr = [Produccion_medicionPrueba(3, "107", "2026-09-14T08:00:00"), Produccion_medicionPrueba(1, "100", "2026-09-11T08:00:00"), Produccion_medicionPrueba(2, "104", "2026-09-13T08:00:00")];
  const Obj = Produccion_calcularGananciaPeso(Arr);
  assert.deepEqual(Obj.evolucion.map(Obj => Obj.medicionId), [1, 2, 3]);
  assert.equal(Arr[0]!.medicionId, 3);
  assert.equal(Obj.evolucion[1]!.diasDesdeAnterior, "2");
  assert.equal(Obj.evolucion[1]!.gpdPeriodoKg, "2");
  assert.equal(Obj.evolucion[2]!.gpdPeriodoKg, "3");
  assert.equal(Obj.resumen.gananciaTotalKg, "7");
  assert.equal(Obj.resumen.gpdAcumuladaKg, new (Prisma.Decimal.clone({ precision: 50 }))(7).div(3).toString());
});

for (const [StrFinal, StrGpd] of [["102", "4"], ["98", "-4"], ["100", "0"]]) {
  test(`ganancia: dos pesadas en 12 horas, GPD ${StrGpd}`, () => {
    const Obj = Produccion_calcularGananciaPeso([Produccion_medicionPrueba(1, "100", "2026-09-11T20:32:00"), Produccion_medicionPrueba(2, StrFinal!, "2026-09-12T08:32:00")]);
    assert.equal(Obj.resumen.diasTotales, "0.5");
    assert.equal(Obj.resumen.gpdAcumuladaKg, StrGpd);
    assert.equal(Obj.resumen.estado, "CALCULADO");
    assert.equal(Produccion_formatearRespuesta(Obj).evolucion[0]!.fechaMedicion as unknown as string, "2026-09-11T20:32:00.000-06:00");
  });
}

test("ganancia: misma hora conserva cambio, GPD N/D y acumulada válida desde primera", () => {
  const Obj = Produccion_calcularGananciaPeso([Produccion_medicionPrueba(1, "100", "2026-09-11T23:55:00"), Produccion_medicionPrueba(3, "103", "2026-09-12T23:55:00"), Produccion_medicionPrueba(2, "102", "2026-09-12T23:55:00")]);
  assert.equal(Obj.evolucion[2]!.cambioKg, "1");
  assert.equal(Obj.evolucion[2]!.gpdPeriodoKg, null);
  assert.equal(Obj.evolucion[2]!.gpdAcumuladaKg, "3");
  assert.equal(Obj.resumen.ultimaGpdKg, null);
  assert.equal(Obj.incidencias.length, 1);
});

test("ganancia: precisión, intervalo submilidía y datos incompatibles", () => {
  const Obj = Produccion_calcularGananciaPeso([
    Produccion_medicionPrueba(1, "100.0001", "2026-09-11T23:55:00.000"),
    Produccion_medicionPrueba(2, "100.0002", "2026-09-11T23:55:00.001"),
    { ...Produccion_medicionPrueba(3, "1", "2026-09-11T23:55:01"), unidadMedida: "LB" },
    { ...Produccion_medicionPrueba(4, "1", "2026-09-11T23:55:01"), fechaMedicion: new Date(NaN) },
    Produccion_medicionPrueba(5, "0", "2026-09-11T23:55:01"),
  ]);
  assert.equal(Obj.resumen.gananciaTotalKg, "0.0001");
  assert.equal(Obj.resumen.gpdAcumuladaKg, "8640");
  assert.equal(Obj.resumen.gananciaTotalLb, "0.00022046226218487757");
  assert.equal(Obj.medicionesExcluidas, 3);
});

test("ganancia: permanencias separadas y frontera de traslado exclusiva", () => {
  const Arr = [Produccion_medicionPrueba(1, "100", "2026-09-11T08:00:00"), Produccion_medicionPrueba(2, "101", "2026-09-12T08:00:00"), Produccion_medicionPrueba(3, "110", "2026-09-13T08:00:00")];
  const ObjA = { asignacionLoteId: 1, animalId: 1, fechaInicio: new Date("2026-09-11T00:00:00Z"), fechaFin: new Date("2026-09-12T08:00:00Z") };
  const ObjB = { ...ObjA, asignacionLoteId: 2, fechaInicio: ObjA.fechaFin, fechaFin: null };
  assert.deepEqual(Produccion_medicionesEnPermanencia(Arr, ObjA).map(Obj => Obj.medicionId), [1]);
  assert.deepEqual(Produccion_medicionesEnPermanencia(Arr, ObjB).map(Obj => Obj.medicionId), [2, 3]);
  assert.equal(Produccion_detectarPermanenciasInvalidas([ObjA, ObjB]).size, 0);
  assert.deepEqual([...Produccion_detectarPermanenciasInvalidas([ObjA, { ...ObjB, fechaInicio: ObjA.fechaInicio }])].sort(), [1, 2]);
  assert.equal(Produccion_detectarPermanenciasInvalidas([{ ...ObjA, fechaFin: ObjA.fechaInicio }]).has(1), true);
  assert.equal(Produccion_detectarPermanenciasInvalidas([{ ...ObjA, fechaFin: new Date("2026-09-10Z") }]).has(1), true);
});

test("ganancia: filtros validan fechas reales y orden", () => {
  assert.equal(ObjConsultaGananciaPeso.safeParse({ fechaDesde: "2026-09-11", fechaHasta: "2026-09-11" }).success, true);
  for (const Obj of [{ fechaDesde: "2026-02-30" }, { fechaHasta: "2026-09-11T23:55:00" }, { fechaDesde: "2026-09-12", fechaHasta: "2026-09-11" }]) assert.equal(ObjConsultaGananciaPeso.safeParse(Obj).success, false);
});

test("ganancia: acceso depende de PRODUCCION_CONSULTAR", () => {
  const Produccion_validarPermiso = Middleware_requerirPermiso("PRODUCCION_CONSULTAR");
  for (const ArrPermisos of [[], ["PRODUCCION_MEDICIONES_CREAR"], ["PRODUCCION_CONSULTAR"]]) {
    const ObjSolicitud = { ObjAutenticacion: { IntUsuarioId: 1, IntSesionId: 1, StrTokenHash: "prueba", ArrPermisos } } as Request;
    let ObjFallo: unknown;
    Produccion_validarPermiso(ObjSolicitud, {} as Response, ObjError => { ObjFallo = ObjError; });
    if (ArrPermisos.includes("PRODUCCION_CONSULTAR")) assert.equal(ObjFallo, undefined);
    else assert.equal((ObjFallo as ErrorAplicacion).IntEstadoHttp, 403);
  }
});
