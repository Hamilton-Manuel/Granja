import { afterEach, describe, expect, it, vi } from "vitest";
import { Api_resolverUrl, Api_validarOrigen } from "./api-origen";

afterEach(() => vi.unstubAllEnvs());
describe("origen API", () => {
  it("conserva proxy local y resuelve Azure sin duplicar /api", () => {
    vi.stubEnv("PROD", false);
    vi.stubEnv("VITE_API_ORIGIN", "");
    expect(Api_resolverUrl("/api/usuarios/me")).toBe("/api/usuarios/me");
    vi.stubEnv("VITE_API_ORIGIN", "https://api.example.com/");
    expect(Api_resolverUrl("/api/reportes/ventas?pagina=1")).toBe("https://api.example.com/api/reportes/ventas?pagina=1");
  });
  it("rechaza orígenes inseguros o rutas en producción", () => {
    for (const StrOrigen of ["", "*", "http://api.example.com", "https://localhost", "https://127.0.0.1", "https://api.example.com/api", "https://user:pass@api.example.com", "https://api.example.com?q=1"]) expect(() => Api_validarOrigen(StrOrigen, true)).toThrow();
    expect(Api_validarOrigen("https://api.example.com", true)).toBe("https://api.example.com");
  });
  it("no permite desviar rutas a otro host", () => {
    for (const StrRuta of ["//evil.example/api", "https://evil.example/api", "/api/../../otra", "/api/\\evil"]) expect(() => Api_resolverUrl(StrRuta)).toThrow();
  });
});
