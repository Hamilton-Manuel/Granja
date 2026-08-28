import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProductoInventario } from "../../types/inventario.types";
import { FormularioProducto } from "./PaginaProductosInventario";

const ArrCategorias = [{ categoriaId: 1, nombre: "Alimentación", descripcion: null, activo: true, fechaCreacion: "", fechaActualizacion: "" }];
const ObjProductoBase: ProductoInventario = { productoId: 2, categoriaId: 1, codigo: "ALI-01", nombre: "Cebada", descripcion: null, unidadMedida: "lb", manejaLotes: false, activo: true, fechaCreacion: "", fechaActualizacion: "", categoria: { categoriaId: 1, nombre: "Alimentación", activo: true } };

function Inventario_renderizar(ObjProducto?: ProductoInventario) {
  const Inventario_guardar = vi.fn().mockResolvedValue(undefined);
  render(<FormularioProducto ObjProducto={ObjProducto} ArrCategorias={ArrCategorias} BoolProcesando={false} Inventario_cancelar={vi.fn()} Inventario_guardar={Inventario_guardar} />);
  return Inventario_guardar;
}

describe("formulario de productos de Inventario", () => {
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

  it("muestra el valor histórico no normalizado y exige seleccionar otro", async () => {
    const ObjUsuario = userEvent.setup(); const Inventario_guardar = Inventario_renderizar({ ...ObjProductoBase, unidadMedida: "Libras" });
    expect(screen.getByRole("alert")).toHaveTextContent('Valor actual no normalizado: "Libras"');
    expect(screen.getByRole("combobox", { name: /^Unidad de medida/ })).toHaveValue("");
    await ObjUsuario.click(screen.getByRole("button", { name: "Guardar" }));
    expect(Inventario_guardar).not.toHaveBeenCalled();
  });
});
