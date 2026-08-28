import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSesion } from "../hooks/useSesion";
import { ErrorApi } from "../types/api.types";
import { ProveedorSesion } from "./ProveedorSesion";

const ObjUsuario = {
  usuarioId: 2,
  nombreCompleto: "Rubén Catalán",
  nombreUsuario: "rcatalan",
  correo: "ruben@example.test",
  estado: "ACTIVO",
  rol: { rolId: 1, nombre: "ADMINISTRADOR" },
  permisos: ["USUARIOS_ASIGNAR_ROL"],
};

function Sesion_respuesta(ObjContenido: unknown, IntEstado = 200): Response {
  return new Response(JSON.stringify(ObjContenido), { status: IntEstado, headers: { "content-type": "application/json" } });
}

function ControlesSesion() {
  const { ObjUsuario: ObjSesion, StrEstado, Autenticacion_manejarErrorProtegido } = useSesion();
  return <main data-testid="layout">
    <span>{StrEstado}</span><span>{ObjSesion?.nombreUsuario ?? "sin usuario"}</span>
    <button type="button" onClick={() => Autenticacion_manejarErrorProtegido(new ErrorApi(403, "SIN_PERMISO", "Sin permiso"))}>Simular 403</button>
    <button type="button" onClick={() => Autenticacion_manejarErrorProtegido(new ErrorApi(401, "NO_AUTENTICADO", "Sesión expirada"))}>Simular 401</button>
  </main>;
}

afterEach(() => vi.unstubAllGlobals());

describe("sincronización de sesión", () => {
  it("mantiene la sesión y el layout durante una resincronización por 403", async () => {
    let Sesion_resolverRefresco: ((ObjRespuesta: Response) => void) | undefined;
    const ObjFetch = vi.fn()
      .mockResolvedValueOnce(Sesion_respuesta({ datos: { usuario: ObjUsuario } }))
      .mockReturnValueOnce(new Promise<Response>((ObjResolver) => { Sesion_resolverRefresco = ObjResolver; }));
    vi.stubGlobal("fetch", ObjFetch);
    render(<ProveedorSesion><ControlesSesion /></ProveedorSesion>);
    expect(await screen.findByText("rcatalan")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Simular 403" }));
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByText("autenticada")).toBeInTheDocument();
    expect(screen.getByText("rcatalan")).toBeInTheDocument();
    expect(ObjFetch).toHaveBeenCalledTimes(2);

    Sesion_resolverRefresco?.(Sesion_respuesta({ datos: { usuario: { ...ObjUsuario, permisos: [] } } }));
    await waitFor(() => expect(ObjFetch).toHaveBeenCalledTimes(2));
  });

  it("un 401 invalida la sesión como antes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Sesion_respuesta({ datos: { usuario: ObjUsuario } })));
    render(<ProveedorSesion><ControlesSesion /></ProveedorSesion>);
    expect(await screen.findByText("rcatalan")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Simular 401" }));
    expect(screen.getByText("noAutenticada")).toBeInTheDocument();
    expect(screen.getByText("sin usuario")).toBeInTheDocument();
  });
});
