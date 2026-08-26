import { describe, expect, it } from "vitest";
import { Ventas_decimalValido, Ventas_formatearMoneda, Ventas_formatearRecibo, Ventas_normalizarBusquedaRecibo, Ventas_sumarMontos } from "./ventas";

describe("helpers de Ventas",()=>{
  it("mantiene sumas monetarias exactas sin Number",()=>{expect(Ventas_sumarMontos(["4500.00","4750.00","4300.00"])).toBe("13550.00");expect(Ventas_sumarMontos(["0.10","0.20"])).toBe("0.30");expect(Ventas_formatearMoneda("13550.00")).toBe("Q13,550.00");});
  it("valida precios positivos y formatea recibo sin alterar sus partes",()=>{expect(Ventas_decimalValido("4500.25")).toBe(true);expect(Ventas_decimalValido("0.00")).toBe(false);expect(Ventas_formatearRecibo("A",1)).toBe("A-000001");expect(Ventas_formatearRecibo("B",152)).toBe("B-000152");expect(Ventas_normalizarBusquedaRecibo("A-000152")).toBe("152");});
});
