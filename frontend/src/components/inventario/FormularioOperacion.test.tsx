import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProductoInventario } from "../../types/inventario.types";
import { FormularioOperacion } from "./FormularioOperacion";

const ArrProductos: ProductoInventario[] = [
  { productoId: 41, categoriaId: 1, codigo: "ALM1", nombre: "Cebada", descripcion: null, unidadMedida: "lb", manejaLotes: false, activo: true, fechaCreacion: "", fechaActualizacion: "", categoria: { categoriaId: 1, nombre: "Alimentación", activo: true } },
  { productoId: 42, categoriaId: 1, codigo: "ALM2", nombre: "Maíz", descripcion: null, unidadMedida: "kg", manejaLotes: false, activo: true, fechaCreacion: "", fechaActualizacion: "", categoria: { categoriaId: 1, nombre: "Alimentación", activo: true } },
  { productoId: 43, categoriaId: 1, codigo: "MED1", nombre: "Albicid", descripcion: null, unidadMedida: "mL", manejaLotes: true, activo: true, fechaCreacion: "", fechaActualizacion: "", categoria: { categoriaId: 1, nombre: "Sanidad", activo: true } },
];
const ArrAlmacenes = [{ inventarioId: 7, codigo: "BOD1", nombre: "Principal", descripcion: null, ubicacion: null, activo: true }];
const ObjProveedor = { proveedorId: 81, codigo: "PRO000001", nombre: "Distribuidora del Norte, S.A.", nombreComercial: "Distribuidora Norte", activo: true };

function Inventario_renderizar(StrTipo: "INVENTARIO_INICIAL" | "COMPRA" = "INVENTARIO_INICIAL") {
  const Inventario_guardar = vi.fn().mockResolvedValue(undefined);
  render(<FormularioOperacion StrTipo={StrTipo} ArrProductos={ArrProductos} ArrAlmacenes={ArrAlmacenes} ArrProveedores={[ObjProveedor]} ArrLotes={[]} BoolProcesando={false} Inventario_cancelar={vi.fn()} Inventario_guardar={Inventario_guardar} />);
  return Inventario_guardar;
}

describe("saldo inicial de Inventario", () => {
  it("busca por código y nombre sin exponer IDs ni mostrar el select masivo", async () => {
    const ObjUsuario = userEvent.setup(); Inventario_renderizar();
    const ObjProducto = screen.getByRole("combobox", { name: "Producto" });
    expect(ObjProducto).toHaveAttribute("placeholder", "Buscar producto por código o nombre...");
    expect(screen.queryByRole("option", { name: "ALM1 · Cebada" })).toBeNull();
    await ObjUsuario.type(ObjProducto, "ALM1");
    expect(await screen.findByRole("option", { name: "ALM1 · Cebada" })).toBeVisible();
    await ObjUsuario.clear(ObjProducto); await ObjUsuario.type(ObjProducto, "maiz");
    expect(await screen.findByRole("option", { name: "ALM2 · Maíz" })).toBeVisible();
    expect(screen.queryByText("41")).toBeNull(); expect(screen.queryByText("42")).toBeNull();
  });

  it("conserva productoId en el contrato y al limpiar impide continuar", async () => {
    const ObjUsuario = userEvent.setup(); const Inventario_guardar = Inventario_renderizar();
    const ObjProducto = screen.getByRole("combobox", { name: "Producto" });
    await ObjUsuario.type(ObjProducto, "Cebada");
    await ObjUsuario.click(await screen.findByRole("option", { name: "ALM1 · Cebada" }));
    expect(ObjProducto).toHaveValue("ALM1 · Cebada");
    await ObjUsuario.selectOptions(screen.getByRole("combobox", { name: "Almacén" }), "7");
    await ObjUsuario.type(screen.getByRole("textbox", { name: /Cantidad/ }), "12.5");
    expect(screen.getByRole("textbox", { name: "Precio total del ingreso (Q)" })).toBeRequired();
    await ObjUsuario.type(screen.getByRole("textbox", { name: "Precio total del ingreso (Q)" }), "2.50");
    await ObjUsuario.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(Inventario_guardar).toHaveBeenCalledWith({ productoId: 41, inventarioId: 7, subtipo: "INVENTARIO_INICIAL", cantidadComercial: "12.5", unidadComercial: "lb", precioTotalIngreso: "2.50", fechaFabricacion: null, fechaVencimiento: null, documentoReferencia: null, motivo: null, observaciones: null }));
    Inventario_guardar.mockClear();
    await ObjUsuario.click(screen.getByRole("button", { name: "Limpiar Producto" }));
    expect(ObjProducto).toHaveValue("");
    await ObjUsuario.click(screen.getByRole("button", { name: "Continuar" }));
    expect(Inventario_guardar).not.toHaveBeenCalled();
  });

  it("exige precio total y crea siempre el lote automáticamente", async () => {
    const ObjUsuario = userEvent.setup(); const Inventario_guardar = Inventario_renderizar();
    const ObjProducto = screen.getByRole("combobox", { name: "Producto" });
    await ObjUsuario.type(ObjProducto, "Cebada"); await ObjUsuario.click(await screen.findByRole("option", { name: "ALM1 · Cebada" }));
    await ObjUsuario.selectOptions(screen.getByRole("combobox", { name: "Almacén" }), "7"); await ObjUsuario.type(screen.getByRole("textbox", { name: /Cantidad/ }), "100");
    await ObjUsuario.click(screen.getByRole("button", { name: "Continuar" }));
    expect(Inventario_guardar).not.toHaveBeenCalled();
    await ObjUsuario.click(screen.getByRole("button", { name: "Limpiar Producto" })); await ObjUsuario.type(ObjProducto, "MED1"); await ObjUsuario.click(await screen.findByRole("option", { name: "MED1 · Albicid" }));
    expect(screen.getByRole("textbox", { name: "Precio total del ingreso (Q)" })).toBeRequired(); expect(screen.queryByText("Registrar lote nuevo")).toBeNull(); expect(screen.queryByLabelText("Código de lote")).toBeNull();
  });

  it("saldo inicial permite proveedor opcional y envía proveedorId cuando se selecciona", async () => {
    const ObjUsuario = userEvent.setup(); const Inventario_guardar = Inventario_renderizar();
    const ObjProducto = screen.getByRole("combobox", { name: "Producto" }); await ObjUsuario.type(ObjProducto, "Cebada"); await ObjUsuario.click(await screen.findByRole("option", { name: "ALM1 · Cebada" }));
    const ObjProveedorCampo = screen.getByRole("combobox", { name: "Proveedor (opcional)" }); await ObjUsuario.type(ObjProveedorCampo, "PRO000001"); await ObjUsuario.click(await screen.findByRole("option", { name: "PRO000001 · Distribuidora Norte" }));
    await ObjUsuario.selectOptions(screen.getByRole("combobox", { name: "Almacén" }), "7"); await ObjUsuario.type(screen.getByRole("textbox", { name: /Cantidad/ }), "5"); await ObjUsuario.type(screen.getByRole("textbox", { name: "Precio total del ingreso (Q)" }), "4.10"); await ObjUsuario.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(Inventario_guardar).toHaveBeenCalledWith(expect.objectContaining({ productoId: 41, proveedorId: 81, subtipo: "INVENTARIO_INICIAL", unidadComercial: "lb", precioTotalIngreso: "4.10" })));
  });

  it("COMPRA busca y selecciona un proveedor permitido conservando proveedorId", async () => {
    const ObjUsuario = userEvent.setup(); const Inventario_guardar = Inventario_renderizar("COMPRA");
    await ObjUsuario.selectOptions(screen.getByRole("combobox", { name: "Producto" }), "41");
    const ObjProveedorCampo = screen.getByRole("combobox", { name: "Proveedor" });
    expect(ObjProveedorCampo).toHaveAttribute("placeholder", "Buscar proveedor por código o nombre...");
    expect(screen.queryByRole("option", { name: "PRO000001 · Distribuidora Norte" })).toBeNull();
    await ObjUsuario.type(ObjProveedorCampo, "PRO000001");
    expect(await screen.findByRole("option", { name: "PRO000001 · Distribuidora Norte" })).toBeVisible();
    await ObjUsuario.clear(ObjProveedorCampo); await ObjUsuario.type(ObjProveedorCampo, "distribuidora");
    await ObjUsuario.click(await screen.findByRole("option", { name: "PRO000001 · Distribuidora Norte" }));
    expect(ObjProveedorCampo).toHaveValue("PRO000001 · Distribuidora Norte"); expect(screen.queryByText("81")).toBeNull();
    await ObjUsuario.selectOptions(screen.getByRole("combobox", { name: "Almacén" }), "7"); await ObjUsuario.type(screen.getByRole("textbox", { name: /Cantidad/ }), "10"); await ObjUsuario.type(screen.getByRole("textbox", { name: "Precio total del ingreso (Q)" }), "3.25");
    await ObjUsuario.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(Inventario_guardar).toHaveBeenCalledWith({ productoId: 41, proveedorId: 81, inventarioId: 7, subtipo: "COMPRA", cantidadComercial: "10", unidadComercial: "lb", precioTotalIngreso: "3.25", fechaFabricacion: null, fechaVencimiento: null, documentoReferencia: null, motivo: null, observaciones: null }));
    Inventario_guardar.mockClear(); await ObjUsuario.click(screen.getByRole("button", { name: "Limpiar Proveedor" })); expect(ObjProveedorCampo).toHaveValue("");
    await ObjUsuario.click(screen.getByRole("button", { name: "Continuar" })); expect(Inventario_guardar).not.toHaveBeenCalled(); expect(screen.getByRole("alert")).toHaveTextContent("La compra requiere proveedor");
  });
});
