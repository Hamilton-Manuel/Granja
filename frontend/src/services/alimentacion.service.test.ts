import { afterEach, describe, expect, it, vi } from "vitest";
import * as S from "./alimentacion.service";

function Alimentacion_respuesta(ObjDatos: unknown): Response {
  return new Response(JSON.stringify(ObjDatos), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("servicio Alimentación", () => {
  it("consulta el historial por identificación y filtros canónicos", async () => {
    const ObjFetch = vi.fn().mockResolvedValue(
      Alimentacion_respuesta({
        datos: [],
        paginacion: { pagina: 1, limite: 20, total: 0 },
      }),
    );
    vi.stubGlobal("fetch", ObjFetch);
    await S.Alimentacion_listar({
      pagina: 1,
      limite: 20,
      busqueda: "ARETE-025",
      estado: "CONFIRMADA",
      destino: "ANIMAL",
      fechaDesde: "2026-08-01",
      fechaHasta: "2026-08-24",
    });
    expect(ObjFetch.mock.calls[0]?.[0]).toBe(
      "/api/alimentacion?pagina=1&limite=20&busqueda=ARETE-025&estado=CONFIRMADA&destino=ANIMAL&fechaDesde=2026-08-01&fechaHasta=2026-08-24",
    );
    expect((ObjFetch.mock.calls[0]?.[1] as RequestInit).credentials).toBe(
      "include",
    );
  });

  it("usa exclusivamente los endpoints reales estabilizados", async () => {
    const ObjFetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(Alimentacion_respuesta({ datos: [] })),
      );
    vi.stubGlobal("fetch", ObjFetch);
    await S.Alimentacion_listarProductos();
    await S.Alimentacion_listarFormulas();
    await S.Alimentacion_ejecutarDiagnostico();
    expect(ObjFetch.mock.calls.map((ArrLlamada) => ArrLlamada[0])).toEqual([
      "/api/alimentacion/productos",
      "/api/alimentacion/formulas",
      "/api/alimentacion/diagnosticos/reconciliacion",
    ]);
  });

  it("revierte el registro completo y conserva el motivo", async () => {
    const ObjFetch = vi
      .fn()
      .mockResolvedValue(Alimentacion_respuesta({ datos: {} }));
    vi.stubGlobal("fetch", ObjFetch);
    await S.Alimentacion_revertir(8, "Registro duplicado");
    expect(ObjFetch.mock.calls[0]?.[0]).toBe(
      "/api/alimentacion/8/revertir",
    );
    const ObjCuerpo = JSON.parse(
      String((ObjFetch.mock.calls[0]?.[1] as RequestInit).body),
    );
    expect(ObjCuerpo).toEqual({ motivo: "Registro duplicado" });
  });

  it("consume los cinco lookups reducidos sin exponer IDs como entrada manual", async () => {
    const ObjFetch = vi.fn().mockImplementation(() => Promise.resolve(Alimentacion_respuesta({ datos: [], paginacion: { pagina: 1, limite: 20, total: 0 } })));
    vi.stubGlobal("fetch", ObjFetch);
    await S.Alimentacion_buscarDestinosAnimales("ARETE 25");
    await S.Alimentacion_buscarDestinosLotes("ENG");
    await S.Alimentacion_buscarAlmacenes("BOD");
    await S.Alimentacion_buscarExistencias(4, 2);
    await S.Alimentacion_buscarLotesInventario(4, 2, "2026-08-24T07:00:00.000-06:00");
    expect(ObjFetch.mock.calls.map((Arr) => Arr[0])).toEqual([
      "/api/alimentacion/destinos/animales?pagina=1&limite=20&busqueda=ARETE%2025",
      "/api/alimentacion/destinos/lotes?pagina=1&limite=20&busqueda=ENG",
      "/api/alimentacion/almacenes?busqueda=BOD",
      "/api/alimentacion/existencias?productoId=4&inventarioId=2",
      "/api/alimentacion/lotes-inventario?productoId=4&inventarioId=2&fechaAlimentacion=2026-08-24T07%3A00%3A00.000-06%3A00",
    ]);
  });

  it("no expone operaciones DELETE", () => {
    expect(
      Object.keys(S).some((StrNombre) =>
        StrNombre.toLowerCase().includes("eliminar"),
      ),
    ).toBe(false);
  });
});
