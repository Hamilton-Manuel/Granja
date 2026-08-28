import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LayoutInventario } from "../../components/inventario/LayoutInventario";
import { PaginaCatalogosInventario } from "./PaginaCatalogosInventario";

const ObjPermisos = vi.hoisted(() => ({ Arr: [] as string[] }));
vi.mock("../../hooks/useSesion", () => ({ useSesion: () => ({ Autenticacion_tienePermiso: (StrPermiso: string) => ObjPermisos.Arr.includes(StrPermiso) }) }));
vi.mock("../../hooks/useInventarioLista", () => ({
  Inventario_mensajeError: () => "Error",
  useInventarioLista: () => ({ ArrDatos: [], Inventario_recargar: vi.fn().mockResolvedValue(undefined) }),
}));

beforeEach(() => { ObjPermisos.Arr = []; });

describe("Catálogos de Inventario", () => {
  it("conserva Categorías y Almacenes y elimina Productos por proveedor", () => {
    render(<PaginaCatalogosInventario />);
    expect(screen.getByRole("tab", { name: "Categorías" })).toBeVisible(); expect(screen.getByRole("tab", { name: "Almacenes" })).toBeVisible();
    expect(screen.queryByRole("tab", { name: "Productos por proveedor" })).toBeNull(); expect(screen.queryByText("Gestionar producto por proveedor")).toBeNull();
  });

  it("no usa el permiso legacy como acceso artificial a Catálogos", () => {
    ObjPermisos.Arr = ["INVENTARIO_PROVEEDORES_PRODUCTOS_GESTIONAR"];
    const { rerender } = render(<MemoryRouter><LayoutInventario /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "Catálogos" })).toBeNull();
    ObjPermisos.Arr = ["INVENTARIO_CATEGORIAS_EDITAR"];
    rerender(<MemoryRouter><LayoutInventario /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Catálogos" })).toBeVisible();
  });
});
