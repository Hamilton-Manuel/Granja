export const ArrCatalogoPermisosAlimentacion = [
  ["ALIMENTACION_CONSULTAR", "Consultar alimentación", "CONSULTAR"],
  ["ALIMENTACION_REGISTRAR", "Registrar alimentación", "REGISTRAR"],
  ["ALIMENTACION_REVERTIR", "Revertir alimentación", "REVERTIR"],
  ["ALIMENTACION_PRODUCTOS_GESTIONAR", "Gestionar productos habilitados", "GESTIONAR"],
  ["ALIMENTACION_FORMULAS_CREAR", "Crear fórmulas", "CREAR"],
  ["ALIMENTACION_FORMULAS_EDITAR", "Editar fórmulas", "EDITAR"],
  ["ALIMENTACION_FORMULAS_CAMBIAR_ESTADO", "Cambiar estado de fórmulas", "CAMBIAR_ESTADO"],
  ["ALIMENTACION_RECONCILIACION_EJECUTAR", "Diagnosticar alimentación", "EJECUTAR"],
].map(([StrCodigo, StrNombre, StrAccion]) => ({ StrCodigo: StrCodigo!, StrNombre: StrNombre!, StrAccion: StrAccion! }));

export const ArrPermisosAlimentacionOperador = ["ALIMENTACION_CONSULTAR", "ALIMENTACION_REGISTRAR"] as const;
