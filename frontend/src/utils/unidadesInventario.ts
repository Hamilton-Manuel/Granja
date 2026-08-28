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

export function Inventario_esUnidadNormalizada(StrUnidad: string): boolean {
  return ArrGruposUnidadesInventario.some((ObjGrupo) => ObjGrupo.ArrUnidades.some((ObjUnidad) => ObjUnidad.StrValor === StrUnidad));
}

export function Inventario_unidadesCompatibles(StrUnidadBase: string) {
  return ArrGruposUnidadesInventario.find((ObjGrupo) => ObjGrupo.ArrUnidades.some((ObjUnidad) => ObjUnidad.StrValor === StrUnidadBase))?.ArrUnidades ?? [];
}
