import assert from "node:assert/strict";
import test from "node:test";
import { Fecha_formatearFechaCivil, Fecha_obtenerRangoMesActualGuatemala } from "../../datetime/fecha.js";
import { Dashboard_obtener, ObjPermisosDashboard } from "./dashboard.service.js";
import { Reportes_crearMesesTendencia, Reportes_resolverCostoHistorico } from "../reportes/reportes-metricas.service.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";

test("Dashboard calcula el mes civil de Guatemala", () => {
  const Obj = Fecha_obtenerRangoMesActualGuatemala(new Date("2026-09-02T05:30:00Z"));
  assert.equal(Fecha_formatearFechaCivil(Obj.DtInicio), "2026-09-01");
  assert.equal(Fecha_formatearFechaCivil(Obj.DtFinInclusivo), "2026-09-30");
});

test("Dashboard genera abril-septiembre de 2026 e incluye el mes actual", () => {
  const ArrMeses = Reportes_crearMesesTendencia(new Date(Date.UTC(2026, 8, 1)));
  assert.deepEqual(ArrMeses, ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]);
  assert.equal(ArrMeses.length, 6);
  assert.equal(ArrMeses.at(-1), "2026-09");
});

test("Dashboard genera agosto 2026-enero 2027 al cruzar de año", () => {
  const ArrMeses = Reportes_crearMesesTendencia(new Date(Date.UTC(2027, 0, 1)));
  assert.deepEqual(ArrMeses, ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01"]);
});

test("Costos distingue período vacío de consumo histórico inconsistente", () => {
  assert.equal(Reportes_resolverCostoHistorico({ total: "0", inconsistencias: 0 }), "0.00");
  assert.throws(() => Reportes_resolverCostoHistorico({ total: "0", inconsistencias: 1 }), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "COSTO_HISTORICO_INCONSISTENTE");
});

test("Dashboard solo ejecuta y devuelve bloques autorizados", async () => {
  const ArrLlamadas: string[] = [];
  const ObjConsultas = Object.fromEntries(Object.keys(ObjPermisosDashboard).map((StrCategoria) => [StrCategoria, async () => { ArrLlamadas.push(StrCategoria); return { total: 0 }; }])) as Parameters<typeof Dashboard_obtener>[1];
  const Obj = await Dashboard_obtener([ObjPermisosDashboard.produccion, ObjPermisosDashboard.inventario], ObjConsultas);
  assert.deepEqual(ArrLlamadas.sort(), ["inventario", "produccion"]);
  assert.deepEqual(Object.keys(Obj.bloques).sort(), ["inventario", "produccion"]);
  assert.equal("ventas" in Obj.bloques, false);
});

test("Dashboard aísla errores por bloque y funciona sin permisos", async () => {
  const ObjConsultas = Object.fromEntries(Object.keys(ObjPermisosDashboard).map((StrCategoria) => [StrCategoria, async () => { if (StrCategoria === "costos") throw new Error("detalle interno"); return {}; }])) as Parameters<typeof Dashboard_obtener>[1];
  const ObjParcial = await Dashboard_obtener([ObjPermisosDashboard.costos, ObjPermisosDashboard.ventas], ObjConsultas);
  assert.equal("ventas" in ObjParcial.bloques, true);
  assert.deepEqual(ObjParcial.errores?.costos, { codigo: "BLOQUE_NO_DISPONIBLE", mensaje: "No fue posible cargar el resumen de costos." });
  const ObjVacio = await Dashboard_obtener([], ObjConsultas);
  assert.deepEqual(ObjVacio.bloques, {});
  assert.equal("errores" in ObjVacio, false);
});
