import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaginaCatalogosProduccion } from "./PaginaCatalogosProduccion";

let IntInvocacion = 0;
vi.mock("../../hooks/useSesion", () => ({ useSesion: () => ({ Autenticacion_tienePermiso: () => true }) }));
vi.mock("../../hooks/useProduccionLista", () => ({
  Produccion_mensajeError: () => "Error",
  useProduccionLista: () => {
    IntInvocacion += 1;
    return IntInvocacion % 2 === 1
      ? { ArrDatos: [{ tipoAnimalId: 1, nombre: "Bovino", descripcion: null, activo: true }], Produccion_recargar: vi.fn() }
      : { ArrDatos: [{ razaId: 2, tipoAnimalId: 1, nombre: "Brahman", descripcion: null, activo: true, tipoAnimal: { nombre: "Bovino" } }], Produccion_recargar: vi.fn() };
  },
}));

describe("catálogos de Producción", () => {
  beforeEach(() => { IntInvocacion = 0; });
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
    expect(within(ObjTarjetasRazas).getByText("Tipo de animal")).toBeInTheDocument();
    expect(within(ObjTarjetasRazas).getByRole("button", { name: "Editar Brahman" })).toBeInTheDocument();
    expect(within(ObjTarjetasRazas).getByRole("button", { name: "Inactivar Brahman" })).toBeInTheDocument();
  });
});
