import type { DimensionUnidadInventario, UnidadInventario } from "../types/inventario.types";

export const ObjDimensionesUnidades: Record<DimensionUnidadInventario, { StrNombre: string; StrBase: string }> = {
  PESO: { StrNombre: "Peso", StrBase: "g" },
  VOLUMEN: { StrNombre: "Volumen", StrBase: "mL" },
  UNIDADES: { StrNombre: "Unidades", StrBase: "unidad" },
};

// Etiquetas usadas por Concentrados; la disponibilidad procede de su catálogo backend.
export const ArrGruposUnidadesInventario = [
  { StrGrupo: "Peso", ArrUnidades: [
    { StrValor: "kg", StrEtiqueta: "Kilogramo (kg)" }, { StrValor: "g", StrEtiqueta: "Gramo (g)" },
    { StrValor: "lb", StrEtiqueta: "Libra (lb)" }, { StrValor: "oz", StrEtiqueta: "Onza (oz)" },
    { StrValor: "qq", StrEtiqueta: "Quintal (qq)" }, { StrValor: "t", StrEtiqueta: "Tonelada (t)" },
  ] },
  { StrGrupo: "Volumen", ArrUnidades: [
    { StrValor: "L", StrEtiqueta: "Litro (L)" }, { StrValor: "mL", StrEtiqueta: "Mililitro (mL)" },
  ] },
  { StrGrupo: "Unidades", ArrUnidades: [{ StrValor: "unidad", StrEtiqueta: "Unidad" }] },
] as const;

export function Inventario_agruparUnidades(ArrUnidades: UnidadInventario[]) {
  return Object.entries(ObjDimensionesUnidades).map(([StrDimension, ObjDimension]) => ({
    StrGrupo: ObjDimension.StrNombre,
    ArrUnidades: ArrUnidades.filter((ObjUnidad) => ObjUnidad.activo && ObjUnidad.dimension === StrDimension).map((ObjUnidad) => ({ StrValor: ObjUnidad.codigo, StrEtiqueta: `${ObjUnidad.nombre} (${ObjUnidad.codigo})` })),
  }));
}

export function Inventario_unidadesCompatibles(StrUnidadBase: string, ArrUnidades: UnidadInventario[]) {
  const ObjBase = ArrUnidades.find((ObjUnidad) => ObjUnidad.codigo === StrUnidadBase && ObjUnidad.activo);
  return ObjBase ? ArrUnidades.filter((ObjUnidad) => ObjUnidad.activo && ObjUnidad.dimension === ObjBase.dimension).map((ObjUnidad) => ({ StrValor: ObjUnidad.codigo, StrEtiqueta: `${ObjUnidad.nombre} (${ObjUnidad.codigo})` })) : [];
}
