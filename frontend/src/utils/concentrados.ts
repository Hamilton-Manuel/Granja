import { Inventario_decimalEscalado } from "./inventario";
import type { CatalogosConcentrados, IngredienteReceta } from "../types/concentrados.types";

/** Suma exacta en la referencia del catálogo. Cuantiza solo el total a Decimal(24,6). */
export function Alimentacion_totalReceta(ArrIngredientes: IngredienteReceta[], StrUnidad: string, ArrUnidades: CatalogosConcentrados["unidades"]): string | null {
  const ObjFactores = new Map(ArrUnidades.map(Obj => [Obj.codigo, Obj.factorReferencia]));
  const StrDestino = ObjFactores.get(StrUnidad);
  if (!StrDestino || !ArrIngredientes.length) return null;
  try {
    const IntDestino = Inventario_decimalEscalado(StrDestino);
    if (IntDestino <= 0n) return null;
    let IntMasa = 0n;
    for (const Obj of ArrIngredientes) {
      const StrFactor = ObjFactores.get(Obj.unidadMedida);
      if (!Obj.productoId || !/^(?!0+(?:\.0+)?$)\d{1,18}(?:\.\d{1,6})?$/.test(Obj.cantidad) || !StrFactor) return null;
      const IntFactor = Inventario_decimalEscalado(StrFactor);
      if (IntFactor <= 0n) return null;
      IntMasa += Inventario_decimalEscalado(Obj.cantidad) * IntFactor;
    }
    // Ambas entradas se escalan a 18 decimales con el helper existente. El cociente
    // queda en millonésimas; ROUND_HALF_UP sin divisiones ni redondeos por ingrediente.
    const IntDivisor = IntDestino * 10n ** 12n;
    const IntTotal = (IntMasa * 2n + IntDivisor) / (IntDivisor * 2n);
    if (IntTotal <= 0n || IntTotal >= 10n ** 24n) return null;
    return `${IntTotal / 1000000n}.${(IntTotal % 1000000n).toString().padStart(6, "0")}`;
  } catch { return null; }
}
