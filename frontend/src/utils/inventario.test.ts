import { describe, expect, it } from "vitest";
import { Inventario_decimalEscalado, Inventario_decimalValido, Inventario_estadoLote, Inventario_formatearDecimal, Inventario_formatearFechaCivil } from "./inventario";

describe("helpers de Inventario", () => {
  it("mantiene enteros, cero y decimales positivos y negativos con la escala persistida", () => {
    expect(Inventario_decimalEscalado("25")).toBe(25n * 10n ** 18n);
    expect(Inventario_decimalEscalado("0")).toBe(0n);
    expect(Inventario_decimalEscalado("10.500000")).toBe(105n * 10n ** 17n);
    expect(Inventario_decimalEscalado("-5.2500")).toBe(-525n * 10n ** 16n);
    expect(Inventario_formatearDecimal("0.090718473993777244")).toBe("0.090718473993777244");
    expect(Inventario_formatearDecimal("2204.622622")).toBe("2204.622622");
  });
  it("rechaza valores inválidos y conserva separada la escala de captura", () => {
    expect(() => Inventario_decimalEscalado("1.2.3")).toThrow(RangeError);
    expect(() => Inventario_decimalEscalado("1e3")).toThrow(RangeError);
    expect(() => Inventario_decimalEscalado("1.1234567890123456789")).toThrow(RangeError);
    expect(Inventario_decimalValido("1.23456")).toBe(false);
  });
  it("conserva DATE civil y representa vencimiento nullable", () => { expect(Inventario_formatearFechaCivil(null)).toBe("Sin vencimiento"); expect(Inventario_formatearFechaCivil("2026-08-21")).toBe("21/08/2026"); });
  it("aplica precedencia inactivo, vencido, agotado y activo", () => { const ObjBase = { loteInventarioId: 1, codigoLote: "L1", fechaFabricacion: null, costoUnitario: null, activo: true }; expect(Inventario_estadoLote({ ...ObjBase, fechaVencimiento: null })).toBe("ACTIVO"); expect(Inventario_estadoLote({ ...ObjBase, fechaVencimiento: "2000-01-01" })).toBe("VENCIDO"); expect(Inventario_estadoLote({ ...ObjBase, activo: false, fechaVencimiento: "2000-01-01" })).toBe("INACTIVO"); });
});
