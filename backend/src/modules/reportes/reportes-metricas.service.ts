import { Prisma } from "../../../generated/prisma/client.js";
import { Fecha_convertirInstanteAAlmacenamientoGuatemala, Fecha_formatearFechaCivil, Fecha_obtenerInstanteActual, Fecha_obtenerRangoMesActualGuatemala } from "../../datetime/fecha.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import * as ObjRepositorio from "./reportes-metricas.repository.js";

export function Reportes_obtenerPeriodoDashboard(DtInstante?: Date) {
  const DtReferencia = DtInstante ?? Fecha_obtenerInstanteActual();
  const { DtInicio, DtFinExclusivo, DtFinInclusivo } = Fecha_obtenerRangoMesActualGuatemala(DtReferencia);
  const DtHoy = Fecha_convertirInstanteAAlmacenamientoGuatemala(DtReferencia);
  const DtInicioTendencia = new Date(Date.UTC(DtInicio.getUTCFullYear(), DtInicio.getUTCMonth() - 5, 1));
  const DtLimiteVencimiento = new Date(Date.UTC(DtHoy.getUTCFullYear(), DtHoy.getUTCMonth(), DtHoy.getUTCDate() + 30));
  return { DtInicio, DtFinExclusivo, DtFinInclusivo, DtHoy: new Date(Date.UTC(DtHoy.getUTCFullYear(), DtHoy.getUTCMonth(), DtHoy.getUTCDate())), DtInicioTendencia, DtLimiteVencimiento };
}

export const Reportes_obtenerMetricasProduccion = ObjRepositorio.Reportes_metricasProduccion;
export async function Reportes_obtenerMetricasInventario() { const P = Reportes_obtenerPeriodoDashboard(); const Obj = await ObjRepositorio.Reportes_metricasInventario(P.DtHoy, P.DtLimiteVencimiento); return { ...Obj, proximosVencimientos: Obj.proximosVencimientos.map((Lote) => ({ ...Lote, fechaVencimiento: Lote.fechaVencimiento ? Fecha_formatearFechaCivil(Lote.fechaVencimiento) : null, saldo: Lote.saldo.toString() })) }; }
export async function Reportes_obtenerMetricasVentas() {
  const P = Reportes_obtenerPeriodoDashboard(); const Obj = await ObjRepositorio.Reportes_metricasVentas(P.DtInicio, P.DtFinExclusivo, P.DtInicioTendencia);
  const ObjPorMes = new Map(Obj.tendencia.map((Fila) => [`${Fila.anio}-${String(Fila.mes).padStart(2, "0")}`, Fila]));
  const tendencia = Reportes_crearMesesTendencia(P.DtInicio).map((mes) => { const Fila = ObjPorMes.get(mes); return { mes, cantidad: Fila?.cantidad ?? 0, ingreso: new Prisma.Decimal(Fila?.ingreso ?? 0).toFixed(2) }; });
  return { ventasConfirmadas: Obj.ventasConfirmadas, animalesVendidos: Obj.animalesVendidos, ingresoMes: new Prisma.Decimal(Obj.ingresoMes).toFixed(2), tendencia };
}
export function Reportes_obtenerMetricasSanidad() { const P = Reportes_obtenerPeriodoDashboard(); return ObjRepositorio.Reportes_metricasSanidad(P.DtInicio, P.DtFinExclusivo); }
export function Reportes_crearMesesTendencia(DtInicioMes: Date) { return Array.from({ length: 6 }, (_, IntIndice) => { const DtMes = new Date(Date.UTC(DtInicioMes.getUTCFullYear(), DtInicioMes.getUTCMonth() - 5 + IntIndice, 1)); return `${DtMes.getUTCFullYear()}-${String(DtMes.getUTCMonth() + 1).padStart(2, "0")}`; }); }
export function Reportes_resolverCostoHistorico(ObjCosto: { total: string; inconsistencias: number }) { if (ObjCosto.inconsistencias > 0) throw new ErrorAplicacion(409, "COSTO_HISTORICO_INCONSISTENTE", "No existe una transacción histórica confiable para una fuente física."); return new Prisma.Decimal(ObjCosto.total).toFixed(2); }
export async function Reportes_obtenerMetricasCostos() { const P = Reportes_obtenerPeriodoDashboard(); const Obj = await ObjRepositorio.Reportes_metricasCostos(P.DtInicio, P.DtFinExclusivo); return { costoAlimentacion: Reportes_resolverCostoHistorico(Obj.alimentacion), costoSanidad: Reportes_resolverCostoHistorico(Obj.sanidad) }; }
export function Reportes_periodoPublico() { const P = Reportes_obtenerPeriodoDashboard(); return { fechaDesde: Fecha_formatearFechaCivil(P.DtInicio), fechaHasta: Fecha_formatearFechaCivil(P.DtFinInclusivo), zonaHoraria: "America/Guatemala" as const }; }
