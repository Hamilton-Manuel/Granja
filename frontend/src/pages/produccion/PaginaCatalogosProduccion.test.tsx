import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaginaCatalogosProduccion } from "./PaginaCatalogosProduccion";

let IntInvocacion = 0;
let BoolPermitir = true;
vi.mock("../../hooks/useSesion", () => ({ useSesion: () => ({ Autenticacion_tienePermiso: () => BoolPermitir }) }));
vi.mock("../../hooks/useProduccionLista", () => ({
  Produccion_mensajeError: () => "Error",
  useProduccionLista: () => {
    IntInvocacion += 1;
    return IntInvocacion % 2 === 1
      ? { ArrDatos: [{ tipoAnimalId: 1, nombre: "Bovino", descripcion: "Vacas", activo: true }, { tipoAnimalId: 3, nombre: "Porcino", descripcion: "Cerdos", activo: true }], Produccion_recargar: vi.fn() }
      : { ArrDatos: [{ razaId: 2, tipoAnimalId: 1, nombre: "Brahman", descripcion: "Ganado cebú", activo: true, tipoAnimal: { nombre: "Bovino" } }, { razaId: 4, tipoAnimalId: 3, nombre: "Duroc", descripcion: null, activo: true, tipoAnimal: { nombre: "Porcino" } }], Produccion_recargar: vi.fn() };
  },
}));

describe("catálogos de Producción", () => {
  beforeEach(() => { IntInvocacion = 0; BoolPermitir = true; });
  it("omite Tipo en tipos de animales y muestra Tipo de animal en razas", () => {
    render(<PaginaCatalogosProduccion />);
    expect(screen.getByRole("columnheader", { name: "Nombre" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Tipo" })).not.toBeInTheDocument();
    const ObjTarjetasTipos = screen.getByLabelText("Listado móvil de tipos de animales");
    expect(within(ObjTarjetasTipos).getByRole("heading", { name: "Bovino" })).toBeInTheDocument();
    expect(within(ObjTarjetasTipos).queryByText("Tipo de animal")).not.toBeInTheDocument();
    expect(within(ObjTarjetasTipos).getByRole("button", { name: "Editar Bovino" })).toBeInTheDocument();
    expect(within(ObjTarjetasTipos).getByRole("button", { name: "Inactivar Bovino" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Razas" }));
    expect(screen.getByRole("columnheader", { name: "Tipo de animal" })).toBeInTheDocument();
    expect(screen.getAllByText("Bovino").length).toBeGreaterThan(0);
    const ObjTarjetasRazas = screen.getByLabelText("Listado móvil de razas");
    expect(within(ObjTarjetasRazas).getAllByText("Tipo de animal")).toHaveLength(2);
    expect(within(ObjTarjetasRazas).getByRole("button", { name: "Editar Brahman" })).toBeInTheDocument();
    expect(within(ObjTarjetasRazas).getByRole("button", { name: "Inactivar Brahman" })).toBeInTheDocument();
  });

  it("precarga nombre y descripción al editar un tipo de animal", () => {
    render(<PaginaCatalogosProduccion />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Bovino" }));
    expect(screen.getByLabelText("Nombre")).toHaveValue("Bovino");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Vacas");
  });

  it("precarga el ID del tipo, nombre y descripción al editar una raza", () => {
    render(<PaginaCatalogosProduccion />);
    fireEvent.click(screen.getByRole("button", { name: "Razas" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Brahman" }));
    expect(screen.getByLabelText("Tipo animal")).toHaveValue("1");
    expect(screen.getByLabelText("Nombre")).toHaveValue("Brahman");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Ganado cebú");
  });

  it("limpia el formulario al cerrar Editar y abrir Nuevo registro", () => {
    render(<PaginaCatalogosProduccion />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Bovino" }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Cambio sin guardar" } });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar Editar catálogo" }));
    fireEvent.click(screen.getByRole("button", { name: "Nuevo registro" }));
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(screen.getByLabelText("Descripción")).toHaveValue("");
    expect(screen.getAllByText("Bovino").length).toBeGreaterThan(0);
    expect(screen.queryByText("Cambio sin guardar")).not.toBeInTheDocument();
  });

  it("reemplaza el estado local al editar un segundo registro", () => {
    render(<PaginaCatalogosProduccion />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Bovino" }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Temporal" } });
    fireEvent.click(screen.getByRole("button", { name: "Cerrar Editar catálogo" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Porcino" }));
    expect(screen.getByLabelText("Nombre")).toHaveValue("Porcino");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Cerdos");
  });

  it("no conserva estado incorrecto al cambiar entre Tipos y Razas", () => {
    render(<PaginaCatalogosProduccion />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Bovino" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar Editar catálogo" }));
    fireEvent.click(screen.getByRole("button", { name: "Razas" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Duroc" }));
    expect(screen.getByLabelText("Tipo animal")).toHaveValue("3");
    expect(screen.getByLabelText("Nombre")).toHaveValue("Duroc");
    expect(screen.getByLabelText("Descripción")).toHaveValue("");
  });

  it("mantiene ocultas las acciones cuando falta el permiso existente", () => {
    BoolPermitir = false;
    render(<PaginaCatalogosProduccion />);
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nuevo registro" })).not.toBeInTheDocument();
  });
});
