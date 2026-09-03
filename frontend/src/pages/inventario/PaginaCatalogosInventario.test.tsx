import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LayoutInventario } from "../../components/inventario/LayoutInventario";
import type { AlmacenInventario, CategoriaInventario } from "../../types/inventario.types";
import { PaginaCatalogosInventario } from "./PaginaCatalogosInventario";

const ObjPruebas = vi.hoisted(() => ({ ArrPermisos: [] as string[], ArrCategorias: [] as CategoriaInventario[], ArrAlmacenes: [] as AlmacenInventario[], IntLlamadas: 0 }));
vi.mock("../../hooks/useSesion", () => ({ useSesion: () => ({ Autenticacion_tienePermiso: (StrPermiso: string) => ObjPruebas.ArrPermisos.includes(StrPermiso) }) }));
vi.mock("../../hooks/useInventarioLista", () => ({
  Inventario_mensajeError: () => "Error",
  useInventarioLista: (Inventario_solicitar: { name?: string }) => {
    ObjPruebas.IntLlamadas += 1;
    return { ArrDatos: Inventario_solicitar.name === "Inventario_categorias" ? ObjPruebas.ArrCategorias : ObjPruebas.ArrAlmacenes, Inventario_recargar: vi.fn().mockResolvedValue(undefined) };
  },
}));

const ObjCategoria: CategoriaInventario = { categoriaId: 1, nombre: "Alimentación", descripcion: "Para comida de animales", activo: true, fechaCreacion: "2026-01-01", fechaActualizacion: "2026-01-01" };
const ObjAlmacen: AlmacenInventario = { inventarioId: 2, codigo: "BOD-01", nombre: "Bodega principal", ubicacion: "Sector norte", descripcion: "Insumos generales", activo: false };

beforeEach(() => { ObjPruebas.ArrPermisos = []; ObjPruebas.ArrCategorias = []; ObjPruebas.ArrAlmacenes = []; ObjPruebas.IntLlamadas = 0; });

describe("Catálogos de Inventario", () => {
  it("conserva Categorías y Almacenes y elimina Productos por proveedor", () => {
    render(<PaginaCatalogosInventario />);
    expect(screen.getByRole("tab", { name: "Categorías" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Almacenes" })).toBeVisible();
    expect(screen.queryByRole("tab", { name: "Productos por proveedor" })).toBeNull();
  });

  it("renderiza la misma categoría en tabla de escritorio y tarjeta móvil", () => {
    ObjPruebas.ArrCategorias = [ObjCategoria];
    render(<PaginaCatalogosInventario />);
    expect(within(screen.getByLabelText("Tabla de categorías")).getByText("Alimentación")).toBeVisible();
    const ObjVistaMovil = screen.getByLabelText("categorías en vista móvil");
    expect(within(ObjVistaMovil).getByText("Alimentación")).toBeVisible();
    expect(within(ObjVistaMovil).getByText("Para comida de animales")).toBeVisible();
    expect(within(ObjVistaMovil).getByText("Activo")).toBeVisible();
  });

  it("muestra almacenes y todos sus campos reales en la tarjeta móvil", () => {
    ObjPruebas.ArrAlmacenes = [ObjAlmacen];
    render(<PaginaCatalogosInventario />);
    fireEvent.click(screen.getByRole("tab", { name: "Almacenes" }));
    const ObjVistaMovil = screen.getByLabelText("almacenes en vista móvil");
    expect(within(ObjVistaMovil).getByText("BOD-01 · Bodega principal")).toBeVisible();
    expect(within(ObjVistaMovil).getByText(/Sector norte/)).toBeVisible();
    expect(within(ObjVistaMovil).getByText(/Insumos generales/)).toBeVisible();
    expect(within(ObjVistaMovil).getByText("Inactivo")).toBeVisible();
  });

  it("aplica a las tarjetas móviles los mismos permisos de acciones", () => {
    ObjPruebas.ArrCategorias = [ObjCategoria];
    const { rerender } = render(<PaginaCatalogosInventario />);
    expect(within(screen.getByLabelText("categorías en vista móvil")).queryByRole("button", { name: "Editar" })).toBeNull();
    ObjPruebas.ArrPermisos = ["INVENTARIO_CATEGORIAS_EDITAR", "INVENTARIO_CATEGORIAS_CAMBIAR_ESTADO"];
    rerender(<PaginaCatalogosInventario />);
    const ObjVistaMovil = screen.getByLabelText("categorías en vista móvil");
    expect(within(ObjVistaMovil).getByRole("button", { name: "Editar" })).toBeVisible();
    expect(within(ObjVistaMovil).getByRole("button", { name: "Inactivar" })).toBeVisible();
  });

  it("presenta estados vacíos explícitos y no altera las dos cargas de datos", () => {
    render(<PaginaCatalogosInventario />);
    expect(screen.getByText("No hay categorías registradas.")).toBeVisible();
    expect(ObjPruebas.IntLlamadas).toBe(2);
    fireEvent.click(screen.getByRole("tab", { name: "Almacenes" }));
    expect(screen.getByText("No hay almacenes registrados.")).toBeVisible();
  });

  it("mantiene accesible y visible el tab superior activo de Inventario", () => {
    ObjPruebas.ArrPermisos = ["INVENTARIO_CATEGORIAS_EDITAR"];
    const Inventario_scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = Inventario_scrollIntoView;
    render(<MemoryRouter initialEntries={["/inventario/catalogos"]}><LayoutInventario /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Catálogos" })).toHaveAttribute("aria-current", "page");
    expect(Inventario_scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "nearest", inline: "center" });
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it("no usa el permiso legacy como acceso artificial a Catálogos", () => {
    ObjPruebas.ArrPermisos = ["INVENTARIO_PROVEEDORES_PRODUCTOS_GESTIONAR"];
    const { rerender } = render(<MemoryRouter><LayoutInventario /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "Catálogos" })).toBeNull();
    ObjPruebas.ArrPermisos = ["INVENTARIO_CATEGORIAS_EDITAR"];
    rerender(<MemoryRouter><LayoutInventario /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Catálogos" })).toBeVisible();
  });
});
