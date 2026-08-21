import { describe, expect, it } from "vitest";
import { Inventario_decimalEscalado, Inventario_decimalValido, Inventario_estadoLote, Inventario_formatearDecimal, Inventario_formatearFechaCivil } from "./inventario";

describe("helpers de Inventario", () => {
  it("mantiene decimales exactos mediante BigInt escalado", () => { expect(Inventario_decimalEscalado("25.5000")).toBe(255000n); expect(Inventario_decimalEscalado("-0.0001")).toBe(-1n); expect(Inventario_formatearDecimal("10.0000")).toBe("10"); expect(Inventario_decimalValido("1.23456")).toBe(false); });
  it("conserva DATE civil y representa vencimiento nullable", () => { expect(Inventario_formatearFechaCivil(null)).toBe("Sin vencimiento"); expect(Inventario_formatearFechaCivil("2026-08-21")).toBe("21/08/2026"); });
  it("aplica precedencia inactivo, vencido, agotado y activo", () => { const ObjBase = { loteInventarioId: 1, codigoLote: "L1", fechaFabricacion: null, costoUnitario: null, activo: true }; expect(Inventario_estadoLote({ ...ObjBase, fechaVencimiento: null })).toBe("ACTIVO"); expect(Inventario_estadoLote({ ...ObjBase, fechaVencimiento: "2000-01-01" })).toBe("VENCIDO"); expect(Inventario_estadoLote({ ...ObjBase, activo: false, fechaVencimiento: "2000-01-01" })).toBe("INACTIVO"); });
});
