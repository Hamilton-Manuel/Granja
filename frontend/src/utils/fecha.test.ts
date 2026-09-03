import { describe, expect, it } from "vitest";

import { Fecha_formatearMesCivil, Fecha_formatearTimestampGuatemala, Fecha_validarFechaCivil } from "./fecha";

describe("política temporal del frontend", () => {
  it("presenta en Guatemala un timestamp que ya incluye -06:00", () => {
    const StrResultado = Fecha_formatearTimestampGuatemala("2026-08-19T22:59:46.251-06:00");
    expect(StrResultado).toContain("22:59");
    expect(StrResultado).toContain("19");
  });

  it("conserva DATE como cadena civil sin convertirla a Date", () => {
    expect(Fecha_validarFechaCivil("2026-08-19")).toBe("2026-08-19");
    expect(() => Fecha_validarFechaCivil("19/08/2026")).toThrow(RangeError);
  });

  it("formatea meses civiles sin desplazarlos por la zona horaria", () => {
    expect(Fecha_formatearMesCivil("2026-04")).toBe("abr 2026");
    expect(Fecha_formatearMesCivil("2027-01")).toBe("ene 2027");
  });
});
