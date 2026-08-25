import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LayoutSanidad } from "../../components/sanidad/LayoutSanidad";
import { PaginaHistorialSanidad } from "./PaginaHistorialSanidad";

const ObjPermisos = vi.hoisted(() => ({ Arr: [] as string[] }));
const ObjHistorial = vi.hoisted(() => ({ ArrDatos: [] as unknown[], IntTotal: 0, BoolCargando: false, StrError: null as string | null, ObjConsulta: { pagina: 1, limite: 20 }, establecerConsulta: vi.fn(), Sanidad_cargar: vi.fn() }));
vi.mock("../../hooks/useSesion", () => ({ useSesion: () => ({ Autenticacion_tienePermiso: (StrPermiso: string) => ObjPermisos.Arr.includes(StrPermiso) }) }));
vi.mock("../../hooks/useSanidad", async () => { const ObjReal = await vi.importActual<typeof import("../../hooks/useSanidad")>("../../hooks/useSanidad"); return { ...ObjReal, useSanidad: () => ObjHistorial }; });

describe("frontend Sanidad", () => {
  it("limita al operador a consulta y registro mediante permisos", () => {
    ObjPermisos.Arr = ["SANIDAD_CONSULTAR", "SANIDAD_REGISTRAR"];
    render(<MemoryRouter><LayoutSanidad /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Historial" })).toBeVisible(); expect(screen.getByRole("link", { name: "Registrar" })).toBeVisible(); expect(screen.queryByRole("link", { name: "Productos" })).toBeNull(); expect(screen.queryByRole("link", { name: "Catálogos" })).toBeNull(); expect(screen.queryByRole("link", { name: "Diagnóstico" })).toBeNull();
  });
  it("distingue aplicación global del lote y conserva la vía por detalle", () => {
    ObjHistorial.ArrDatos = [{ aplicacionSanitariaId: 1, fechaAplicacion: "2026-08-24T07:00:00.000-06:00", proximaAplicacion: null, motivo: "Prevención", diagnostico: null, observaciones: null, estado: "CONFIRMADA", animal: null, lote: { loteProduccionId: 2, codigo: "ENG-01", nombre: "Engorde" }, tipoAplicacion: { codigo: "VACUNA", nombre: "Vacuna", descripcion: null, activo: true }, usuario: { usuarioId: 1, nombreCompleto: "Responsable" }, detalles: [{ detalleSanidadId: 2, dosisClinica: "2.0000", alcanceDosis: "TOTAL_LOTE", unidadInventario: "ml", producto: { productoId: 4, codigo: "MED-01", nombre: "Vacuna", unidadMedida: "ml", manejaLotes: false, activo: true, habilitacionSanidad: { activo: true } }, unidadDosis: { codigo: "ML", nombre: "Mililitro", descripcion: null, activo: true }, viaAdministracion: { codigo: "INYECTABLE", nombre: "Inyectable", descripcion: null, activo: true }, fuentes: [] }] }]; ObjHistorial.IntTotal = 1;
    render(<PaginaHistorialSanidad />);
    expect(screen.getAllByText("Aplicación del lote ENG-01").length).toBeGreaterThan(0); expect(screen.getAllByText(/Vía: Inyectable/).length).toBeGreaterThan(0); expect(screen.getAllByText(/no distribuida entre animales/i).length).toBeGreaterThan(0);
  });
});
