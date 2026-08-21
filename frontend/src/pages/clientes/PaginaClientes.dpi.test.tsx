import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FormularioCliente } from "../../components/clientes/FormularioCliente";
import { PaginaClientes } from "./PaginaClientes";

const ArrTipos = [{ tipoClienteId: 1, codigo: "PERSONA_INDIVIDUAL", nombre: "Persona individual", descripcion: null, activo: true }];
const ArrClientes = [
  { clienteId: 1, tipoClienteId: 1, codigo: "CLI000001", nombreCompleto: "Cliente con DPI", numeroDocumento: "1234567890101", nit: "1234567", telefono: null, correo: null, direccion: null, observaciones: null, activo: true, fechaCreacion: "2026-08-20T08:00:00.000-06:00", fechaActualizacion: "2026-08-20T08:00:00.000-06:00", tipo: ArrTipos[0]! },
  { clienteId: 2, tipoClienteId: 1, codigo: "CLI000002", nombreCompleto: "Consumidor Final", numeroDocumento: null, nit: "CF", telefono: null, correo: null, direccion: null, observaciones: null, activo: true, fechaCreacion: "2026-08-20T08:00:00.000-06:00", fechaActualizacion: "2026-08-20T08:00:00.000-06:00", tipo: ArrTipos[0]! },
];

vi.mock("../../hooks/useSesion", () => ({ useSesion: () => ({ Autenticacion_tienePermiso: () => true }) }));
vi.mock("../../hooks/useClientes", () => ({
  useClientes: () => ({
    ArrClientes,
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
    Clientes_aplicarFiltros: vi.fn(),
    Clientes_crear: vi.fn(),
    Clientes_editar: vi.fn(),
    Clientes_cambiarEstado: vi.fn(),
  }),
}));

describe("presentacion de DPI en Clientes", () => {
  it("muestra DPI como etiqueta del formulario y no Documento", () => {
    render(<FormularioCliente StrModo="crear" ArrTipos={ArrTipos} BoolProcesando={false} Clientes_cancelar={vi.fn()} Clientes_guardar={vi.fn()} />);
    expect(screen.getByLabelText("DPI")).toBeInTheDocument();
    expect(screen.queryByLabelText("Documento")).not.toBeInTheDocument();
  });

  it("incluye DPI en tabla y muestra valor o guion", () => {
    const { container: ObjContenedor } = render(<PaginaClientes />);
    const ObjTabla = within(ObjContenedor.querySelector(".contrapartes-tabla")!);
    expect(ObjTabla.getByRole("columnheader", { name: "DPI" })).toBeInTheDocument();
    const ArrFilas = ObjTabla.getAllByRole("row");
    expect(within(ArrFilas[1]!).getByText("1234567890101")).toBeInTheDocument();
    expect(within(ArrFilas[2]!).getAllByRole("cell")[3]).toHaveTextContent("—");
  });

  it("muestra DPI en todas las tarjetas, incluso cuando esta vacio", () => {
    const { container: ObjContenedor } = render(<PaginaClientes />);
    const ArrTarjetas = Array.from(ObjContenedor.querySelectorAll<HTMLElement>(".contraparte-tarjeta"));
    expect(within(ArrTarjetas[0]!).getByText("DPI")).toBeInTheDocument();
    expect(within(ArrTarjetas[0]!).getByText("1234567890101")).toBeInTheDocument();
    expect(within(ArrTarjetas[1]!).getByText("DPI")).toBeInTheDocument();
    expect(within(ArrTarjetas[1]!).getAllByText("—").length).toBeGreaterThan(0);
  });
});
