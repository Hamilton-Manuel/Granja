export const ArrCatalogoPermisosReportes = [
  { StrCodigo: "REPORTES_INVENTARIO_CONSULTAR", StrNombre: "Consultar reportes de inventario", StrAccion: "CONSULTAR_INVENTARIO" },
  { StrCodigo: "REPORTES_PRODUCCION_CONSULTAR", StrNombre: "Consultar reportes de producción", StrAccion: "CONSULTAR_PRODUCCION" },
  { StrCodigo: "REPORTES_SANIDAD_CONSULTAR", StrNombre: "Consultar reportes de sanidad", StrAccion: "CONSULTAR_SANIDAD" },
  { StrCodigo: "REPORTES_VENTAS_CONSULTAR", StrNombre: "Consultar reportes de ventas", StrAccion: "CONSULTAR_VENTAS" },
  { StrCodigo: "REPORTES_COSTOS_CONSULTAR", StrNombre: "Consultar costos internos", StrAccion: "CONSULTAR_COSTOS" },
] as const;

export const ObjPermisoCategoriaReportes = {
  inventario: "REPORTES_INVENTARIO_CONSULTAR",
  produccion: "REPORTES_PRODUCCION_CONSULTAR",
  sanidad: "REPORTES_SANIDAD_CONSULTAR",
  ventas: "REPORTES_VENTAS_CONSULTAR",
  costos: "REPORTES_COSTOS_CONSULTAR",
} as const;
