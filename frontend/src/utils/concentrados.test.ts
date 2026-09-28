import { expect, it } from "vitest";
import { Alimentacion_totalReceta, Alimentacion_composicionReceta } from "./concentrados";
const ArrUnidades = [
  { codigo: "lb", dimension: "PESO", factorReferencia: "453.592370000000000" },
  { codigo: "kg", dimension: "PESO", factorReferencia: "1000.000000000000000" },
  { codigo: "g", dimension: "PESO", factorReferencia: "1.000000000000000" },
  { codigo: "qq", dimension: "PESO", factorReferencia: "45359.237000000000000" },
  { codigo: "t", dimension: "PESO", factorReferencia: "1000000.000000000000000" },
];
const Alimentacion_ingrediente = (cantidad: string, unidadMedida = "lb") => ({ productoId: 1, cantidad, unidadMedida });
it("no suma peso y volumen; presenta composición por dimensión con conversión exacta", () => {
  const ArrCatalogo = [...ArrUnidades, { codigo: "caneca", dimension: "VOLUMEN", factorReferencia: "18927.05892" }, { codigo: "gal", dimension: "VOLUMEN", factorReferencia: "3785.411784" }];
  const ArrIngredientes = [Alimentacion_ingrediente("5", "qq"), Alimentacion_ingrediente("1", "caneca")];
  expect(Alimentacion_totalReceta(ArrIngredientes, "lb", ArrCatalogo)).toBeNull();
  expect(Alimentacion_composicionReceta(ArrIngredientes, "lb", ArrCatalogo)).toEqual([{ StrDimension: "PESO", StrUnidad: "lb", StrCantidad: "500.000000" }, { StrDimension: "VOLUMEN", StrUnidad: "caneca", StrCantidad: "1.000000" }]);
  expect(Alimentacion_totalReceta([Alimentacion_ingrediente("1", "caneca"), Alimentacion_ingrediente("5", "gal")], "caneca", ArrCatalogo)).toBe("2.000000");
});
it("total de receta: 100 + 50 + 35 lb son 185 lb", () => {
  expect(Alimentacion_totalReceta(["100", "50", "35"].map(Str => Alimentacion_ingrediente(Str)), "lb", ArrUnidades)).toBe("185.000000");
});
it("convierte mezcla con quintal y tonelada según los factores del catálogo", () => {
  expect(Alimentacion_totalReceta([Alimentacion_ingrediente("1", "qq"), Alimentacion_ingrediente("50")], "lb", ArrUnidades)).toBe("150.000000");
  expect(Alimentacion_totalReceta([Alimentacion_ingrediente("1", "t"), Alimentacion_ingrediente("500", "g"), Alimentacion_ingrediente("1", "lb")], "kg", ArrUnidades)).toBe("1000.953592");
});
it("suma antes de cuantizar, sin redondear cada ingrediente", () => {
  expect(Alimentacion_totalReceta([Alimentacion_ingrediente("0.000001"), Alimentacion_ingrediente("0.000001")], "kg", ArrUnidades)).toBe("0.000001");
});
it("mantiene cantidades superiores al rango exacto de Number", () => {
  expect(Alimentacion_totalReceta([Alimentacion_ingrediente("9007199254740993.000001"), Alimentacion_ingrediente("0.000001")], "lb", ArrUnidades)).toBe("9007199254740993.000002");
});
it("usa el factor recibido y rechaza datos incompletos, inválidos y totales fuera de rango", () => {
  expect(Alimentacion_totalReceta([Alimentacion_ingrediente("1")], "kg", [{ codigo: "lb", dimension: "PESO", factorReferencia: "500" }, ArrUnidades[1]])).toBe("0.500000");
  expect(Alimentacion_totalReceta([], "lb", ArrUnidades)).toBeNull();
  for (const Str of ["", "0", "-1", "1e3", "0.0000001"]) expect(Alimentacion_totalReceta([Alimentacion_ingrediente(Str)], "lb", ArrUnidades)).toBeNull();
  expect(Alimentacion_totalReceta([Alimentacion_ingrediente("1", "L")], "lb", ArrUnidades)).toBeNull();
  expect(Alimentacion_totalReceta([Alimentacion_ingrediente("1")], "lb", [])).toBeNull();
  expect(Alimentacion_totalReceta([Alimentacion_ingrediente("999999999999999999.999999"), Alimentacion_ingrediente("1")], "lb", ArrUnidades)).toBeNull();
});
