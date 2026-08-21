import { afterEach, describe, expect, it, vi } from "vitest";

import * as ObjClientes from "./clientes.service";
import * as ObjProveedores from "./proveedores.service";

afterEach(() => vi.unstubAllGlobals());

function Api_respuesta(ObjDatos: unknown): Response {
  return new Response(JSON.stringify(ObjDatos), { status: 200, headers: { "content-type": "application/json" } });
}

describe("servicios de clientes y proveedores", () => {
  it("serializa paginacion y filtros reales", async () => {
    const ObjFetch = vi.fn().mockImplementation(() => Promise.resolve(Api_respuesta({ datos: [], paginacion: { pagina: 2, limite: 20, total: 0 } })));
    vi.stubGlobal("fetch", ObjFetch);
    await ObjClientes.Clientes_listar({ pagina: 2, limite: 20, busqueda: "CLI", estado: "ACTIVO", tipoClienteId: 3 });
    await ObjProveedores.Proveedores_listar({ pagina: 1, limite: 20, busqueda: "PRO", estado: "INACTIVO", tipoProveedorId: 4 });
    expect(ObjFetch.mock.calls[0]?.[0]).toBe("/api/clientes?pagina=2&limite=20&busqueda=CLI&estado=ACTIVO&tipoClienteId=3");
    expect(ObjFetch.mock.calls[1]?.[0]).toBe("/api/proveedores?pagina=1&limite=20&busqueda=PRO&estado=INACTIVO&tipoProveedorId=4");
    expect((ObjFetch.mock.calls[0]?.[1] as RequestInit).credentials).toBe("include");
  });

  it("envia solo el contrato de creacion y deja el codigo al servidor", async () => {
    const ObjFetch = vi.fn().mockResolvedValue(Api_respuesta({ datos: { cliente: { codigo: "CLI000001" } } }));
    vi.stubGlobal("fetch", ObjFetch);
    await ObjClientes.Clientes_crear({ tipoClienteId: 1, nombreCompleto: "Cliente", nit: null });
    const ObjSolicitud = ObjFetch.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(ObjSolicitud.body))).toEqual({ tipoClienteId: 1, nombreCompleto: "Cliente", nit: null });
    expect(String(ObjSolicitud.body)).not.toContain("codigo");
  });

  it("usa los endpoints especificos de estado", async () => {
    const ObjFetch = vi.fn().mockImplementation(() => Promise.resolve(Api_respuesta({ datos: {} })));
    vi.stubGlobal("fetch", ObjFetch);
    await ObjClientes.Clientes_cambiarEstado(5, false);
    await ObjProveedores.Proveedores_cambiarEstado(6, true);
    expect(ObjFetch.mock.calls[0]?.[0]).toBe("/api/clientes/5/estado");
    expect(ObjFetch.mock.calls[1]?.[0]).toBe("/api/proveedores/6/estado");
  });
});
