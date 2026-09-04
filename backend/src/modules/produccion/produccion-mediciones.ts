import { Prisma } from "../../../generated/prisma/client.js";

export const PRODUCCION_FACTOR_KG_LB = new Prisma.Decimal("2.2046226218487757");
const PRODUCCION_DIVISOR_SCHAEFFER = new Prisma.Decimal(10838);

export type MetodoObtencionPeso = "BASCULA" | "ESTIMACION_SCHAEFFER";

export function Produccion_calcularPesoSchaeffer(DecPerimetroToracicoCm: Prisma.Decimal, DecLongitudCorporalCm: Prisma.Decimal) {
  return DecPerimetroToracicoCm.times(DecPerimetroToracicoCm).times(DecLongitudCorporalCm).div(PRODUCCION_DIVISOR_SCHAEFFER).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

export function Produccion_convertirKgALb(DecPesoKg: Prisma.Decimal) {
  return DecPesoKg.times(PRODUCCION_FACTOR_KG_LB).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

export function Produccion_agregarPesoLb<T extends { valor: Prisma.Decimal }>(ObjMedicion: T) {
  return { ...ObjMedicion, pesoLb: Produccion_convertirKgALb(ObjMedicion.valor) };
}
