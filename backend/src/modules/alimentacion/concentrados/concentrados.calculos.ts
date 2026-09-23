import { Prisma } from "../../../../generated/prisma/client.js";
import type { AlimentacionCostoFuente, AlimentacionValoracionElaboracion } from "./concentrados.types.js";

const DecimalAlimentacion = Prisma.Decimal.clone({ precision: 100, rounding: Prisma.Decimal.ROUND_HALF_UP });

function Alimentacion_exigirDecimal(DecValor: Prisma.Decimal, IntEnteros: number, IntEscala: number, BoolPositivo: boolean): void {
  if (!DecValor.isFinite() || DecValor.isNegative() || (BoolPositivo && DecValor.isZero()) ||
    DecValor.decimalPlaces() > IntEscala || DecValor.gte(new DecimalAlimentacion(10).pow(IntEnteros))) {
    throw new RangeError("ELABORACION_DECIMAL_FUERA_DE_RANGO");
  }
}

/** Pura: recibe únicamente cantidades operativas y costos históricos leídos del movimiento. */
export function Alimentacion_calcularValoracionElaboracion(
  ArrFuentes: AlimentacionCostoFuente[], DecCantidadReal: Prisma.Decimal,
): AlimentacionValoracionElaboracion {
  Alimentacion_exigirDecimal(DecCantidadReal, 18, 6, true);
  if (ArrFuentes.length === 0 || new Set(ArrFuentes.map(ObjFuente => ObjFuente.IntTransaccionId)).size !== ArrFuentes.length) {
    throw new RangeError("ELABORACION_FUENTES_INVALIDAS");
  }
  let DecTotal = new DecimalAlimentacion(0);
  const ArrImportesFuentes = ArrFuentes.map(ObjFuente => {
    Alimentacion_exigirDecimal(ObjFuente.DecCantidadDescontada, 18, 6, true);
    Alimentacion_exigirDecimal(ObjFuente.DecCostoUnitarioHistorico, 20, 18, false);
    const DecImporte = new DecimalAlimentacion(ObjFuente.DecCantidadDescontada.toString()).mul(ObjFuente.DecCostoUnitarioHistorico.toString());
    Alimentacion_exigirDecimal(DecImporte, 14, 24, false);
    DecTotal = DecTotal.add(DecImporte);
    return DecImporte.toFixed(24);
  });
  Alimentacion_exigirDecimal(DecTotal, 14, 24, false);
  const DecUnitario = DecTotal.div(DecCantidadReal.toString()).toDecimalPlaces(18);
  Alimentacion_exigirDecimal(DecUnitario, 20, 18, false);
  const DecResidual = DecTotal.sub(DecUnitario.mul(DecCantidadReal.toString()));
  Alimentacion_exigirDecimal(DecResidual.abs(), 14, 24, false);
  return { StrCostoTotal: DecTotal.toFixed(24), StrCostoUnitario: DecUnitario.toFixed(18),
    StrResidualValoracion: DecResidual.toFixed(24), ArrImportesFuentes };
}
