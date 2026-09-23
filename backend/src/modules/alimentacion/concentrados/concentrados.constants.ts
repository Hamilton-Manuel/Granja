export const ArrCatalogoPermisosConcentrados = [
  ["ALIMENTACION_CONCENTRADOS_CONSULTAR", "Consultar concentrados", "CONSULTAR"],
  ["ALIMENTACION_RECETAS_GESTIONAR", "Administrar concentrados y recetas", "GESTIONAR"],
  ["ALIMENTACION_ELABORACIONES_REGISTRAR", "Registrar elaboraciones", "REGISTRAR"],
  ["ALIMENTACION_ELABORACIONES_CONSULTAR", "Consultar elaboraciones", "CONSULTAR"],
  ["ALIMENTACION_ELABORACIONES_REVERTIR", "Revertir elaboraciones", "REVERTIR"],
].map(([StrCodigo, StrNombre, StrAccion]) => ({ StrCodigo: StrCodigo!, StrNombre: StrNombre!, StrAccion: StrAccion! }));
