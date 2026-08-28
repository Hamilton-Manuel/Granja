import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PaginaAccesos } from "./PaginaAccesos";
import * as UsuariosServicio from "../../services/usuarios.service";

const Autenticacion_refrescarSesionSilenciosa = vi.fn();
vi.mock("../../hooks/useSesion", () => ({ useSesion: () => ({ ObjUsuario: { usuarioId: 2 }, Autenticacion_refrescarSesionSilenciosa }) }));
vi.mock("../../services/usuarios.service", () => ({ Usuarios_listarAccesos: vi.fn(), Usuarios_obtenerRoles: vi.fn(), Usuarios_obtenerAccesos: vi.fn(), Usuarios_actualizarAccesos: vi.fn() }));

const ObjUsuario = { usuarioId: 2, nombreCompleto: "Rubén Catalán", nombreUsuario: "rcatalan", estado: "ACTIVO" as const, esProtegida: false, rol: { rolId: 1, nombre: "ADMINISTRADOR" } };
const ObjDetalle = { usuario: { usuarioId: 2, nombreCompleto: "Rubén Catalán", nombreUsuario: "rcatalan", estado: "ACTIVO" as const, esProtegida: false }, versionAccesos: 0, rol: { rolId: 1, nombre: "ADMINISTRADOR" }, permisos: [{ permisoId: 10, codigo: "INVENTARIO_CONSULTAR", nombre: "Consultar inventario", modulo: "INVENTARIO", activo: true, estado: "HEREDAR" as const, permitido: true, origen: "HEREDADO_DEL_ROL" }] };

beforeEach(() => {
  Autenticacion_refrescarSesionSilenciosa.mockResolvedValue({ ...ObjUsuario, correo: "ruben@example.test", permisos: [] });
  vi.mocked(UsuariosServicio.Usuarios_listarAccesos).mockResolvedValue({ datos: [ObjUsuario], paginacion: { pagina: 1, limite: 50, total: 1 } });
  vi.mocked(UsuariosServicio.Usuarios_obtenerRoles).mockResolvedValue({ datos: [{ rolId: 1, nombre: "ADMINISTRADOR", descripcion: null, activo: true, esReservado: false, _count: { rolesPermisos: 81, usuarios: 1 } }, { rolId: 3, nombre: "OPERADOR", descripcion: null, activo: true, esReservado: false, _count: { rolesPermisos: 14, usuarios: 0 } }] });
  vi.mocked(UsuariosServicio.Usuarios_obtenerAccesos).mockResolvedValue({ datos: ObjDetalle });
  vi.mocked(UsuariosServicio.Usuarios_actualizarAccesos).mockResolvedValue({ datos: ObjDetalle });
});

describe("Administración visual de accesos", () => {
  it("usa autocomplete, presenta estados legibles y resume cambios sin alterar sus valores internos", async () => {
    render(<MemoryRouter initialEntries={["/accesos"]}><Routes><Route path="/accesos" element={<PaginaAccesos />} /><Route path="/inicio" element={<h1>Inicio</h1>} /></Routes></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Administración de accesos" })).toBeInTheDocument();
    await userEvent.type(screen.getByRole("combobox", { name: "Buscar usuario" }), "Rubén");
    const ObjNombreOpcion = await screen.findByText("Rubén Catalán", { selector: ".accesos-opcion-usuario strong" });
    await userEvent.click(ObjNombreOpcion.closest("button")!);
    expect(await screen.findByText("Consultar inventario")).toBeInTheDocument();
    expect(screen.getByText("INVENTARIO_CONSULTAR")).toBeInTheDocument();
    expect(screen.getByText("Por el rol")).toBeInTheDocument();
    expect(screen.queryByText("HEREDADO_DEL_ROL")).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Asignación individual"), "PERMITIR");
    expect(screen.getByRole("heading", { name: "Cambios pendientes" })).toBeInTheDocument();
    expect(screen.getByText("Según el rol → Permitir")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    const ObjDialogo = screen.getByRole("dialog", { name: "Guardar cambios de acceso" });
    await userEvent.click(within(ObjDialogo).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(UsuariosServicio.Usuarios_actualizarAccesos).toHaveBeenCalledWith(2, { versionAccesos: 0, rolId: 1, cambios: [{ permisoId: 10, estado: "PERMITIR" }] }));
    expect(Autenticacion_refrescarSesionSilenciosa).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { name: "Inicio" })).toBeInTheDocument();
  });
});
