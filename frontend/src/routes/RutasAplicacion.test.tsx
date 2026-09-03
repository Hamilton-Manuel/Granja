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
  it("muestra Clientes y Proveedores solo con sus permisos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Autenticacion_respuestaJson({
      datos: { usuario: { ...ObjUsuario, permisos: ["CLIENTES_CONSULTAR", "PROVEEDORES_CONSULTAR"] } },
    })));
    Autenticacion_renderizar("/inicio");
    expect(await screen.findByRole("link", { name: /Clientes/ })).toHaveAttribute("href", "/clientes");
    expect(screen.getByRole("link", { name: /Proveedores/ })).toHaveAttribute("href", "/proveedores");
    expect(screen.queryByRole("link", { name: /Usuarios/ })).not.toBeInTheDocument();
  });

  it.each(["/clientes", "/proveedores"])("protege la ruta %s sin permiso", async (StrRuta) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Autenticacion_respuestaJson({
      datos: { usuario: { ...ObjUsuario, permisos: [] } },
    })));
    Autenticacion_renderizar(StrRuta);
    expect(await screen.findByRole("heading", { name: "Permiso insuficiente" })).toBeInTheDocument();
  });

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
    expect(await screen.findByRole("heading", { name: "Bienvenido a Granja El Chiflón" })).toBeInTheDocument();
  });

  it("recupera usuario, rol, permisos y deshabilita módulos futuros", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Autenticacion_respuestaJson({ datos: { usuario: ObjUsuario } })));
    Autenticacion_renderizar("/inicio");
    expect(await screen.findByText("Administradora El Chiflón")).toBeInTheDocument();
    expect(screen.getAllByText("ADMINISTRADOR").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Usuarios/ })).toHaveAttribute("href", "/usuarios");
    expect(screen.queryByRole("link", { name: /Inventario/ })).not.toBeInTheDocument();
  });

  it("navega internamente sin volver a consultar la sesión ni desmontar el layout", async () => {
    let Usuarios_resolver: ((ObjRespuesta: Response) => void) | undefined;
    const ObjFetch = vi.fn().mockImplementation((StrRuta: string) => {
      if (StrRuta === "/api/usuarios/sesion") return Promise.resolve(Autenticacion_respuestaJson({ datos: { usuario: ObjUsuario } }));
      if (StrRuta.startsWith("/api/usuarios?")) return new Promise<Response>((ObjResolver) => { Usuarios_resolver = ObjResolver; });
      throw new Error(`Ruta inesperada: ${StrRuta}`);
    });
    vi.stubGlobal("fetch", ObjFetch);
    Autenticacion_renderizar("/inicio");
    expect(await screen.findByRole("heading", { name: "Bienvenido a Granja El Chiflón" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: /Usuarios/ }));

    expect(screen.queryByText("Comprobando su sesión…")).not.toBeInTheDocument();
    expect(screen.getByText("Administradora El Chiflón")).toBeInTheDocument();
    expect(ObjFetch.mock.calls.filter(([StrRuta]) => StrRuta === "/api/usuarios/sesion")).toHaveLength(1);

    Usuarios_resolver?.(Autenticacion_respuestaJson({ datos: [], paginacion: { pagina: 1, limite: 20, total: 0 } }));
  });

  it("muestra Inventario y protege sus rutas mediante INVENTARIO_CONSULTAR", async () => {
    const ObjFetch = vi.fn().mockImplementation((ObjRuta: string) => {
      if (ObjRuta === "/api/usuarios/sesion") return Promise.resolve(Autenticacion_respuestaJson({ datos: { usuario: { ...ObjUsuario, rol: { rolId: 3, nombre: "OPERADOR" }, permisos: ["INVENTARIO_CONSULTAR"] } } }));
      if (ObjRuta === "/api/inventario/resumen") return Promise.resolve(Autenticacion_respuestaJson({ datos: { productosActivos: 0, existenciasOperativas: 0, existenciasBajoMinimo: 0, lotesActivos: 0, lotesProximosVencer: 0, lotesVencidos: 0, movimientosRecientes: [] } }));
      throw new Error(`Ruta inesperada: ${ObjRuta}`);
    });
    vi.stubGlobal("fetch", ObjFetch);
    Autenticacion_renderizar("/inventario");
    expect(await screen.findByRole("heading", { name: "Resumen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Inventario/ })).toHaveAttribute("href", "/inventario");
    expect(screen.queryByRole("link", { name: "Diagnóstico" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Catálogos" })).not.toBeInTheDocument();
  });

  it("bloquea Inventario sin permiso y no lo muestra en el menú", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Autenticacion_respuestaJson({ datos: { usuario: { ...ObjUsuario, permisos: [] } } })));
    Autenticacion_renderizar("/inventario");
    expect(await screen.findByRole("heading", { name: "Permiso insuficiente" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Inventario/ })).not.toBeInTheDocument();
  });

  it("impide abrir Catálogos con permisos exclusivamente operativos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Autenticacion_respuestaJson({ datos: { usuario: { ...ObjUsuario, permisos: ["INVENTARIO_CONSULTAR", "INVENTARIO_ENTRADAS_CREAR", "INVENTARIO_SALIDAS_CREAR", "INVENTARIO_TRANSFERENCIAS_CREAR"] } } })));
    Autenticacion_renderizar("/inventario/catalogos");
    expect(await screen.findByRole("heading", { name: "Permiso insuficiente" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Catálogos" })).not.toBeInTheDocument();
  });

  it("muestra Producción y limita la experiencia operativa mediante permisos", async () => {
    const ArrPermisos = ["PRODUCCION_CONSULTAR", "PRODUCCION_NACIMIENTOS_CREAR", "PRODUCCION_TRASLADOS_CREAR", "PRODUCCION_MEDICIONES_CREAR"];
    const ObjFetch = vi.fn().mockImplementation((ObjRuta: string) => {
      if (ObjRuta === "/api/usuarios/sesion") return Promise.resolve(Autenticacion_respuestaJson({ datos: { usuario: { ...ObjUsuario, rol: { rolId: 99, nombre: "ROL_CUALQUIERA" }, permisos: ArrPermisos } } }));
      if (ObjRuta.startsWith("/api/produccion/lotes?")) return Promise.resolve(Autenticacion_respuestaJson({ datos: [], paginacion: { pagina: 1, limite: 1, total: 0 } }));
      if (ObjRuta.startsWith("/api/produccion/animales?")) return Promise.resolve(Autenticacion_respuestaJson({ datos: [], paginacion: { pagina: 1, limite: 1, total: 0 } }));
      if (ObjRuta.startsWith("/api/produccion/operaciones?")) return Promise.resolve(Autenticacion_respuestaJson({ datos: [], paginacion: { pagina: 1, limite: 5, total: 0 } }));
      throw new Error(`Ruta inesperada: ${ObjRuta}`);
    });
    vi.stubGlobal("fetch", ObjFetch);
    Autenticacion_renderizar("/produccion");
    expect(await screen.findByRole("heading", { name: "Resumen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Producción/ })).toHaveAttribute("href", "/produccion");
    expect(screen.getByRole("link", { name: "Ingresos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Traslados" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Catálogos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Diagnóstico" })).not.toBeInTheDocument();
  });

  it("bloquea Producción sin PRODUCCION_CONSULTAR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Autenticacion_respuestaJson({ datos: { usuario: { ...ObjUsuario, permisos: [] } } })));
    Autenticacion_renderizar("/produccion");
    expect(await screen.findByRole("heading", { name: "Permiso insuficiente" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Producción/ })).not.toBeInTheDocument();
  });

  it("muestra Alimentación y limita sus acciones con permisos reales", async () => {
    const ObjFetch = vi.fn().mockImplementation((StrRuta: string) => {
      if (StrRuta === "/api/usuarios/sesion") {
        return Promise.resolve(Autenticacion_respuestaJson({
          datos: { usuario: { ...ObjUsuario, rol: { rolId: 3, nombre: "OPERADOR" }, permisos: ["ALIMENTACION_CONSULTAR", "ALIMENTACION_REGISTRAR"] } },
        }));
      }
      if (StrRuta === "/api/alimentacion?pagina=1&limite=20") {
        return Promise.resolve(Autenticacion_respuestaJson({ datos: [], paginacion: { pagina: 1, limite: 20, total: 0 } }));
      }
      throw new Error(`Ruta inesperada: ${StrRuta}`);
    });
    vi.stubGlobal("fetch", ObjFetch);
    Autenticacion_renderizar("/alimentacion");
    expect(await screen.findByRole("heading", { name: "Historial operativo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Alimentación/ })).toHaveAttribute("href", "/alimentacion");
    expect(screen.getByRole("link", { name: "Registrar" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Fórmulas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Productos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Diagnóstico" })).not.toBeInTheDocument();
  });

  it("protege Alimentación y oculta su menú sin ALIMENTACION_CONSULTAR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Autenticacion_respuestaJson({ datos: { usuario: { ...ObjUsuario, permisos: [] } } })));
    Autenticacion_renderizar("/alimentacion");
    expect(await screen.findByRole("heading", { name: "Permiso insuficiente" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Alimentación/ })).not.toBeInTheDocument();
  });

  it("muestra Ventas y limita OPERADOR a consulta y registro mediante permisos", async () => {
    const ObjFetch = vi.fn().mockImplementation((StrRuta: string) => {
      if (StrRuta === "/api/usuarios/sesion") return Promise.resolve(Autenticacion_respuestaJson({ datos: { usuario: { ...ObjUsuario, rol: { rolId: 88, nombre: "ROL_SIN_REGLAS_ESPECIALES" }, permisos: ["VENTAS_CONSULTAR", "VENTAS_REGISTRAR"] } } }));
      if (StrRuta === "/api/ventas?pagina=1&limite=20") return Promise.resolve(Autenticacion_respuestaJson({ ok: true, datos: [], paginacion: { pagina: 1, limite: 20, total: 0 } }));
      throw new Error(`Ruta inesperada: ${StrRuta}`);
    });
    vi.stubGlobal("fetch", ObjFetch);
    Autenticacion_renderizar("/ventas");
    expect(await screen.findByRole("heading", { name: "Historial de ventas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ventas/ })).toHaveAttribute("href", "/ventas");
    expect(screen.getByRole("link", { name: "Registrar" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Diagnóstico" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Anular venta/ })).not.toBeInTheDocument();
  });

  it("protege Ventas y oculta su menú sin VENTAS_CONSULTAR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Autenticacion_respuestaJson({ datos: { usuario: { ...ObjUsuario, permisos: [] } } })));
    Autenticacion_renderizar("/ventas");
    expect(await screen.findByRole("heading", { name: "Permiso insuficiente" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ventas/ })).not.toBeInTheDocument();
  });

  it("protege la ruta de recibo con VENTAS_CONSULTAR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Autenticacion_respuestaJson({ datos: { usuario: { ...ObjUsuario, permisos: [] } } })));
    Autenticacion_renderizar("/ventas/1/recibo");
    expect(await screen.findByRole("heading", { name: "Permiso insuficiente" })).toBeInTheDocument();
  });

  it("redirige una sesión existente que intenta entrar a login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Autenticacion_respuestaJson({ datos: { usuario: ObjUsuario } })));
    Autenticacion_renderizar("/login");
    expect(await screen.findByRole("heading", { name: "Bienvenido a Granja El Chiflón" })).toBeInTheDocument();
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
    expect(await screen.findByRole("heading", { name: "Bienvenido a Granja El Chiflón" })).toBeInTheDocument();
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
    await screen.findByRole("heading", { name: "Bienvenido a Granja El Chiflón" });
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    await waitFor(() => expect(ObjFetch).toHaveBeenCalledTimes(2));
  });
});
