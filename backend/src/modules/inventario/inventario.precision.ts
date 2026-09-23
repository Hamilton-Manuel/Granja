import { Prisma } from "../../../generated/prisma/client.js";

// 100 cifras cubren productos de cantidades DECIMAL(24,6) y factores DECIMAL(30,15).
const DecimalInventarioExacto = Prisma.Decimal.clone({ precision: 100, rounding: Prisma.Decimal.ROUND_HALF_UP });

/** No cuantiza el factor ni la cantidad. El consumidor decide la frontera de persistencia. */
export function Inventario_convertirCantidadSinCuantizar(
  DecCantidad: Prisma.Decimal, DecFactorOrigen: Prisma.Decimal, DecFactorDestino: Prisma.Decimal,
) {
  if ([DecCantidad, DecFactorOrigen, DecFactorDestino].some(DecValor => !DecValor.isFinite() || !DecValor.gt(0))) {
    throw new RangeError("CONVERSION_VALORES_INVALIDOS");
  }
  return new DecimalInventarioExacto(DecCantidad.toString()).mul(DecFactorOrigen.toString()).div(DecFactorDestino.toString());
}
