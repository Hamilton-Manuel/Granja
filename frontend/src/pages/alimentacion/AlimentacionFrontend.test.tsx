import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LayoutAlimentacion } from "../../components/alimentacion/LayoutAlimentacion";
import { PaginaHistorialAlimentacion } from "./PaginaHistorialAlimentacion";
import { PaginaRegistrarAlimentacion } from "./PaginaRegistrarAlimentacion";

const ObjPermisos = vi.hoisted(() => ({ Arr: [] as string[] }));
const ObjHistorial = vi.hoisted(() => ({
  ArrDatos: [] as unknown[],
  IntTotal: 0,
  BoolCargando: false,
  StrError: null as string | null,
  ObjConsulta: { pagina: 1, limite: 20 },
  establecerConsulta: vi.fn(),
  Alimentacion_cargar: vi.fn(),
}));

vi.mock("../../hooks/useSesion", () => ({
  useSesion: () => ({
    Autenticacion_tienePermiso: (StrPermiso: string) =>
      ObjPermisos.Arr.includes(StrPermiso),
  }),
}));

vi.mock("../../hooks/useAlimentacion", async () => {
  const ObjReal = await vi.importActual<
    typeof import("../../hooks/useAlimentacion")
  >("../../hooks/useAlimentacion");
  return { ...ObjReal, useAlimentacion: () => ObjHistorial };
});

const ObjServicios = vi.hoisted(() => ({
  buscarAnimales: vi.fn().mockResolvedValue([{ animalId: 7, identificacion: "ARETE-025", sexo: "HEMBRA", tipoAnimal: { tipoAnimalId: 1, nombre: "Bovino" }, loteVigente: { loteProduccionId: 2, codigo: "ENG-01", nombre: "Engorde" } }]),
}));

vi.mock("../../services/alimentacion.service", async () => {
  const ObjReal = await vi.importActual<typeof import("../../services/alimentacion.service")>("../../services/alimentacion.service");
  return {
    ...ObjReal,
    Alimentacion_listarProductos: vi.fn().mockResolvedValue({ datos: [{ productoId: 5, codigo: "ALI-01", nombre: "Concentrado", unidadMedida: "lb", manejaLotes: false, activo: true, habilitacionAlimentacion: { activo: true } }] }),
    Alimentacion_listarFormulas: vi.fn().mockResolvedValue({ datos: [] }),
    Alimentacion_buscarDestinosAnimales: ObjServicios.buscarAnimales,
    Alimentacion_buscarDestinosLotes: vi.fn().mockResolvedValue([]),
    Alimentacion_buscarAlmacenes: vi.fn().mockResolvedValue([]),
    Alimentacion_buscarExistencias: vi.fn().mockResolvedValue([]),
    Alimentacion_buscarLotesInventario: vi.fn().mockResolvedValue([]),
  };
});

beforeEach(() => {
  ObjPermisos.Arr = [];
  ObjHistorial.ArrDatos = [];
  ObjHistorial.IntTotal = 0;
});

describe("frontend Alimentación", () => {
  it("limita la navegación operativa usando permisos, no roles", () => {
    ObjPermisos.Arr = ["ALIMENTACION_CONSULTAR", "ALIMENTACION_REGISTRAR"];
    render(
      <MemoryRouter>
        <LayoutAlimentacion />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Historial" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Registrar" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Fórmulas" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Productos" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Diagnóstico" })).toBeNull();
  });

  it("distingue alimentación individual del consumo global de lote", () => {
    ObjHistorial.ArrDatos = [
      {
        alimentacionId: 1,
        fechaAlimentacion: "2026-08-24T07:00:00.000",
        estado: "CONFIRMADA",
        observaciones: null,
        animal: null,
        lote: { loteProduccionId: 2, codigo: "ENG-01", nombre: "Engorde" },
        formula: null,
        usuario: { usuarioId: 3, nombreCompleto: "Usuario operativo" },
        detalles: [
          {
            detalleAlimentacionId: 4,
            productoId: 5,
            cantidadConsumida: "80.0000",
            unidadMedida: "lb",
            producto: {
              productoId: 5,
              codigo: "ALI-01",
              nombre: "Concentrado",
              unidadMedida: "lb",
              manejaLotes: false,
              activo: true,
              habilitacionAlimentacion: { activo: true },
            },
            existencia: {
              almacen: { inventarioId: 1, codigo: "BOD-01", nombre: "Bodega" },
            },
            existenciaLote: null,
            inventarioTransacciones: [],
          },
        ],
      },
    ];
    ObjHistorial.IntTotal = 1;
    render(<PaginaHistorialAlimentacion />);
    expect(screen.getAllByText("Alimentación del lote ENG-01").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Consumo global del lote/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/80.0000 lb/).length).toBeGreaterThan(0);
  });

  it("usa autocomplete de destino y nunca solicita IDs técnicos", async () => {
    render(<PaginaRegistrarAlimentacion />);
    expect(screen.queryByText("Registro pendiente de lookups backend")).toBeNull();
    await userEvent.type(screen.getByRole("combobox", { name: "Animal" }), "ARETE");
    expect(await screen.findByRole("option", { name: /ARETE-025.*Bovino.*ENG-01/ })).toBeVisible();
    await userEvent.click(screen.getByRole("option", { name: /ARETE-025/ }));
    await waitFor(() => expect(ObjServicios.buscarAnimales).toHaveBeenCalledWith("ARETE"));
    expect(screen.queryByLabelText(/animalId|productoId|inventarioId/i)).toBeNull();
  });
});
