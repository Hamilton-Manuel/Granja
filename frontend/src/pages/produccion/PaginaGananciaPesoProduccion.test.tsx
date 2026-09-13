import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaginaGananciaPesoProduccion } from "./PaginaGananciaPesoProduccion";
import * as S from "../../services/produccion.service";
import type { AnalisisGananciaPeso, ResumenGananciaPeso } from "../../types/produccion.types";

vi.mock("../../services/produccion.service", () => ({
  Produccion_analizarGananciaAnimal: vi.fn(), Produccion_analizarGananciaLote: vi.fn(), Produccion_analizarGananciaAsignacion: vi.fn(),
  Produccion_listarAnimales: vi.fn(), Produccion_listarLotes: vi.fn(),
}));
vi.mock("../../components/ui/Autocomplete", () => ({ Autocomplete: ({ StrEtiqueta, Autocomplete_seleccionar }: { StrEtiqueta: string; Autocomplete_seleccionar: (Obj: unknown) => void }) =>
  <button type="button" onClick={() => Autocomplete_seleccionar(StrEtiqueta === "Animal" ? { animalId: 7, identificacion: "A-007" } : { loteProduccionId: 3, codigo: "L-003", nombre: "Lote" })}>Seleccionar {StrEtiqueta}</button>,
}));

const ObjResumen: ResumenGananciaPeso = {
  estado: "CALCULADO", cantidadMediciones: 2,
  primera: { fechaMedicion: "2026-09-11T20:32:00.000-06:00", pesoKg: "100", pesoLb: "220.46226218487757" },
  ultima: { fechaMedicion: "2026-09-12T08:32:00.000-06:00", pesoKg: "98", pesoLb: "216.053" },
  gananciaTotalKg: "-2", gananciaTotalLb: "-4.4092452436975514", diasTotales: "0.5",
  gpdAcumuladaKg: "-4", gpdAcumuladaLb: "-8.81849", ultimaGpdKg: "-4", ultimaGpdLb: "-8.81849",
};
function Produccion_analisisPrueba(): AnalisisGananciaPeso {
  return { animal: { animalId: 7, identificacion: "A-007", estadoActual: "ACTIVO" }, permanencia: null, periodo: {}, resumen: ObjResumen, incidencias: [], medicionesExcluidas: 0,
    evolucion: [
      { ...ObjResumen.primera!, medicionId: 1, metodoObtencion: "BASCULA", diasDesdeAnterior: null, cambioKg: null, cambioLb: null, gpdPeriodoKg: null, gpdPeriodoLb: null, gananciaAcumuladaKg: null, gananciaAcumuladaLb: null, gpdAcumuladaKg: null, gpdAcumuladaLb: null },
      { ...ObjResumen.ultima!, medicionId: 2, metodoObtencion: "ESTIMACION_SCHAEFFER", diasDesdeAnterior: "0.5", cambioKg: "-2", cambioLb: "-4.4092452436975514", gpdPeriodoKg: "-4", gpdPeriodoLb: "-8.81849", gananciaAcumuladaKg: "-2", gananciaAcumuladaLb: "-4.4092452436975514", gpdAcumuladaKg: "-4", gpdAcumuladaLb: "-8.81849" },
    ] };
}
function Produccion_renderizar() { render(<MemoryRouter><PaginaGananciaPesoProduccion /></MemoryRouter>); }
describe("análisis de ganancia de peso", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(S.Produccion_analizarGananciaAnimal).mockResolvedValue({ datos: Produccion_analisisPrueba() });
  });
  it("requiere selección, conserva filtros y presenta pérdida y N/D sin recalcular", async () => {
    Produccion_renderizar();
    fireEvent.click(screen.getByRole("button", { name: "Analizar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Seleccione un animal");
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar Animal" }));
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-11" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-09-12" } });
    fireEvent.click(screen.getByRole("button", { name: "Analizar" }));
    expect(await screen.findByRole("table", { name: /Evolución cronológica/ })).toBeVisible();
    expect(S.Produccion_analizarGananciaAnimal).toHaveBeenCalledWith(7, { fechaDesde: "2026-09-11", fechaHasta: "2026-09-12" });
    const ArrFilas = within(screen.getByRole("table")).getAllByRole("row");
    expect(ArrFilas[1]).toHaveTextContent("N/D");
    expect(ArrFilas[1]).toHaveTextContent("20:32");
    expect(ArrFilas[2]).toHaveTextContent("-4.00 kg/día");
    expect(ArrFilas[2]).toHaveTextContent("Estimación por medidas corporales");
    expect(screen.getByRole("link", { name: "Volver a Mediciones" })).toHaveAttribute("href", "/produccion/mediciones");
  });
  it("rechaza fechas invertidas sin consultar", () => {
    Produccion_renderizar();
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-09-12" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-09-11" } });
    fireEvent.click(screen.getByRole("button", { name: "Analizar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Desde no puede ser posterior");
    expect(S.Produccion_analizarGananciaAnimal).not.toHaveBeenCalled();
  });
  it("muestra ausencia de datos y una sola pesada sin GPD", async () => {
    const Obj = Produccion_analisisPrueba();
    Obj.resumen = { ...ObjResumen, estado: "SIN_MEDICIONES", cantidadMediciones: 0, primera: null, ultima: null, gpdAcumuladaKg: null, gpdAcumuladaLb: null };
    Obj.evolucion = [];
    vi.mocked(S.Produccion_analizarGananciaAnimal).mockResolvedValueOnce({ datos: Obj });
    Produccion_renderizar();
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar Animal" }));
    fireEvent.click(screen.getByRole("button", { name: "Analizar" }));
    expect(await screen.findByText("No hay mediciones válidas en el período seleccionado.")).toBeVisible();
    Obj.resumen = { ...ObjResumen, estado: "DATOS_INSUFICIENTES", cantidadMediciones: 1, gpdAcumuladaKg: null, gpdAcumuladaLb: null };
    Obj.evolucion = [Produccion_analisisPrueba().evolucion[0]!];
    vi.mocked(S.Produccion_analizarGananciaAnimal).mockResolvedValueOnce({ datos: { ...Obj } });
    fireEvent.click(screen.getByRole("button", { name: "Analizar" }));
    expect(await screen.findByText(/Se necesitan al menos dos mediciones/)).toBeVisible();
  });
  it("lote conserva filas de reingreso y abre el detalle de la permanencia", async () => {
    const ObjPermanencia = { animal: Produccion_analisisPrueba().animal, fechaInicio: "2026-09-11T00:00:00.000-06:00", fechaFin: null, resumen: ObjResumen, incidencias: [], medicionesExcluidas: 0 };
    vi.mocked(S.Produccion_analizarGananciaLote).mockResolvedValue({ datos: {
      lote: { loteProduccionId: 3, codigo: "L-003", nombre: "Lote", estado: "ACTIVO" }, periodo: {},
      cantidades: { animales: 1, permanencias: 2, conDatosSuficientes: 2, sinDatosSuficientes: 0 },
      permanencias: [{ ...ObjPermanencia, asignacionLoteId: 11 }, { ...ObjPermanencia, asignacionLoteId: 12 }], incidencias: [],
    } });
    vi.mocked(S.Produccion_analizarGananciaAsignacion).mockResolvedValue({ datos: { ...Produccion_analisisPrueba(), permanencia: { asignacionLoteId: 12, fechaInicio: ObjPermanencia.fechaInicio, fechaFin: null, lote: { loteProduccionId: 3, codigo: "L-003", nombre: "Lote", estado: "ACTIVO" } } } });
    Produccion_renderizar();
    fireEvent.change(screen.getByLabelText("Analizar por"), { target: { value: "LOTE" } });
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar Lote" }));
    fireEvent.click(screen.getByRole("button", { name: "Analizar" }));
    const ObjBoton = await screen.findByRole("button", { name: "Ver detalle de A-007, permanencia 12" });
    expect(screen.getByRole("button", { name: "Ver detalle de A-007, permanencia 11" })).toBeVisible();
    fireEvent.click(ObjBoton);
    expect(await screen.findByRole("table", { name: /Evolución cronológica/ })).toBeVisible();
    expect(S.Produccion_analizarGananciaAsignacion).toHaveBeenCalledWith(12, {});
    expect(screen.getByRole("table", { name: "Resumen por animal y permanencia" })).toBeVisible();
  });
  it("descarta respuestas anteriores si cambia la selección", async () => {
    let Produccion_resolver!: (Obj: { datos: AnalisisGananciaPeso }) => void;
    vi.mocked(S.Produccion_analizarGananciaAnimal).mockReturnValue(new Promise(ObjResolver => { Produccion_resolver = ObjResolver; }));
    Produccion_renderizar();
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar Animal" }));
    fireEvent.click(screen.getByRole("button", { name: "Analizar" }));
    fireEvent.change(screen.getByLabelText("Analizar por"), { target: { value: "LOTE" } });
    Produccion_resolver({ datos: Produccion_analisisPrueba() });
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(screen.queryByRole("region", { name: "Detalle de ganancia de peso" })).not.toBeInTheDocument();
  });
  it("muestra errores del backend", async () => {
    vi.mocked(S.Produccion_analizarGananciaAnimal).mockRejectedValue(new Error("fallo"));
    Produccion_renderizar();
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar Animal" }));
    fireEvent.click(screen.getByRole("button", { name: "Analizar" }));
    expect(await screen.findByRole("alert")).toBeVisible();
  });
});
