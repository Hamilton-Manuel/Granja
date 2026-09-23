import { Prisma } from "../../../../generated/prisma/client.js";
import type { AlimentacionOperacionPosterior } from "./concentrados.reversion.repository.js";

/** No basta con saldo neto cero: debe existir la reversión vinculada de cada operación. */
export function Alimentacion_operacionResuelta(Obj: AlimentacionOperacionPosterior): boolean {
  if (Obj.reversionId === null || Obj.cantidadReversion === null || Obj.costo === null || Obj.costoReversion === null) return false;
  if (!new Prisma.Decimal(Obj.cantidad).negated().eq(Obj.cantidadReversion) || !new Prisma.Decimal(Obj.costo).eq(Obj.costoReversion)) return false;
  if (Obj.alimentacionId !== null && Obj.estadoAlimentacion !== "REVERTIDA") return false;
  if (Obj.elaboracionId !== null && Obj.estadoElaboracion !== "REVERTIDA") return false;
  return true;
}
export function Alimentacion_loteCompletoEnOrigen(ArrUbicaciones: Array<{ existenciaLoteId: number; cantidad: string; saldoAlmacen: string }>, IntOrigen: number, StrCantidad: string) {
  const ObjOrigen = ArrUbicaciones.find(Obj => Obj.existenciaLoteId === IntOrigen);
  return !!ObjOrigen && new Prisma.Decimal(ObjOrigen.cantidad).eq(StrCantidad) && new Prisma.Decimal(ObjOrigen.saldoAlmacen).gte(StrCantidad)
    && ArrUbicaciones.every(Obj => Obj.existenciaLoteId === IntOrigen || new Prisma.Decimal(Obj.cantidad).isZero());
}
