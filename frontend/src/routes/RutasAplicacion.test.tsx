import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProveedorSesion } from "../auth/ProveedorSesion";
import { RutasAplicacion } from "./RutasAplicacion";

const ObjUsuario = {
  usuarioId: 1,
  nombreCompleto: "Administradora El Chiflón",
  nombreUsuario: "admin",
  correo: "admin@example.test",
  estado: "ACTIVO",
  rol: { rolId: 1, nombre: "ADMINISTRADOR" },
  permisos: ["USUARIOS_CONSULTAR"],
};

function Autenticacion_respuestaJson(ObjContenido: unknown, IntEstado = 200): Response {
  return new Response(JSON.stringify(ObjContenido), {
    status: IntEstado,
    headers: { "content-type": "application/json" },
  });
}

function Autenticacion_renderizar(StrRuta: string): void {
  render(
    <MemoryRouter initialEntries={[StrRuta]}>
      <ProveedorSesion>
        <RutasAplicacion />
      </ProveedorSesion>
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("sesión y rutas", () => {
  it("evita mostrar rutas mientras comprueba la sesión y después protege /inicio", async () => {
    let Autenticacion_resolver: ((ObjRespuesta: Response) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise<Response>((ObjResolver) => { Autenticacion_resolver = ObjResolver; })));
    Autenticacion_renderizar("/inicio");
    expect(screen.getByText("Comprobando su sesión…")).toBeInTheDocument();
    expect(screen.queryByText("Iniciar sesión")).not.toBeInTheDocument();
    Autenticacion_resolver?.(Autenticacion_respuestaJson({ error: { codigo: "NO_AUTENTICADO", mensaje: "Debe iniciar sesión." } }, 401));
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("muestra error recuperable para 500 y permite reintentar", async () => {
    const ObjFetch = vi.fn()
      .mockResolvedValueOnce(Autenticacion_respuestaJson({ error: { codigo: "ERROR_INTERNO", mensaje: "Ocurrió un error interno." } }, 500))
      .mockResolvedValueOnce(Autenticacion_respuestaJson({ datos: { usuario: ObjUsuario } }));
    vi.stubGlobal("fetch", ObjFetch);
    Autenticacion_renderizar("/inicio");
    expect(await screen.findByRole("heading", { name: "No fue posible comprobar su sesión" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Iniciar sesión" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Sesión activa")).toBeInTheDocument();
  });

  it("recupera usuario, rol, permisos y deshabilita módulos futuros", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Autenticacion_respuestaJson({ datos: { usuario: ObjUsuario } })));
    Autenticacion_renderizar("/inicio");
    expect(await screen.findByText("Administradora El Chiflón")).toBeInTheDocument();
    expect(screen.getAllByText("ADMINISTRADOR").length).toBeGreaterThan(0);
    expect(screen.getByText("Usuarios").closest("span")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Inventario").closest("span")).toHaveAttribute("aria-disabled", "true");
  });

  it("redirige una sesión existente que intenta entrar a login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Autenticacion_respuestaJson({ datos: { usuario: ObjUsuario } })));
    Autenticacion_renderizar("/login");
    expect(await screen.findByText("Sesión activa")).toBeInTheDocument();
  });

  it("inicia sesión sin confundir el 401 del login con expiración", async () => {
    const ObjFetch = vi.fn()
      .mockResolvedValueOnce(Autenticacion_respuestaJson({ error: { codigo: "NO_AUTENTICADO", mensaje: "Debe iniciar sesión." } }, 401))
      .mockResolvedValueOnce(Autenticacion_respuestaJson({ error: { codigo: "CREDENCIALES_INVALIDAS", mensaje: "Las credenciales no son válidas." } }, 401));
    vi.stubGlobal("fetch", ObjFetch);
    Autenticacion_renderizar("/login");
    await screen.findByRole("heading", { name: "Iniciar sesión" });
    await userEvent.type(screen.getByLabelText("Usuario o correo"), "admin");
    await userEvent.type(screen.getByLabelText("Contraseña"), "incorrecta");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByText("Las credenciales proporcionadas no son válidas.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("inicia sesión correctamente y navega a Inicio", async () => {
    const ObjFetch = vi.fn()
      .mockResolvedValueOnce(Autenticacion_respuestaJson({ error: { codigo: "NO_AUTENTICADO", mensaje: "Debe iniciar sesión." } }, 401))
      .mockResolvedValueOnce(Autenticacion_respuestaJson({
        datos: { usuario: ObjUsuario, sesion: { fechaExpiracion: "2026-08-20T07:00:00.000-06:00" } },
      }));
    vi.stubGlobal("fetch", ObjFetch);
    Autenticacion_renderizar("/login");
    await screen.findByRole("heading", { name: "Iniciar sesión" });
    await userEvent.type(screen.getByLabelText("Usuario o correo"), "admin");
    await userEvent.type(screen.getByLabelText("Contraseña"), "contrasena-segura");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByText("Sesión activa")).toBeInTheDocument();
    const ObjSolicitudLogin = ObjFetch.mock.calls[1]?.[1] as RequestInit;
    expect(ObjSolicitudLogin.credentials).toBe("include");
    expect(ObjSolicitudLogin.body).toBe(JSON.stringify({ identificador: "admin", contrasena: "contrasena-segura" }));
  });

  it("no muestra el wildcard antes de terminar la comprobación inicial", async () => {
    let Autenticacion_resolver: ((ObjRespuesta: Response) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise<Response>((ObjResolver) => { Autenticacion_resolver = ObjResolver; })));
    Autenticacion_renderizar("/direccion-desconocida");
    expect(screen.getByText("Comprobando su sesión…")).toBeInTheDocument();
    expect(screen.queryByText("Página no encontrada")).not.toBeInTheDocument();
    Autenticacion_resolver?.(Autenticacion_respuestaJson({ error: { codigo: "NO_AUTENTICADO", mensaje: "Debe iniciar sesión." } }, 401));
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.queryByText("Página no encontrada")).not.toBeInTheDocument();
  });

  it("muestra el mensaje amigable para 429", async () => {
    const ObjFetch = vi.fn()
      .mockResolvedValueOnce(Autenticacion_respuestaJson({ error: { codigo: "NO_AUTENTICADO", mensaje: "Debe iniciar sesión." } }, 401))
      .mockResolvedValueOnce(Autenticacion_respuestaJson({ error: { codigo: "DEMASIADOS_INTENTOS", mensaje: "interno" } }, 429));
    vi.stubGlobal("fetch", ObjFetch);
    Autenticacion_renderizar("/login");
    await screen.findByRole("heading", { name: "Iniciar sesión" });
    fireEvent.change(screen.getByLabelText("Usuario o correo"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "incorrecta" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByText("Se realizaron demasiados intentos. Intente nuevamente más tarde.")).toBeInTheDocument();
  });

  it("cierra una sesión con 204 y vuelve a login", async () => {
    const ObjFetch = vi.fn()
      .mockResolvedValueOnce(Autenticacion_respuestaJson({ datos: { usuario: ObjUsuario } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", ObjFetch);
    Autenticacion_renderizar("/inicio");
    await screen.findByText("Sesión activa");
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    await waitFor(() => expect(ObjFetch).toHaveBeenCalledTimes(2));
  });
});
