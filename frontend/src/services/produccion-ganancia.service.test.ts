import { afterEach, expect, it, vi } from "vitest";
import * as S from "./produccion.service";
afterEach(() => vi.unstubAllGlobals());
it("ganancia consulta rutas concretas y fechas civiles sin modificar precisión de respuesta", async () => {
  const ObjFetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ datos: { gpdAcumuladaKg: "0.333333333333333333333333333333" } }), { status: 200 })));
  vi.stubGlobal("fetch", ObjFetch);
  const ObjConsulta = { fechaDesde: "2026-09-11", fechaHasta: "2026-09-12" };
  const ObjRespuesta = await S.Produccion_analizarGananciaAnimal(7, ObjConsulta);
  await S.Produccion_analizarGananciaLote(3, ObjConsulta);
  await S.Produccion_analizarGananciaAsignacion(12, ObjConsulta);
  expect(ObjFetch.mock.calls.map(Arr => Arr[0])).toEqual([
    "/api/produccion/mediciones/ganancia/animales/7?fechaDesde=2026-09-11&fechaHasta=2026-09-12",
    "/api/produccion/mediciones/ganancia/lotes/3?fechaDesde=2026-09-11&fechaHasta=2026-09-12",
    "/api/produccion/mediciones/ganancia/asignaciones/12?fechaDesde=2026-09-11&fechaHasta=2026-09-12",
  ]);
  expect(ObjRespuesta.datos).toEqual({ gpdAcumuladaKg: "0.333333333333333333333333333333" });
  for (const Arr of ObjFetch.mock.calls) expect((Arr[1] as RequestInit).credentials).toBe("include");
});
