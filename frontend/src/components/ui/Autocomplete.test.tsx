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
});
