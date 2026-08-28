import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Autocomplete } from "./Autocomplete";

interface OpcionPrueba { id: number; etiqueta: string }

describe("Autocomplete", () => {
  it("busca con debounce, muestra etiquetas legibles y conserva el ID como valor interno", async () => {
    const Autocomplete_buscar = vi.fn().mockResolvedValue([{ id: 41, etiqueta: "ARETE-154 — HEMBRA — Bovino" }]);
    const Autocomplete_seleccionar = vi.fn();
    render(<Autocomplete<OpcionPrueba> StrEtiqueta="Madre (opcional)" StrPlaceholder="Buscar por código o identificación..." ObjSeleccion={null} Autocomplete_buscar={Autocomplete_buscar} Autocomplete_clave={(ObjOpcion) => ObjOpcion.id} Autocomplete_etiqueta={(ObjOpcion) => ObjOpcion.etiqueta} Autocomplete_seleccionar={Autocomplete_seleccionar} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Madre (opcional)" }), { target: { value: "ARETE" } });
    await waitFor(() => expect(Autocomplete_buscar).toHaveBeenCalledWith("ARETE"), { timeout: 1000 });
    fireEvent.click(await screen.findByRole("option", { name: "ARETE-154 — HEMBRA — Bovino" }));
    expect(Autocomplete_seleccionar).toHaveBeenLastCalledWith({ id: 41, etiqueta: "ARETE-154 — HEMBRA — Bovino" });
    expect(screen.queryByText(/^41$/)).not.toBeInTheDocument();
  });

  it("permite enriquecer visualmente una opción sin cambiar su etiqueta accesible", async () => {
    const Autocomplete_buscar = vi.fn().mockResolvedValue([{ id: 7, etiqueta: "Rubén Catalán" }]);
    render(<Autocomplete<OpcionPrueba> StrEtiqueta="Buscar usuario" StrPlaceholder="Buscar..." ObjSeleccion={null} Autocomplete_buscar={Autocomplete_buscar} Autocomplete_clave={(ObjOpcion) => ObjOpcion.id} Autocomplete_etiqueta={(ObjOpcion) => ObjOpcion.etiqueta} Autocomplete_seleccionar={vi.fn()} Autocomplete_renderizarOpcion={(ObjOpcion) => <span><strong>{ObjOpcion.etiqueta}</strong><small>rcatalan · ADMINISTRADOR</small></span>} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Buscar usuario" }), { target: { value: "Rubén" } });
    expect(await screen.findByRole("option", { name: /Rubén Catalán.*rcatalan/ })).toBeInTheDocument();
  });
});
