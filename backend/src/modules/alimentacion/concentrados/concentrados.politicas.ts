import { ErrorAplicacion } from "../../../errors/error-aplicacion.js";

export type AlimentacionDependenciaReceta = { IntProductoTerminadoId: number; ArrIngredientesIds: number[] };

/** Incluye todas las recetas, aun inactivas; solo su composición actual, no detalles sustituidos. */
export function Alimentacion_exigirGrafoSinCiclos(ArrRecetas: AlimentacionDependenciaReceta[]): void {
  const ObjAdyacencias = new Map<number, Set<number>>();
  const ObjGrados = new Map<number, number>();
  for (const ObjReceta of ArrRecetas) {
    const IntOrigen = ObjReceta.IntProductoTerminadoId;
    if (!ObjGrados.has(IntOrigen)) ObjGrados.set(IntOrigen, 0);
    const ObjDestinos = ObjAdyacencias.get(IntOrigen) ?? new Set<number>();
    ObjAdyacencias.set(IntOrigen, ObjDestinos);
    for (const IntDestino of ObjReceta.ArrIngredientesIds) {
      if (ObjDestinos.has(IntDestino)) continue;
      ObjDestinos.add(IntDestino);
      ObjGrados.set(IntDestino, (ObjGrados.get(IntDestino) ?? 0) + 1);
    }
  }
  const ArrPendientes = [...ObjGrados].filter(([, IntGrado]) => IntGrado === 0).map(([IntId]) => IntId);
  for (let IntPosicion = 0; IntPosicion < ArrPendientes.length; IntPosicion += 1) {
    for (const IntDestino of ObjAdyacencias.get(ArrPendientes[IntPosicion]!) ?? []) {
      const IntGrado = ObjGrados.get(IntDestino)! - 1;
      ObjGrados.set(IntDestino, IntGrado);
      if (IntGrado === 0) ArrPendientes.push(IntDestino);
    }
  }
  if (ArrPendientes.length !== ObjGrados.size) {
    throw new ErrorAplicacion(409, "CONCENTRADOS_CICLO", "Las recetas no pueden contener dependencias circulares, incluso estando inactivas.");
  }
}
