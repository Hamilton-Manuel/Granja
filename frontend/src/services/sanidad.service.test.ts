import { afterEach, describe, expect, it, vi } from "vitest";
import * as S from "./sanidad.service";

const Sanidad_respuesta = (ObjDatos: unknown) => new Response(JSON.stringify(ObjDatos), { status: 200, headers: { "content-type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

describe("servicio Sanidad", () => {
  it("usa el historial canónico y conserva sus filtros", async () => {
    const ObjFetch = vi.fn().mockImplementation(() => Promise.resolve(Sanidad_respuesta({ datos: [], paginacion: { pagina: 1, limite: 20, total: 0 } }))); vi.stubGlobal("fetch", ObjFetch);
    await S.Sanidad_listar({ pagina: 1, limite: 20, busqueda: "ARETE-025", estado: "CONFIRMADA", destino: "ANIMAL", fechaDesde: "2026-08-01", fechaHasta: "2026-08-24" });
    expect(ObjFetch.mock.calls[0]?.[0]).toBe("/api/sanidad?pagina=1&limite=20&busqueda=ARETE-025&estado=CONFIRMADA&destino=ANIMAL&fechaDesde=2026-08-01&fechaHasta=2026-08-24");
    expect((ObjFetch.mock.calls[0]?.[1] as RequestInit).credentials).toBe("include");
  });
  it("consume lookups reducidos y fecha efectiva sin aliases", async () => {
    const ObjFetch = vi.fn().mockImplementation(() => Promise.resolve(Sanidad_respuesta({ datos: [], paginacion: { pagina: 1, limite: 20, total: 0 } }))); vi.stubGlobal("fetch", ObjFetch);
    await S.Sanidad_animales("ARETE 25"); await S.Sanidad_lotesProduccion("ENG"); await S.Sanidad_almacenes(); await S.Sanidad_existencias(4, 2); await S.Sanidad_lotesInventario(4, 2, "2026-08-24T07:00:00.000-06:00");
    expect(ObjFetch.mock.calls.map(Arr => Arr[0])).toEqual(["/api/sanidad/destinos/animales?pagina=1&limite=20&busqueda=ARETE%2025", "/api/sanidad/destinos/lotes?pagina=1&limite=20&busqueda=ENG", "/api/sanidad/almacenes", "/api/sanidad/existencias?productoId=4&inventarioId=2", "/api/sanidad/lotes-inventario?productoId=4&inventarioId=2&fechaAplicacion=2026-08-24T07%3A00%3A00.000-06%3A00"]);
  });
  it("revierte la aplicación completa con motivo", async () => {
    const ObjFetch = vi.fn().mockResolvedValue(Sanidad_respuesta({ datos: {} })); vi.stubGlobal("fetch", ObjFetch); await S.Sanidad_revertir(7, "Corrección clínica");
    expect(ObjFetch.mock.calls[0]?.[0]).toBe("/api/sanidad/7/revertir"); expect(JSON.parse(String((ObjFetch.mock.calls[0]?.[1] as RequestInit).body))).toEqual({ motivo: "Corrección clínica" });
  });
  it("no expone DELETE", () => { expect(Object.keys(S).some(StrNombre => StrNombre.toLowerCase().includes("eliminar"))).toBe(false); });
});
