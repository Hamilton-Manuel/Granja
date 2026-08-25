export const ArrCatalogoPermisosSanidad = [
  ["SANIDAD_CONSULTAR", "Consultar sanidad", "CONSULTAR"],
  ["SANIDAD_REGISTRAR", "Registrar aplicación sanitaria", "REGISTRAR"],
  ["SANIDAD_REVERTIR", "Revertir aplicación sanitaria", "REVERTIR"],
  [
    "SANIDAD_PRODUCTOS_GESTIONAR",
    "Gestionar productos sanitarios",
    "GESTIONAR_PRODUCTOS",
  ],
  ["SANIDAD_TIPOS_CREAR", "Crear tipos sanitarios", "CREAR_TIPOS"],
  ["SANIDAD_TIPOS_EDITAR", "Editar tipos sanitarios", "EDITAR_TIPOS"],
  [
    "SANIDAD_TIPOS_CAMBIAR_ESTADO",
    "Cambiar estado de tipos sanitarios",
    "CAMBIAR_ESTADO_TIPOS",
  ],
  ["SANIDAD_VIAS_CREAR", "Crear vías sanitarias", "CREAR_VIAS"],
  ["SANIDAD_VIAS_EDITAR", "Editar vías sanitarias", "EDITAR_VIAS"],
  [
    "SANIDAD_VIAS_CAMBIAR_ESTADO",
    "Cambiar estado de vías sanitarias",
    "CAMBIAR_ESTADO_VIAS",
  ],
  ["SANIDAD_UNIDADES_CREAR", "Crear unidades sanitarias", "CREAR_UNIDADES"],
  ["SANIDAD_UNIDADES_EDITAR", "Editar unidades sanitarias", "EDITAR_UNIDADES"],
  [
    "SANIDAD_UNIDADES_CAMBIAR_ESTADO",
    "Cambiar estado de unidades sanitarias",
    "CAMBIAR_ESTADO_UNIDADES",
  ],
  [
    "SANIDAD_RECONCILIACION_EJECUTAR",
    "Diagnosticar consistencia sanitaria",
    "RECONCILIAR",
  ],
].map(([StrCodigo, StrNombre, StrAccion]) => ({
  StrCodigo: StrCodigo!,
  StrNombre: StrNombre!,
  StrAccion: StrAccion!,
}));
export const ArrPermisosSanidadOperador = [
  "SANIDAD_CONSULTAR",
  "SANIDAD_REGISTRAR",
] as const;
export const ArrTiposSanidad = [
  ["VACUNA", "Vacuna"],
  ["MEDICAMENTO", "Medicamento"],
  ["VITAMINA", "Vitamina"],
  ["DESPARASITACION", "Desparasitación"],
  ["PROCEDIMIENTO", "Procedimiento"],
  ["OTRO", "Otro"],
] as const;
export const ArrViasSanidad = [
  ["ORAL", "Oral"],
  ["INYECTABLE", "Inyectable"],
  ["TOPICA", "Tópica"],
  ["OCULAR", "Ocular"],
  ["NASAL", "Nasal"],
  ["OTRA", "Otra"],
] as const;
export const ArrUnidadesSanidad = [
  ["MG", "mg"],
  ["G", "g"],
  ["ML", "ml"],
  ["L", "l"],
  ["DOSIS", "Dosis"],
  ["UNIDAD", "Unidad"],
] as const;
