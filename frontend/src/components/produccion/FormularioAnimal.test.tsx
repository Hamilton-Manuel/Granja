import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as ServicioProduccion from "../../services/produccion.service";
import type { LoteProduccion } from "../../types/produccion.types";
import { FormularioAnimal } from "./FormularioAnimal";

vi.mock("../../services/produccion.service", () => ({ Produccion_listarAnimales: vi.fn() }));
const ObjLote = { loteProduccionId: 2, tipoAnimalId: 7, codigo: "L-1", nombre: "Lote", estado: "ACTIVO", fechaInicio: "2026-08-21", fechaCierre: null, descripcion: null, tipoAnimal: { tipoAnimalId: 7, nombre: "Bovino", activo: true } } as LoteProduccion;

describe("FormularioAnimal", () => {
  it("presenta identificación legible y busca madres compatibles sin pedir IDs", async () => {
    vi.mocked(ServicioProduccion.Produccion_listarAnimales).mockResolvedValue({ datos: [], paginacion: { pagina: 1, limite: 10, total: 0 } });
    render(<FormularioAnimal ObjLote={ObjLote} ArrRazas={[]} BoolProcesando={false} Produccion_guardar={vi.fn()} />);
    expect(screen.getByLabelText(/Código \/ identificación del animal/)).toHaveAttribute("placeholder", "Ej. número de arete o código interno");
    expect(screen.queryByText(/Madre \(ID/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Madre (opcional)" }), { target: { value: "A-001" } });
    await waitFor(() => expect(ServicioProduccion.Produccion_listarAnimales).toHaveBeenCalledWith(expect.objectContaining({ busqueda: "A-001", sexo: "HEMBRA", tipoAnimalId: 7, estado: "ACTIVO" })), { timeout: 1000 });
  });
});
