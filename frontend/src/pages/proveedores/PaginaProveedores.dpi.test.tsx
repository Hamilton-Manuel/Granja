import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FormularioProveedor } from "../../components/proveedores/FormularioProveedor";
import { PaginaProveedores } from "./PaginaProveedores";

const ArrTipos = [{ tipoProveedorId: 1, codigo: "PERSONA_INDIVIDUAL", nombre: "Persona individual", descripcion: null, activo: true }];
const ArrProveedores = [
  { proveedorId: 1, tipoProveedorId: 1, codigo: "PRO000001", nombre: "Proveedor con DPI", nombreComercial: null, numeroDocumento: "1234567890101", nit: "1234567", telefono: null, correo: null, direccion: null, observaciones: null, activo: true, fechaCreacion: "2026-08-20T08:00:00.000-06:00", fechaActualizacion: "2026-08-20T08:00:00.000-06:00", tipo: ArrTipos[0]! },
  { proveedorId: 2, tipoProveedorId: 1, codigo: "PRO000002", nombre: "Proveedor sin DPI", nombreComercial: null, numeroDocumento: null, nit: null, telefono: null, correo: null, direccion: null, observaciones: null, activo: true, fechaCreacion: "2026-08-20T08:00:00.000-06:00", fechaActualizacion: "2026-08-20T08:00:00.000-06:00", tipo: ArrTipos[0]! },
];

vi.mock("../../hooks/useSesion", () => ({ useSesion: () => ({ Autenticacion_tienePermiso: () => true }) }));
vi.mock("../../hooks/useProveedores", () => ({
  useProveedores: () => ({
    ArrProveedores,
    ArrTipos,
    ArrTiposActivos: ArrTipos,
    IntTotal: 2,
    IntPagina: 1,
    IntLimite: 20,
    BoolCargaInicial: false,
    BoolActualizando: false,
    StrError: null,
    StrExito: null,
    StrOperacion: null,
    establecerPagina: vi.fn(),
    Proveedores_aplicarFiltros: vi.fn(),
    Proveedores_crear: vi.fn(),
    Proveedores_editar: vi.fn(),
    Proveedores_cambiarEstado: vi.fn(),
  }),
}));

describe("presentacion de DPI en Proveedores", () => {
  it("muestra DPI como etiqueta del formulario y no Documento", () => {
    render(<FormularioProveedor StrModo="crear" ArrTipos={ArrTipos} BoolProcesando={false} Proveedores_cancelar={vi.fn()} Proveedores_guardar={vi.fn()} />);
    expect(screen.getByLabelText("DPI")).toBeInTheDocument();
    expect(screen.queryByLabelText("Documento")).not.toBeInTheDocument();
  });

  it("incluye DPI en tabla y muestra valor o guion", () => {
    const { container: ObjContenedor } = render(<PaginaProveedores />);
    const ObjTabla = within(ObjContenedor.querySelector(".contrapartes-tabla")!);
    expect(ObjTabla.getByRole("columnheader", { name: "DPI" })).toBeInTheDocument();
    const ArrFilas = ObjTabla.getAllByRole("row");
    expect(within(ArrFilas[1]!).getByText("1234567890101")).toBeInTheDocument();
    expect(within(ArrFilas[2]!).getAllByRole("cell")[4]).toHaveTextContent("—");
  });

  it("muestra DPI en todas las tarjetas, incluso cuando esta vacio", () => {
    const { container: ObjContenedor } = render(<PaginaProveedores />);
    const ArrTarjetas = Array.from(ObjContenedor.querySelectorAll<HTMLElement>(".contraparte-tarjeta"));
    expect(within(ArrTarjetas[0]!).getByText("DPI")).toBeInTheDocument();
    expect(within(ArrTarjetas[0]!).getByText("1234567890101")).toBeInTheDocument();
    expect(within(ArrTarjetas[1]!).getByText("DPI")).toBeInTheDocument();
    expect(within(ArrTarjetas[1]!).getAllByText("—").length).toBeGreaterThan(0);
  });
});
