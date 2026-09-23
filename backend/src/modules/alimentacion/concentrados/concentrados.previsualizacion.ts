import { createHash } from "node:crypto";
import { Prisma } from "../../../../generated/prisma/client.js";
import { ErrorAplicacion } from "../../../errors/error-aplicacion.js";
import { Inventario_convertirCantidadSinCuantizar } from "../../inventario/inventario.precision.js";
import { Alimentacion_calcularValoracionElaboracion } from "./concentrados.calculos.js";
import type { AlimentacionElaboracionPrevisualizacionEntrada } from "./concentrados.types.js";

// Hasta 108 cifras en los productos de cantidades y factores antes de la división.
const DecimalExacto = Prisma.Decimal.clone({ precision: 200, rounding: Prisma.Decimal.ROUND_HALF_UP });
export type AlimentacionFuentePrevia = {
  existenciaLoteId: number; inventarioId: number; inventarioProductoId: number; loteInventarioId: number;
  codigoLote: string; unidadBase: string; fechaVencimiento: string | null; transaccionOrigenId: number | null;
  existenciaActual: string; saldoAlmacen: string; costoUnitario: string;
};
export type AlimentacionIngredientePrevio = {
  productoId: number; codigo: string; nombre: string; unidadBase: string;
  cantidadReceta: string; unidadReceta: string; factorReceta: string; factorBase: string;
  fuentes: AlimentacionFuentePrevia[];
};
export type AlimentacionContextoPrevio = {
  receta: { recetaId: number; version: number; nombre: string; cantidadBase: string; unidadBase: string; factor: string };
  producto: { productoId: number; codigo: string; nombre: string; unidadBase: string; factor: string };
  destino: { inventarioId: number; codigo: string; nombre: string };
  factorCaptura: string; ingredientes: AlimentacionIngredientePrevio[];
};

function Alimentacion_cuantizar(DecCantidad: Prisma.Decimal) {
  const DecResultado = DecCantidad.toDecimalPlaces(6);
  if (!DecResultado.isFinite() || !DecResultado.gt(0) || DecResultado.gte("1000000000000000000")) {
    throw new ErrorAplicacion(422, "ELABORACION_CANTIDAD_FUERA_DE_RANGO", "Una cantidad operativa queda en cero o excede Decimal(24,6).");
  }
  return DecResultado;
}

/** Pura. Las fuentes llegan filtradas y ordenadas por Inventario, con valores SQL exactos. */
export function Alimentacion_calcularPrevisualizacion(ObjEntrada: AlimentacionElaboracionPrevisualizacionEntrada, ObjContexto: AlimentacionContextoPrevio) {
  const ObjReceta = ObjContexto.receta;
  const DecTeoricaMasa = new DecimalExacto(ObjEntrada.cantidadTeorica).mul(ObjContexto.factorCaptura);
  const DecRealMasa = new DecimalExacto(ObjEntrada.cantidadReal).mul(ObjContexto.factorCaptura);
  const DecBaseMasa = new DecimalExacto(ObjReceta.cantidadBase).mul(ObjReceta.factor);
  const DecTeoricaBase = Alimentacion_cuantizar(Inventario_convertirCantidadSinCuantizar(new Prisma.Decimal(ObjEntrada.cantidadTeorica), new Prisma.Decimal(ObjContexto.factorCaptura), new Prisma.Decimal(ObjContexto.producto.factor)));
  const DecRealBase = Alimentacion_cuantizar(Inventario_convertirCantidadSinCuantizar(new Prisma.Decimal(ObjEntrada.cantidadReal), new Prisma.Decimal(ObjContexto.factorCaptura), new Prisma.Decimal(ObjContexto.producto.factor)));
  let DecMasaIngredientes = new DecimalExacto(0), DecMasaDisponible = new DecimalExacto(0), DecCostoDisponible = new DecimalExacto(0);
  const ArrIngredientes = ObjContexto.ingredientes.map(ObjIngrediente => {
    // Todos los productos se calculan antes de dividir; solo se cuantiza el resultado operativo.
    const DecExacta = new DecimalExacto(ObjIngrediente.cantidadReceta).mul(ObjIngrediente.factorReceta)
      .mul(DecTeoricaMasa).div(DecBaseMasa.mul(ObjIngrediente.factorBase));
    const DecRequerida = Alimentacion_cuantizar(DecExacta);
    DecMasaIngredientes = DecMasaIngredientes.add(DecRequerida.mul(ObjIngrediente.factorBase));
    let DecPendiente = new DecimalExacto(DecRequerida), DecDisponible = new DecimalExacto(0);
    const ObjSaldos = new Map<number, Prisma.Decimal>();
    const ArrFuentes = [];
    for (const ObjFuente of ObjIngrediente.fuentes) {
      if (ObjFuente.unidadBase !== ObjIngrediente.unidadBase || !new DecimalExacto(ObjFuente.costoUnitario).gte(0)) {
        throw new ErrorAplicacion(409, "ELABORACION_FUENTE_INCONSISTENTE", "El costo o la unidad histórica del lote no corresponde al producto.");
      }
      const DecSaldo = ObjSaldos.get(ObjFuente.inventarioProductoId) ?? new DecimalExacto(ObjFuente.saldoAlmacen);
      const DecUtilizable = DecimalExacto.min(ObjFuente.existenciaActual, DecSaldo);
      ObjSaldos.set(ObjFuente.inventarioProductoId, DecSaldo.sub(DecUtilizable));
      DecDisponible = DecDisponible.add(DecUtilizable);
      const DecCantidad = DecimalExacto.min(DecPendiente, DecUtilizable);
      if (!DecCantidad.gt(0)) continue;
      const DecImporte = DecCantidad.mul(ObjFuente.costoUnitario);
      DecCostoDisponible = DecCostoDisponible.add(DecImporte);
      DecMasaDisponible = DecMasaDisponible.add(DecCantidad.mul(ObjIngrediente.factorBase));
      DecPendiente = DecPendiente.sub(DecCantidad);
      ArrFuentes.push({ ...ObjFuente, cantidad: DecCantidad.toFixed(6), importe: DecImporte.toFixed(24) });
    }
    return { productoId: ObjIngrediente.productoId, codigo: ObjIngrediente.codigo, nombre: ObjIngrediente.nombre,
      unidadBase: ObjIngrediente.unidadBase, cantidadReceta: ObjIngrediente.cantidadReceta, unidadReceta: ObjIngrediente.unidadReceta,
      cantidadSinCuantizar: DecExacta.toString(), cantidadRequerida: DecRequerida.toFixed(6),
      diferenciaCuantizacion: DecRequerida.sub(DecExacta).toString(), cantidadDisponible: DecDisponible.toFixed(6),
      cantidadFaltante: DecPendiente.toFixed(6), fuentes: ArrFuentes };
  });
  const ArrFaltantes = ArrIngredientes.filter(Obj => new DecimalExacto(Obj.cantidadFaltante).gt(0))
    .map(Obj => ({ productoId: Obj.productoId, nombre: Obj.nombre, unidadBase: Obj.unidadBase, cantidadFaltante: Obj.cantidadFaltante }));
  const ArrFuentes = ArrIngredientes.flatMap(Obj => Obj.fuentes);
  let ObjCosto = null;
  if (!ArrFaltantes.length) {
    try {
      // El calculador compartido exige identificadores únicos; aquí identifican fuentes, aún no movimientos.
      ObjCosto = Alimentacion_calcularValoracionElaboracion(ArrFuentes.map(Obj => ({ IntTransaccionId: Obj.existenciaLoteId,
        DecCantidadDescontada: new Prisma.Decimal(Obj.cantidad), DecCostoUnitarioHistorico: new Prisma.Decimal(Obj.costoUnitario) })), DecRealBase);
    } catch (ObjError) {
      if (!(ObjError instanceof RangeError)) throw ObjError;
      throw new ErrorAplicacion(422, "ELABORACION_COSTO_FUERA_DE_RANGO", "El costo estimado excede la precisión admitida para elaborar.");
    }
  }
  const ObjResultado = {
    versionPrevisualizacion: 1, disponible: ArrFaltantes.length === 0, reservaExistencias: false,
    receta: ObjReceta, productoTerminado: ObjContexto.producto, destino: ObjContexto.destino,
    fechaEfectiva: ObjEntrada.fechaEfectiva, cantidadTeorica: ObjEntrada.cantidadTeorica, cantidadReal: ObjEntrada.cantidadReal,
    unidadCaptura: ObjEntrada.unidadCaptura, cantidadTeoricaBase: DecTeoricaBase.toFixed(6), cantidadRealBase: DecRealBase.toFixed(6),
    rendimiento: { diferencia: new DecimalExacto(ObjEntrada.cantidadReal).sub(ObjEntrada.cantidadTeorica).toString(),
      porcentaje: new DecimalExacto(ObjEntrada.cantidadReal).div(ObjEntrada.cantidadTeorica).mul(100).toString(), motivo: ObjEntrada.motivoDiferencia ?? null },
    balanceMasa: { unidad: "g", ingredientesRequeridos: DecMasaIngredientes.toString(), ingredientesDisponiblesAsignados: DecMasaDisponible.toString(),
      salidaTeorica: DecTeoricaMasa.toString(), salidaReal: DecRealMasa.toString(),
      diferenciaEntradaSalida: DecMasaIngredientes.sub(DecRealMasa).toString(),
      residualCuantizacionSalida: DecRealBase.mul(ObjContexto.producto.factor).sub(DecRealMasa).toString() },
    ingredientes: ArrIngredientes, faltantes: ArrFaltantes,
    costoDisponible: DecCostoDisponible.toFixed(24),
    costoEstimado: ObjCosto ? { total: ObjCosto.StrCostoTotal, unitario: ObjCosto.StrCostoUnitario,
      unidad: ObjContexto.producto.unidadBase, residualValoracion: ObjCosto.StrResidualValoracion } : null,
  };
  // Contrato versionado y orden estable: confirmar deberá releer/recalcular TODO dentro de su propia Tx.
  // No es una autorización ni una reserva; también incluye fuentes elegibles que no se agotaron.
  const StrHuella = createHash("sha256").update(JSON.stringify({ version: 1, entrada: ObjEntrada, contexto: ObjContexto, resultado: ObjResultado })).digest("hex");
  return { ...ObjResultado, huellaPrevisualizacion: StrHuella };
}
