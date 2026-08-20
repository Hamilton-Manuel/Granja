import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorApi } from "../types/api.types";
import { Api_solicitar } from "./api.service";

afterEach(() => vi.unstubAllGlobals());

describe("Api_solicitar", () => {
  it("envía credenciales y serializa JSON", async () => {
    const ObjFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ datos: { ok: true } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", ObjFetch);

    await Api_solicitar("/api/prueba", { method: "POST", ObjCuerpo: { valor: 1 } });
    expect(ObjFetch).toHaveBeenCalledWith("/api/prueba", expect.objectContaining({
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ valor: 1 }),
    }));
    const ObjOpciones = ObjFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(ObjOpciones.headers).get("content-type")).toBe("application/json");
  });

  it("acepta 204 sin intentar interpretar JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(Api_solicitar<void>("/api/usuarios/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("conserva un error público uniforme", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { codigo: "DEMASIADOS_INTENTOS", mensaje: "Se realizaron demasiados intentos." },
    }), { status: 429 })));
    await expect(Api_solicitar("/api/usuarios/login")).rejects.toMatchObject({
      IntEstadoHttp: 429,
      StrCodigo: "DEMASIADOS_INTENTOS",
    });
  });

  it("sanitiza HTML y detalles no conformes al contrato", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<pre>DATABASE_URL=secreto stack trace</pre>", { status: 500 })));
    const ObjError = await Api_solicitar("/api/prueba").catch((ObjErrorCapturado: unknown) => ObjErrorCapturado);
    expect(ObjError).toBeInstanceOf(ErrorApi);
    expect((ObjError as Error).message).toBe("Ocurrió un error interno. Intente nuevamente.");
    expect((ObjError as Error).message).not.toContain("DATABASE_URL");
    expect((ObjError as Error).message).not.toContain("stack");
  });

  it("clasifica fallos de red sin revelar el error original", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("token secreto")));
    await expect(Api_solicitar("/api/prueba")).rejects.toMatchObject({
      IntEstadoHttp: 0,
      StrCodigo: "ERROR_RED",
    });
  });
});
