import { afterEach, expect, it, vi } from "vitest";
import { Api_solicitar } from "./api.service";
import { Produccion_obtenerFoto, Produccion_reemplazarFoto } from "./produccion.service";
import { Reportes_descargarCsv } from "./reportes.service";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("JSON, fotografía GET/multipart y CSV comparten el origen y credentials", async () => {
  vi.stubEnv("VITE_API_ORIGIN", "https://backend.example.com");
  const ObjFetch = vi.fn().mockImplementation(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", ObjFetch);
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL() { return "blob:prueba"; }
    static revokeObjectURL() { /* Sin recursos reales en esta prueba. */ }
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  await Api_solicitar("/api/usuarios/me");
  await Produccion_obtenerFoto(1);
  await Produccion_reemplazarFoto(1, new File(["foto"], "foto.png"));
  await Reportes_descargarCsv("ventas", new URLSearchParams("pagina=1"));
  expect(ObjFetch.mock.calls.map((ArrLlamada) => ArrLlamada[0])).toEqual([
    "https://backend.example.com/api/usuarios/me",
    "https://backend.example.com/api/produccion/animales/1/foto",
    "https://backend.example.com/api/produccion/animales/1/foto",
    "https://backend.example.com/api/reportes/ventas/exportar.csv?pagina=1",
  ]);
  for (const ArrLlamada of ObjFetch.mock.calls) expect(ArrLlamada[1].credentials).toBe("include");
  expect(ObjFetch.mock.calls[2][1].body).toBeInstanceOf(FormData);
});
