import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaginaLotesInventario } from "./PaginaLotesInventario";
import { PaginaMovimientosInventario } from "./PaginaMovimientosInventario";

const ObjLista = vi.hoisted(() => ({ ArrDatos: [] as unknown[], IntTotal: 0 }));
vi.mock("../../hooks/useInventarioLista", () => ({
  Inventario_mensajeError: () => "Error",
  useInventarioLista: () => ({ ...ObjLista, IntPagina: 1, IntLimite: 20, BoolCargando: false, BoolActualizando: false, StrError: null, establecerPagina: vi.fn(), Inventario_aplicarFiltros: vi.fn(), Inventario_recargar: vi.fn() }),
}));
vi.mock("../../hooks/useInventarioCatalogos", () => ({ useInventarioCatalogos: () => ({ ArrCategorias: [], ArrAlmacenes: [], ArrProductos: [], ArrProveedores: [], ArrLotes: [], StrError: null, BoolCargando: false, Inventario_cargarCatalogos: vi.fn() }) }));
vi.mock("../../hooks/useSesion", () => ({ useSesion: () => ({ Autenticacion_tienePermiso: () => false }) }));

const ObjProducto = { productoId: 1, codigo: "ALI-1", nombre: "Alimento", unidadMedida: "kg", manejaLotes: true, activo: true };
const ObjAlmacen = { inventarioId: 1, codigo: "A1", nombre: "Principal", descripcion: null, ubicacion: null, activo: true };

describe("páginas de Inventario con Decimal SQL y datos históricos", () => {
  beforeEach(() => { ObjLista.ArrDatos = []; ObjLista.IntTotal = 0; });
  it("Lotes renderiza escalas 18/6 y representa costo opcional nulo", () => {
    ObjLista.ArrDatos = [
      { loteInventarioId: 1, productoId: 1, proveedorId: null, codigoLote: "LOT-1", fechaFabricacion: null, fechaVencimiento: null, costoUnitario: "0.090718473993777244", activo: true, observaciones: null, producto: ObjProducto, proveedor: null, existencias: [{ existenciaLoteId: 1, existenciaActual: "2204.622622", existencia: { inventarioId: 1, almacen: ObjAlmacen } }] },
      { loteInventarioId: 2, productoId: 1, proveedorId: null, codigoLote: "LEGACY", fechaFabricacion: null, fechaVencimiento: null, costoUnitario: null, activo: true, observaciones: null, producto: ObjProducto, proveedor: null, existencias: [] },
    ]; ObjLista.IntTotal = 2;
    render(<MemoryRouter><PaginaLotesInventario /></MemoryRouter>);
    expect(screen.getAllByText("0.090718473993777244").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2204\.622622/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
  it("Movimientos conserva modernos, legacy, nulos, reversos y transferencias", () => {
    const Base = { inventarioProductoId: 1, usuarioId: 1, proveedorId: null, documentoReferencia: null, motivo: null, observaciones: null, fechaTransaccion: "2026-08-20 10:00:00.000", producto: ObjProducto, almacen: ObjAlmacen, proveedor: null, usuario: { usuarioId: 1, nombreCompleto: "Responsable" }, reversion: null };
    ObjLista.ArrDatos = [
      { ...Base, transaccionInventarioId: 1, existenciaLoteId: null, transferenciaId: null, transaccionRevertidaId: null, tipoTransaccion: "INGRESO", subtipoTransaccion: "INVENTARIO_INICIAL", cantidad: "100.000000", costoUnitario: "5.000000000000000000", lote: null, revertida: true },
      { ...Base, transaccionInventarioId: 2, existenciaLoteId: null, transferenciaId: null, transaccionRevertidaId: 1, tipoTransaccion: "AJUSTE", subtipoTransaccion: "REVERSION", cantidad: "-100.000000", costoUnitario: null, lote: null, revertida: false },
      { ...Base, transaccionInventarioId: 3, existenciaLoteId: 1, transferenciaId: 1, transaccionRevertidaId: null, tipoTransaccion: "SALIDA", subtipoTransaccion: "TRANSFERENCIA_SALIDA", cantidad: "-5.250000", costoUnitario: "0.090718473993777244", lote: { loteInventarioId: 1, codigoLote: "LOT-1", fechaFabricacion: null, fechaVencimiento: null, costoUnitario: "0.090718473993777244", activo: true }, revertida: false },
    ]; ObjLista.IntTotal = 3;
    render(<MemoryRouter><PaginaMovimientosInventario /></MemoryRouter>);
    expect(screen.getAllByText(/100 kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("Revertido")).toBeInTheDocument();
    expect(screen.getByText("Ver transferencia")).toBeInTheDocument();
  });
});
