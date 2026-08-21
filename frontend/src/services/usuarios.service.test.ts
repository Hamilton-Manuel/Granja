import { afterEach, describe, expect, it, vi } from "vitest";
import * as ObjServicio from "./usuarios.service";
import { ErrorApi } from "../types/api.types";

afterEach(() => vi.unstubAllGlobals());

describe("servicio de Usuarios", () => {
  it("serializa únicamente los filtros reales del listado", async () => {
    const ObjFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ datos: [], paginacion: { pagina: 2, limite: 20, total: 0 } }), { status: 200 }));
    vi.stubGlobal("fetch", ObjFetch);
    await ObjServicio.Usuarios_listar({ pagina: 2, limite: 20, busqueda: "Ana", estado: "ACTIVO", rolId: 3 });
    expect(ObjFetch.mock.calls[0]?.[0]).toBe("/api/usuarios?pagina=2&limite=20&busqueda=Ana&estado=ACTIVO&rolId=3");
    expect((ObjFetch.mock.calls[0]?.[1] as RequestInit).credentials).toBe("include");
  });

  it("acepta la respuesta 204 al revocar sesiones sin intentar parsearla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(ObjServicio.Usuarios_revocarSesiones(7)).resolves.toBeUndefined();
  });

  it.each([
    [403, "USUARIO_PROTEGIDO"],
    [404, "USUARIO_NO_ENCONTRADO"],
    [409, "ROL_RESERVADO"],
  ])("conserva el contrato público %s %s", async (IntEstado, StrCodigo) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { codigo: StrCodigo, mensaje: "Mensaje público" } }), { status: IntEstado })));
    const ObjError = await ObjServicio.Usuarios_cambiarRol(2, 1).catch((ObjCapturado: unknown) => ObjCapturado);
    expect(ObjError).toBeInstanceOf(ErrorApi);
    expect(ObjError).toMatchObject({ IntEstadoHttp: IntEstado, StrCodigo });
  });
});
