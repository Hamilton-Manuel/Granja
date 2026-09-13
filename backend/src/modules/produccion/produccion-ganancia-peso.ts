import { Prisma } from "../../../generated/prisma/client.js";
import { Fecha_convertirAlmacenamientoGuatemalaAInstante } from "../../datetime/fecha.js";
import { PRODUCCION_FACTOR_KG_LB } from "./produccion-mediciones.js";

const ObjDecimal = Prisma.Decimal.clone({ precision: 50 });
const IntMilisegundosDia = 86_400_000;

export interface MedicionGanancia {
  medicionId: number;
  tipoMedicion: string;
  unidadMedida: string;
  valor: Prisma.Decimal;
  fechaMedicion: Date;
  metodoObtencion: string | null;
}
export interface PermanenciaGanancia {
  asignacionLoteId: number;
  animalId: number;
  fechaInicio: Date;
  fechaFin: Date | null;
}
export interface PeriodoGanancia {
  fechaDesde?: string;
  fechaHasta?: string;
}

function Produccion_pesoAnalisis(ObjMedicion: MedicionGanancia) {
  const DecPeso = new ObjDecimal(ObjMedicion.valor.toString());
  return {
    fechaMedicion: ObjMedicion.fechaMedicion,
    pesoKg: DecPeso.toString(),
    pesoLb: DecPeso.mul(PRODUCCION_FACTOR_KG_LB.toString()).toString(),
  };
}

export function Produccion_calcularGananciaPeso(ArrMediciones: readonly MedicionGanancia[]) {
  const ArrIncidencias: string[] = [];
  const ArrValidas = ArrMediciones.flatMap(ObjMedicion => {
    if (ObjMedicion.tipoMedicion !== "PESO" || ObjMedicion.unidadMedida !== "KG" ||
        !ObjMedicion.valor.isFinite() || !ObjMedicion.valor.gt(0) || Number.isNaN(ObjMedicion.fechaMedicion.getTime())) {
      ArrIncidencias.push(`Medición ${ObjMedicion.medicionId}: datos incompatibles con el análisis de peso.`);
      return [];
    }
    return [{ ObjMedicion, IntInstante: Fecha_convertirAlmacenamientoGuatemalaAInstante(ObjMedicion.fechaMedicion).getTime() }];
  }).sort((ObjA, ObjB) => ObjA.IntInstante - ObjB.IntInstante || ObjA.ObjMedicion.medicionId - ObjB.ObjMedicion.medicionId);
  const ObjPrimera = ArrValidas[0];
  const ArrEvolucion = ArrValidas.map((ObjActual, IntIndice) => {
    const ObjAnterior = ArrValidas[IntIndice - 1];
    const IntIntervalo = ObjAnterior ? ObjActual.IntInstante - ObjAnterior.IntInstante : null;
    const IntAcumulado = ObjActual.IntInstante - ObjPrimera!.IntInstante;
    const DecActual = new ObjDecimal(ObjActual.ObjMedicion.valor.toString());
    const DecCambio = ObjAnterior ? DecActual.sub(ObjAnterior.ObjMedicion.valor.toString()) : null;
    const DecGanancia = IntIndice > 0 ? DecActual.sub(ObjPrimera!.ObjMedicion.valor.toString()) : null;
    const DecGpd = DecCambio && IntIntervalo !== null && IntIntervalo > 0 ? DecCambio.mul(IntMilisegundosDia).div(IntIntervalo) : null;
    const DecGpdAcumulada = DecGanancia && IntAcumulado > 0 ? DecGanancia.mul(IntMilisegundosDia).div(IntAcumulado) : null;
    if (IntIntervalo !== null && IntIntervalo <= 0) ArrIncidencias.push(`Medición ${ObjActual.ObjMedicion.medicionId}: intervalo no positivo; GPD del período no disponible.`);
    return {
      medicionId: ObjActual.ObjMedicion.medicionId,
      metodoObtencion: ObjActual.ObjMedicion.metodoObtencion,
      ...Produccion_pesoAnalisis(ObjActual.ObjMedicion),
      diasDesdeAnterior: IntIntervalo === null ? null : new ObjDecimal(IntIntervalo).div(IntMilisegundosDia).toString(),
      cambioKg: DecCambio?.toString() ?? null,
      cambioLb: DecCambio?.mul(PRODUCCION_FACTOR_KG_LB.toString()).toString() ?? null,
      gpdPeriodoKg: DecGpd?.toString() ?? null,
      gpdPeriodoLb: DecGpd?.mul(PRODUCCION_FACTOR_KG_LB.toString()).toString() ?? null,
      gananciaAcumuladaKg: DecGanancia?.toString() ?? null,
      gananciaAcumuladaLb: DecGanancia?.mul(PRODUCCION_FACTOR_KG_LB.toString()).toString() ?? null,
      gpdAcumuladaKg: DecGpdAcumulada?.toString() ?? null,
      gpdAcumuladaLb: DecGpdAcumulada?.mul(PRODUCCION_FACTOR_KG_LB.toString()).toString() ?? null,
    };
  });
  const ObjUltima = ArrValidas.at(-1);
  const ObjUltimaFila = ArrEvolucion.at(-1);
  const DecGananciaTotal = ObjPrimera && ObjUltima ? new ObjDecimal(ObjUltima.ObjMedicion.valor.toString()).sub(ObjPrimera.ObjMedicion.valor.toString()) : null;
  return {
    resumen: {
      estado: !ObjPrimera ? "SIN_MEDICIONES" as const : !ObjUltimaFila?.gpdAcumuladaKg ? "DATOS_INSUFICIENTES" as const : "CALCULADO" as const,
      cantidadMediciones: ArrValidas.length,
      primera: ObjPrimera ? Produccion_pesoAnalisis(ObjPrimera.ObjMedicion) : null,
      ultima: ObjUltima ? Produccion_pesoAnalisis(ObjUltima.ObjMedicion) : null,
      gananciaTotalKg: DecGananciaTotal?.toString() ?? null,
      gananciaTotalLb: DecGananciaTotal?.mul(PRODUCCION_FACTOR_KG_LB.toString()).toString() ?? null,
      diasTotales: ObjPrimera && ObjUltima ? new ObjDecimal(ObjUltima.IntInstante - ObjPrimera.IntInstante).div(IntMilisegundosDia).toString() : null,
      gpdAcumuladaKg: ObjUltimaFila?.gpdAcumuladaKg ?? null,
      gpdAcumuladaLb: ObjUltimaFila?.gpdAcumuladaLb ?? null,
      ultimaGpdKg: ObjUltimaFila?.gpdPeriodoKg ?? null,
      ultimaGpdLb: ObjUltimaFila?.gpdPeriodoLb ?? null,
    },
    evolucion: ArrEvolucion,
    incidencias: ArrIncidencias,
    medicionesExcluidas: ArrMediciones.length - ArrValidas.length,
  };
}

export function Produccion_medicionesEnPermanencia(ArrMediciones: readonly MedicionGanancia[], ObjAsignacion: PermanenciaGanancia) {
  return ArrMediciones.filter(Obj => Obj.fechaMedicion >= ObjAsignacion.fechaInicio &&
    (ObjAsignacion.fechaFin === null || Obj.fechaMedicion < ObjAsignacion.fechaFin));
}

export function Produccion_detectarPermanenciasInvalidas(ArrAsignaciones: readonly PermanenciaGanancia[]) {
  const ObjInvalidas = new Set<number>();
  const ObjPorAnimal = new Map<number, PermanenciaGanancia[]>();
  for (const ObjA of ArrAsignaciones) {
    if (Number.isNaN(ObjA.fechaInicio.getTime()) || (ObjA.fechaFin !== null &&
        (Number.isNaN(ObjA.fechaFin.getTime()) || ObjA.fechaFin <= ObjA.fechaInicio))) {
      ObjInvalidas.add(ObjA.asignacionLoteId);
      continue;
    }
    const ArrAnimal = ObjPorAnimal.get(ObjA.animalId) ?? [];
    ArrAnimal.push(ObjA);
    ObjPorAnimal.set(ObjA.animalId, ArrAnimal);
  }
  for (const ArrAnimal of ObjPorAnimal.values()) {
    let ArrAbiertas: PermanenciaGanancia[] = [];
    for (const ObjA of ArrAnimal.sort((ObjA, ObjB) => ObjA.fechaInicio.getTime() - ObjB.fechaInicio.getTime())) {
      ArrAbiertas = ArrAbiertas.filter(ObjB => (ObjB.fechaFin?.getTime() ?? Infinity) > ObjA.fechaInicio.getTime());
      for (const ObjB of ArrAbiertas) {
        ObjInvalidas.add(ObjA.asignacionLoteId);
        ObjInvalidas.add(ObjB.asignacionLoteId);
      }
      ArrAbiertas.push(ObjA);
    }
  }
  return ObjInvalidas;
}
