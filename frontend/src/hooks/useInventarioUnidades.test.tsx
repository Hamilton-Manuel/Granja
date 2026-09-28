import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useInventarioUnidades } from "./useInventarioUnidades";
import { Inventario_listarUnidades } from "../services/inventario.service";
import { Inventario_agruparUnidades, Inventario_unidadesCompatibles } from "../utils/unidadesInventario";
import { ArrUnidadesPrueba } from "../tests/unidadesInventario";

vi.mock("../services/inventario.service", () => ({ Inventario_listarUnidades: vi.fn() }));
describe("catálogo dinámico de unidades", () => {
  it("carga todas las páginas y conserva inactivas solo como contexto histórico", async () => {
    const ObjInactiva = { ...ArrUnidadesPrueba[6]!, activo: false };
    vi.mocked(Inventario_listarUnidades).mockImplementation(async (Obj) => ({ datos: Obj.pagina === 1 ? [ArrUnidadesPrueba[7]!] : [ObjInactiva], paginacion: { pagina: Obj.pagina, limite: 100, total: 2 } }));
    const { result } = renderHook(() => useInventarioUnidades());
    await waitFor(() => expect(result.current.BoolCargando).toBe(false));
    expect(result.current.ArrUnidades).toHaveLength(2);
    expect(Inventario_agruparUnidades(result.current.ArrUnidades).flatMap((Obj) => Obj.ArrUnidades).map((Obj) => Obj.StrValor)).toEqual(["mL"]);
    expect(Inventario_unidadesCompatibles("L", result.current.ArrUnidades)).toEqual([]);
  });

  it("ofrece unidades nuevas de igual dimensión y nunca peso contra volumen", () => {
    const ArrCatalogo = [...ArrUnidadesPrueba, { unidadMedidaId: 50, codigo: "envase", nombre: "Envase", dimension: "VOLUMEN" as const, factorReferencia: "250", activo: true }];
    expect(Inventario_unidadesCompatibles("L", ArrCatalogo).map((Obj) => Obj.StrValor)).toEqual(["L", "mL", "envase"]);
    expect(Inventario_unidadesCompatibles("kg", ArrCatalogo).map((Obj) => Obj.StrValor)).toEqual(["kg", "g", "lb", "oz", "qq", "t"]);
  });
});
