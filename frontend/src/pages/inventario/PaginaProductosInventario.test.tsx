import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductoInventario } from "../../types/inventario.types";
import { FormularioProducto } from "./PaginaProductosInventario";
import { ArrUnidadesPrueba, ArrUnidadesVolumenConfirmadasPrueba } from "../../tests/unidadesInventario";
import { useInventarioUnidades } from "../../hooks/useInventarioUnidades";

vi.mock("../../hooks/useInventarioUnidades", () => ({ useInventarioUnidades: vi.fn() }));
beforeEach(() => vi.mocked(useInventarioUnidades).mockReturnValue({ ArrUnidades: ArrUnidadesPrueba, BoolCargando: false, StrError: null }));

const ArrCategorias = [{ categoriaId: 1, nombre: "Alimentación", descripcion: null, activo: true, fechaCreacion: "", fechaActualizacion: "" }];
const ObjProductoBase: ProductoInventario = { productoId: 2, categoriaId: 1, codigo: "ALI-01", nombre: "Cebada", descripcion: null, unidadMedida: "lb", manejaLotes: false, activo: true, fechaCreacion: "", fechaActualizacion: "", categoria: { categoriaId: 1, nombre: "Alimentación", activo: true } };

function Inventario_renderizar(ObjProducto?: ProductoInventario) {
  const Inventario_guardar = vi.fn().mockResolvedValue(undefined);
  render(<FormularioProducto ObjProducto={ObjProducto} ArrCategorias={ArrCategorias} BoolProcesando={false} Inventario_cancelar={vi.fn()} Inventario_guardar={Inventario_guardar} />);
  return Inventario_guardar;
}

describe("formulario de productos de Inventario", () => {
  it("ofrece Galón y Caneca dentro de Volumen desde el catálogo", async () => {
    vi.mocked(useInventarioUnidades).mockReturnValue({ ArrUnidades: [...ArrUnidadesPrueba, ...ArrUnidadesVolumenConfirmadasPrueba], BoolCargando: false, StrError: null });
    Inventario_renderizar();
    expect(screen.getByRole("option", { name: "Galón (gal)" }).parentElement).toHaveAttribute("label", "Volumen");
    expect(screen.getByRole("option", { name: "Caneca (caneca)" }).parentElement).toHaveAttribute("label", "Volumen");
    await userEvent.setup().selectOptions(screen.getByRole("combobox", { name: "Unidad de medida" }), "caneca");
    expect(screen.getByRole("combobox", { name: "Unidad de medida" })).toHaveValue("caneca");
  });
  it("usa un select requerido con el catálogo normalizado y sin texto libre", () => {
    Inventario_renderizar();
    const ObjSelect = screen.getByRole("combobox", { name: "Unidad de medida" });
    expect(ObjSelect).toBeRequired();
    expect(screen.queryByRole("textbox", { name: /Unidad/ })).toBeNull();
    expect(Array.from((ObjSelect as HTMLSelectElement).options).map((Obj) => Obj.value)).toEqual(["", "kg", "g", "lb", "oz", "qq", "t", "L", "mL", "unidad"]);
  });

  it("requiere unidad al crear y envía el valor normalizado en unidadMedida", async () => {
    const ObjUsuario = userEvent.setup(); const Inventario_guardar = Inventario_renderizar();
    await ObjUsuario.type(screen.getByRole("textbox", { name: "Código" }), "ALI-02");
    await ObjUsuario.type(screen.getByRole("textbox", { name: "Nombre" }), "Melaza");
    await ObjUsuario.selectOptions(screen.getByRole("combobox", { name: "Categoría" }), "1");
    await ObjUsuario.click(screen.getByRole("button", { name: "Guardar" }));
    expect(Inventario_guardar).not.toHaveBeenCalled();
    await ObjUsuario.selectOptions(screen.getByRole("combobox", { name: "Unidad de medida" }), "L");
    await ObjUsuario.click(screen.getByRole("button", { name: "Guardar" }));
    expect(Inventario_guardar).toHaveBeenCalledWith(expect.objectContaining({ unidadMedida: "L" }));
  });

  it("carga automáticamente una unidad válida al editar", () => {
    Inventario_renderizar(ObjProductoBase);
    expect(screen.getByRole("combobox", { name: "Unidad de medida" })).toHaveValue("lb");
  });

  it("conserva la unidad histórica sin ofrecerla para nuevos registros", async () => {
    const ObjUsuario = userEvent.setup(); const Inventario_guardar = Inventario_renderizar({ ...ObjProductoBase, unidadMedida: "Libras" });
    expect(screen.getByRole("alert")).toHaveTextContent('Unidad actual no disponible para nuevos registros: "Libras"');
    expect(screen.getByRole("combobox", { name: /^Unidad de medida/ })).toHaveValue("Libras");
    expect(screen.getByRole("option", { name: "Libras (actual, no disponible)" })).toBeDisabled();
    await ObjUsuario.click(screen.getByRole("button", { name: "Guardar" }));
    expect(Inventario_guardar).toHaveBeenCalledWith(expect.objectContaining({ unidadMedida: "Libras" }));
  });

  it("incorpora unidades nuevas del catálogo y excluye inactivas", () => {
    vi.mocked(useInventarioUnidades).mockReturnValue({ ArrUnidades: [...ArrUnidadesPrueba.filter((Obj) => Obj.codigo !== "oz"), { unidadMedidaId: 30, nombre: "Envase", codigo: "envase", dimension: "VOLUMEN", factorReferencia: "250", activo: true }, { ...ArrUnidadesPrueba[3]!, activo: false }], BoolCargando: false, StrError: null });
    Inventario_renderizar();
    expect(screen.getByRole("option", { name: "Envase (envase)" }).parentElement).toHaveAttribute("label", "Volumen");
    expect(screen.queryByRole("option", { name: "Onza (oz)" })).toBeNull();
  });
});
