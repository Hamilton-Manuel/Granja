import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogoUnidades } from "./CatalogoUnidades";
import * as S from "../../services/inventario.service";
import { ArrUnidadesPrueba } from "../../tests/unidadesInventario";
import type { UnidadInventario } from "../../types/inventario.types";

const ObjSesion = vi.hoisted(() => ({ ArrPermisos: [] as string[], Autenticacion_manejarErrorProtegido: () => false }));
vi.mock("../../hooks/useSesion", () => ({ useSesion: () => ({ Autenticacion_tienePermiso: (Str: string) => ObjSesion.ArrPermisos.includes(Str), Autenticacion_manejarErrorProtegido: ObjSesion.Autenticacion_manejarErrorProtegido }) }));
vi.mock("../../services/inventario.service", () => ({ Inventario_listarUnidades: vi.fn(), Inventario_crearUnidad: vi.fn(), Inventario_estadoUnidad: vi.fn() }));
let ArrDatos: UnidadInventario[];
beforeEach(() => {
  vi.clearAllMocks(); ObjSesion.ArrPermisos = ["INVENTARIO_PRODUCTOS_CREAR", "INVENTARIO_PRODUCTOS_CAMBIAR_ESTADO"];
  ArrDatos = ArrUnidadesPrueba.map((Obj) => ({ ...Obj }));
  vi.mocked(S.Inventario_listarUnidades).mockImplementation(async (Obj) => {
    const ArrFiltradas = ArrDatos.filter((ObjUnidad) => (!Obj.dimension || ObjUnidad.dimension === Obj.dimension) && (!Obj.estado || ObjUnidad.activo === (Obj.estado === "ACTIVO")));
    return { datos: ArrFiltradas, paginacion: { pagina: Obj.pagina, limite: Obj.limite, total: ArrFiltradas.length } };
  });
  vi.mocked(S.Inventario_crearUnidad).mockImplementation(async (Obj) => { const ObjNueva = { ...Obj, unidadMedidaId: 50, activo: true }; ArrDatos.push(ObjNueva); return { datos: ObjNueva }; });
  vi.mocked(S.Inventario_estadoUnidad).mockImplementation(async (IntId, BoolActivo) => { const ObjUnidad = ArrDatos.find((Obj) => Obj.unidadMedidaId === IntId)!; ObjUnidad.activo = BoolActivo; return { datos: ObjUnidad }; });
});

describe("administración de unidades de Inventario", () => {
  it("filtra por dimensión y mantiene visibles las unidades inactivas", async () => {
    const ObjUsuario = userEvent.setup(); render(<CatalogoUnidades />);
    await screen.findByRole("table");
    await ObjUsuario.selectOptions(screen.getByLabelText("Dimensión"), "VOLUMEN");
    await waitFor(() => expect(within(screen.getByRole("table")).queryByText("Kilogramo")).toBeNull());
    expect(within(screen.getByRole("table")).getByText("Litro")).toBeVisible();
    const ObjFila = within(screen.getByRole("table")).getByText("Litro").closest("tr")!;
    await ObjUsuario.click(within(ObjFila).getByRole("button", { name: "Inactivar" }));
    await ObjUsuario.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Inactivar" }));
    await waitFor(() => expect(S.Inventario_estadoUnidad).toHaveBeenCalledWith(7, false));
    await ObjUsuario.selectOptions(screen.getByLabelText("Estado"), "INACTIVO");
    await waitFor(() => expect(within(screen.getByRole("table")).queryByText("Mililitro")).toBeNull());
    expect(within(screen.getByRole("table")).getByText("Litro")).toBeVisible();
    expect(within(screen.getByRole("table")).getByRole("button", { name: "Activar" })).toBeVisible();
  });

  it("crea con factor decimal exacto y rechaza cero sin permitir editar factores", async () => {
    const ObjUsuario = userEvent.setup(); render(<CatalogoUnidades />);
    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: /Editar|Eliminar/ })).toBeNull();
    await ObjUsuario.click(screen.getByRole("button", { name: "Nueva unidad" }));
    const ObjDialogo = within(screen.getByRole("dialog"));
    await ObjUsuario.type(ObjDialogo.getByLabelText("Nombre"), "Envase de prueba");
    await ObjUsuario.type(ObjDialogo.getByLabelText("Símbolo"), "envase");
    await ObjUsuario.selectOptions(ObjDialogo.getByLabelText("Dimensión de la unidad"), "VOLUMEN");
    await ObjUsuario.type(ObjDialogo.getByLabelText("Factor de conversión"), "0");
    await ObjUsuario.click(ObjDialogo.getByRole("button", { name: "Guardar" }));
    expect(S.Inventario_crearUnidad).not.toHaveBeenCalled();
    await ObjUsuario.clear(ObjDialogo.getByLabelText("Factor de conversión"));
    await ObjUsuario.type(ObjDialogo.getByLabelText("Factor de conversión"), "250.123456789123456");
    await ObjUsuario.click(ObjDialogo.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(S.Inventario_crearUnidad).toHaveBeenCalledWith({ nombre: "Envase de prueba", codigo: "envase", dimension: "VOLUMEN", factorReferencia: "250.123456789123456" }));
    expect(await screen.findAllByText("Envase de prueba")).not.toHaveLength(0);
  });

  it("sin permisos de gestión permite consultar y oculta acciones", async () => {
    ObjSesion.ArrPermisos = []; render(<CatalogoUnidades />);
    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: "Nueva unidad" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Inactivar" })).toBeNull();
  });
});
