import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProveedorSesion } from "../../auth/ProveedorSesion";
import { RutasAplicacion } from "../../routes/RutasAplicacion";

const ObjWebmaster = {
  usuarioId: 1, nombreCompleto: "Webmaster Prueba", nombreUsuario: "webmaster", correo: "webmaster@example.test", estado: "ACTIVO",
  rol: { rolId: 1, nombre: "WEBMASTER" },
  permisos: ["USUARIOS_CONSULTAR", "USUARIOS_CREAR", "USUARIOS_EDITAR", "USUARIOS_CAMBIAR_ESTADO", "USUARIOS_ASIGNAR_ROL", "USUARIOS_CONSULTAR_CATALOGOS", "USUARIOS_REVOCAR_SESIONES"],
};
const ArrRoles = [
  { rolId: 1, nombre: "WEBMASTER", descripcion: null, activo: true, _count: { rolesPermisos: 7, usuarios: 1 } },
  { rolId: 2, nombre: "ADMINISTRADOR", descripcion: null, activo: true, _count: { rolesPermisos: 7, usuarios: 1 } },
  { rolId: 3, nombre: "OPERADOR", descripcion: null, activo: true, _count: { rolesPermisos: 0, usuarios: 1 } },
];
const ArrUsuarios = [
  { usuarioId: 1, nombreCompleto: "Webmaster Prueba", nombreUsuario: "webmaster", correo: "webmaster@example.test", estado: "ACTIVO", fechaCreacion: "2026-08-19T21:29:51.000-06:00", fechaActualizacion: "2026-08-19T21:29:51.000-06:00", rol: { rolId: 1, nombre: "WEBMASTER", activo: true } },
  { usuarioId: 2, nombreCompleto: "Operador Prueba", nombreUsuario: "operador", correo: "operador@example.test", estado: "ACTIVO", fechaCreacion: "2026-08-19T21:29:51.000-06:00", fechaActualizacion: "2026-08-19T21:29:51.000-06:00", rol: { rolId: 3, nombre: "OPERADOR", activo: true } },
];

function Usuarios_respuesta(ObjDatos: unknown, IntEstado = 200): Response {
  return new Response(IntEstado === 204 ? null : JSON.stringify(ObjDatos), { status: IntEstado, headers: { "content-type": "application/json" } });
}

function Usuarios_prepararFetch(ObjSesion = ObjWebmaster, IntTotal = 2) {
  const ObjFetch = vi.fn(async (ObjRuta: RequestInfo | URL, ObjOpciones?: RequestInit) => {
    const StrRuta = String(ObjRuta);
    if (StrRuta === "/api/usuarios/sesion") return Usuarios_respuesta({ datos: { usuario: ObjSesion } });
    if (StrRuta === "/api/usuarios/roles") return Usuarios_respuesta({ datos: ArrRoles });
    if (StrRuta.startsWith("/api/usuarios?") && (ObjOpciones?.method ?? "GET") === "GET") return Usuarios_respuesta({ datos: ArrUsuarios, paginacion: { pagina: StrRuta.includes("pagina=2") ? 2 : 1, limite: 20, total: IntTotal } });
    if (StrRuta === "/api/usuarios" && ObjOpciones?.method === "POST") return Usuarios_respuesta({ datos: ArrUsuarios[1] }, 201);
    if (StrRuta === "/api/usuarios/1" && ObjOpciones?.method === "PATCH") return Usuarios_respuesta({ datos: { ...ArrUsuarios[0], nombreCompleto: "Webmaster Actualizado" } });
    if (StrRuta === "/api/usuarios/2/estado" && ObjOpciones?.method === "PATCH") return Usuarios_respuesta({ datos: { ...ArrUsuarios[1], estado: "INACTIVO" } });
    if (StrRuta === "/api/usuarios/2/rol" && ObjOpciones?.method === "PATCH") return Usuarios_respuesta({ datos: { ...ArrUsuarios[1], rol: { rolId: 2, nombre: "ADMINISTRADOR", activo: true } } });
    if (StrRuta === "/api/usuarios/2/sesiones/revocar" && ObjOpciones?.method === "POST") return Usuarios_respuesta(undefined, 204);
    return Usuarios_respuesta({ error: { codigo: "NO_ENCONTRADO", mensaje: "No encontrado" } }, 404);
  });
  vi.stubGlobal("fetch", ObjFetch);
  return ObjFetch;
}

function Usuarios_renderizar(): void {
  render(<MemoryRouter initialEntries={["/usuarios"]}><ProveedorSesion><RutasAplicacion /></ProveedorSesion></MemoryRouter>);
}

afterEach(() => vi.unstubAllGlobals());

describe("página administrativa de Usuarios", () => {
  it("carga listado, habilita el menú y protege correctamente la fila WEBMASTER propia", async () => {
    Usuarios_prepararFetch(); Usuarios_renderizar();
    expect(await screen.findByRole("heading", { name: "Usuarios" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Usuarios/ })).toHaveAttribute("href", "/usuarios");
    expect(screen.getAllByText("Webmaster Prueba").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Editar a Webmaster Prueba" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Desactivar a Webmaster Prueba" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cambiar rol de Webmaster Prueba" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Revocar sesiones de Webmaster Prueba" }).length).toBeGreaterThan(0);
  });

  it("bloquea la ruta y no consulta usuarios sin USUARIOS_CONSULTAR", async () => {
    const ObjFetch = Usuarios_prepararFetch({ ...ObjWebmaster, permisos: [] }); Usuarios_renderizar();
    expect(await screen.findByRole("heading", { name: "Permiso insuficiente" })).toBeInTheDocument();
    expect(ObjFetch.mock.calls.some(([ObjRuta]) => String(ObjRuta).startsWith("/api/usuarios?"))).toBe(false);
  });

  it("aplica búsqueda, filtros y paginación solamente al enviar", async () => {
    const ObjFetch = Usuarios_prepararFetch(ObjWebmaster, 41); Usuarios_renderizar();
    await screen.findByRole("heading", { name: "Usuarios" });
    await userEvent.type(screen.getByLabelText("Buscar"), "Operador");
    expect(ObjFetch.mock.calls.filter(([ObjRuta]) => String(ObjRuta).includes("busqueda=")).length).toBe(0);
    await userEvent.selectOptions(screen.getByLabelText("Estado"), "ACTIVO");
    await userEvent.selectOptions(screen.getByLabelText("Rol", { selector: "#rol-usuarios" }), "3");
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(ObjFetch.mock.calls.some(([ObjRuta]) => String(ObjRuta).includes("busqueda=Operador") && String(ObjRuta).includes("estado=ACTIVO") && String(ObjRuta).includes("rolId=3"))).toBe(true));
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(ObjFetch.mock.calls.some(([ObjRuta]) => String(ObjRuta).includes("pagina=2"))).toBe(true));
  });

  it("excluye WEBMASTER de creación, valida campos y evita doble envío", async () => {
    const ObjFetch = Usuarios_prepararFetch(); Usuarios_renderizar();
    await screen.findByRole("heading", { name: "Usuarios" });
    await userEvent.click(screen.getByRole("button", { name: "Nuevo usuario" }));
    const ObjDialogo = screen.getByRole("dialog", { name: "Nuevo usuario" });
    const ObjSelector = within(ObjDialogo).getByLabelText("Rol");
    expect(within(ObjSelector).queryByRole("option", { name: "WEBMASTER" })).not.toBeInTheDocument();
    expect(within(ObjSelector).getByRole("option", { name: "ADMINISTRADOR" })).toBeInTheDocument();
    expect(within(ObjSelector).getByRole("option", { name: "OPERADOR" })).toBeInTheDocument();
    await userEvent.click(within(ObjDialogo).getByRole("button", { name: "Guardar" }));
    expect(await within(ObjDialogo).findByText("La contraseña debe tener entre 8 y 128 caracteres.")).toBeInTheDocument();
    expect(ObjFetch.mock.calls.filter(([ObjRuta, ObjOpciones]) => String(ObjRuta) === "/api/usuarios" && ObjOpciones?.method === "POST")).toHaveLength(0);
    await userEvent.type(within(ObjDialogo).getByLabelText("Nombre completo"), "Nuevo Operador");
    await userEvent.type(within(ObjDialogo).getByLabelText("Nombre de usuario"), "nuevo.operador");
    await userEvent.type(within(ObjDialogo).getByLabelText("Correo"), "nuevo@example.test");
    await userEvent.type(within(ObjDialogo).getByLabelText("Contraseña inicial"), "contrasena-segura");
    await userEvent.selectOptions(ObjSelector, "3");
    await userEvent.click(within(ObjDialogo).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(ObjFetch.mock.calls.filter(([ObjRuta, ObjOpciones]) => String(ObjRuta) === "/api/usuarios" && ObjOpciones?.method === "POST")).toHaveLength(1));
  });

  it("edita solamente datos generales y refresca la sesión al autoeditarse", async () => {
    const ObjFetch = Usuarios_prepararFetch(); Usuarios_renderizar();
    await screen.findByRole("heading", { name: "Usuarios" });
    await userEvent.click(screen.getAllByRole("button", { name: "Editar a Webmaster Prueba" })[0]!);
    const ObjDialogo = screen.getByRole("dialog", { name: "Editar usuario" });
    const ObjNombre = within(ObjDialogo).getByLabelText("Nombre completo");
    await userEvent.clear(ObjNombre);
    await userEvent.type(ObjNombre, "Webmaster Actualizado");
    await userEvent.click(within(ObjDialogo).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(ObjFetch.mock.calls.some(([ObjRuta, ObjOpciones]) => String(ObjRuta) === "/api/usuarios/1" && ObjOpciones?.method === "PATCH" && String(ObjOpciones.body).includes("nombreCompleto"))).toBe(true));
    await waitFor(() => expect(ObjFetch.mock.calls.filter(([ObjRuta]) => String(ObjRuta) === "/api/usuarios/sesion").length).toBeGreaterThan(1));
  });

  it("ejecuta estado, rol y revocación con confirmaciones separadas", async () => {
    const ObjFetch = Usuarios_prepararFetch(); Usuarios_renderizar();
    await screen.findByRole("heading", { name: "Usuarios" });
    await userEvent.click(screen.getAllByRole("button", { name: "Desactivar a Operador Prueba" })[0]!);
    let ObjDialogo = screen.getByRole("dialog", { name: "Confirmar cambio de estado" });
    expect(within(ObjDialogo).getByText(/perderá acceso/)).toBeInTheDocument();
    await userEvent.click(within(ObjDialogo).getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(ObjFetch.mock.calls.some(([ObjRuta, ObjOpciones]) => String(ObjRuta) === "/api/usuarios/2/estado" && ObjOpciones?.method === "PATCH")).toBe(true));

    await userEvent.click(screen.getAllByRole("button", { name: "Cambiar rol de Operador Prueba" })[0]!);
    ObjDialogo = screen.getByRole("dialog", { name: "Cambiar rol" });
    expect(within(ObjDialogo).queryByRole("option", { name: "WEBMASTER" })).not.toBeInTheDocument();
    await userEvent.selectOptions(within(ObjDialogo).getByLabelText("Nuevo rol"), "2");
    await userEvent.click(within(ObjDialogo).getByRole("button", { name: "Cambiar rol" }));
    await waitFor(() => expect(ObjFetch.mock.calls.some(([ObjRuta, ObjOpciones]) => String(ObjRuta) === "/api/usuarios/2/rol" && ObjOpciones?.method === "PATCH")).toBe(true));

    await userEvent.click(screen.getAllByRole("button", { name: "Revocar sesiones de Operador Prueba" })[0]!);
    ObjDialogo = screen.getByRole("dialog", { name: "Revocar sesiones" });
    await userEvent.click(within(ObjDialogo).getByRole("button", { name: "Revocar sesiones" }));
    await waitFor(() => expect(ObjFetch.mock.calls.some(([ObjRuta, ObjOpciones]) => String(ObjRuta) === "/api/usuarios/2/sesiones/revocar" && ObjOpciones?.method === "POST")).toBe(true));
  });

  it("oculta todas las mutaciones sensibles de un WEBMASTER ajeno", async () => {
    Usuarios_prepararFetch({ ...ObjWebmaster, usuarioId: 9, rol: { rolId: 2, nombre: "ADMINISTRADOR" } }); Usuarios_renderizar();
    await screen.findByRole("heading", { name: "Usuarios" });
    expect(screen.getAllByText("Cuenta protegida").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Editar a Webmaster Prueba" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revocar sesiones de Webmaster Prueba" })).not.toBeInTheDocument();
  });

  it("autorrevoca WEBMASTER, espera el 401 de sesión y vuelve a login", async () => {
    let BoolRevocada = false;
    vi.stubGlobal("fetch", vi.fn(async (ObjRuta: RequestInfo | URL, ObjOpciones?: RequestInit) => {
      const StrRuta = String(ObjRuta);
      if (StrRuta === "/api/usuarios/sesion") return BoolRevocada
        ? Usuarios_respuesta({ error: { codigo: "SESION_REVOCADA", mensaje: "Sesión revocada" } }, 401)
        : Usuarios_respuesta({ datos: { usuario: ObjWebmaster } });
      if (StrRuta === "/api/usuarios/roles") return Usuarios_respuesta({ datos: ArrRoles });
      if (StrRuta.startsWith("/api/usuarios?")) return Usuarios_respuesta({ datos: ArrUsuarios, paginacion: { pagina: 1, limite: 20, total: 2 } });
      if (StrRuta === "/api/usuarios/1/sesiones/revocar" && ObjOpciones?.method === "POST") { BoolRevocada = true; return Usuarios_respuesta(undefined, 204); }
      return Usuarios_respuesta({ error: { codigo: "NO_ENCONTRADO", mensaje: "No encontrado" } }, 404);
    }));
    Usuarios_renderizar();
    await screen.findByRole("heading", { name: "Usuarios" });
    await userEvent.click(screen.getAllByRole("button", { name: "Revocar sesiones de Webmaster Prueba" })[0]!);
    const ObjDialogo = screen.getByRole("dialog", { name: "Revocar sesiones" });
    expect(within(ObjDialogo).getByText(/incluida la actual/)).toBeInTheDocument();
    await userEvent.click(within(ObjDialogo).getByRole("button", { name: "Revocar sesiones" }));
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });
});
