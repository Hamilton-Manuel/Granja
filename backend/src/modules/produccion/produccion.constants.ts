export const ArrCatalogoPermisosProduccion = [
  ["PRODUCCION_CONSULTAR", "Consultar produccion", "CONSULTAR"],
  ["PRODUCCION_TIPOS_CREAR", "Crear tipos de animales", "CREAR"],
  ["PRODUCCION_TIPOS_EDITAR", "Editar tipos de animales", "EDITAR"],
  ["PRODUCCION_TIPOS_CAMBIAR_ESTADO", "Cambiar estado de tipos de animales", "CAMBIAR_ESTADO"],
  ["PRODUCCION_RAZAS_CREAR", "Crear razas", "CREAR"],
  ["PRODUCCION_RAZAS_EDITAR", "Editar razas", "EDITAR"],
  ["PRODUCCION_RAZAS_CAMBIAR_ESTADO", "Cambiar estado de razas", "CAMBIAR_ESTADO"],
  ["PRODUCCION_LOTES_CREAR", "Crear lotes de produccion", "CREAR"],
  ["PRODUCCION_LOTES_EDITAR", "Editar lotes de produccion", "EDITAR"],
  ["PRODUCCION_LOTES_CAMBIAR_ESTADO", "Cambiar estado de lotes", "CAMBIAR_ESTADO"],
  ["PRODUCCION_ANIMALES_EDITAR", "Editar animales", "EDITAR"],
  ["PRODUCCION_INGRESOS_INICIALES_CREAR", "Registrar carga inicial de animales", "CREAR"],
  ["PRODUCCION_NACIMIENTOS_CREAR", "Registrar nacimientos", "CREAR"],
  ["PRODUCCION_COMPRAS_CREAR", "Registrar compras de animales", "CREAR"],
  ["PRODUCCION_TRASLADOS_CREAR", "Trasladar animales entre lotes", "CREAR"],
  ["PRODUCCION_MEDICIONES_CREAR", "Registrar peso de animales", "CREAR"],
  ["PRODUCCION_ESTADOS_TERMINALES_REGISTRAR", "Registrar estados terminales", "CAMBIAR_ESTADO"],
  ["PRODUCCION_OPERACIONES_REVERTIR", "Revertir operaciones de produccion", "REVERTIR"],
  ["PRODUCCION_RECONCILIACION_EJECUTAR", "Diagnosticar consistencia de produccion", "EJECUTAR"],
].map(([StrCodigo, StrNombre, StrAccion]) => ({ StrCodigo: StrCodigo!, StrNombre: StrNombre!, StrAccion: StrAccion! }));

export const ArrPermisosProduccionOperador = [
  "PRODUCCION_CONSULTAR",
  "PRODUCCION_NACIMIENTOS_CREAR",
  "PRODUCCION_TRASLADOS_CREAR",
  "PRODUCCION_MEDICIONES_CREAR",
] as const;

export const ArrEstadosAnimal = ["ACTIVO", "VENDIDO", "FALLECIDO", "RETIRADO"] as const;
export const ArrSexosAnimal = ["MACHO", "HEMBRA", "NO_DETERMINADO"] as const;

export function Produccion_canonicalizarCodigo(StrCodigo: string): string {
  return StrCodigo.trim().replace(/\s+/g, "").toUpperCase();
}
