import * as Reportes from "../reportes/reportes-metricas.service.js";

export const ObjPermisosDashboard = {
  produccion: "REPORTES_PRODUCCION_CONSULTAR",
  inventario: "REPORTES_INVENTARIO_CONSULTAR",
  ventas: "REPORTES_VENTAS_CONSULTAR",
  sanidad: "REPORTES_SANIDAD_CONSULTAR",
  costos: "REPORTES_COSTOS_CONSULTAR",
} as const;

type CategoriaDashboard = keyof typeof ObjPermisosDashboard;
const ObjConsultasDashboard = {
  produccion: Reportes.Reportes_obtenerMetricasProduccion,
  inventario: Reportes.Reportes_obtenerMetricasInventario,
  ventas: Reportes.Reportes_obtenerMetricasVentas,
  sanidad: Reportes.Reportes_obtenerMetricasSanidad,
  costos: Reportes.Reportes_obtenerMetricasCostos,
} satisfies Record<CategoriaDashboard, () => Promise<unknown>>;

export async function Dashboard_obtener(ArrPermisos: readonly string[], ObjConsultas: Record<CategoriaDashboard, () => Promise<unknown>> = ObjConsultasDashboard) {
  const ArrCategorias = (Object.keys(ObjPermisosDashboard) as CategoriaDashboard[]).filter((StrCategoria) => ArrPermisos.includes(ObjPermisosDashboard[StrCategoria]));
  const ArrResultados = await Promise.allSettled(ArrCategorias.map((StrCategoria) => ObjConsultas[StrCategoria]()));
  const bloques: Partial<Record<CategoriaDashboard, unknown>> = {};
  const errores: Partial<Record<CategoriaDashboard, { codigo: string; mensaje: string }>> = {};
  ArrResultados.forEach((ObjResultado, IntIndice) => {
    const StrCategoria = ArrCategorias[IntIndice]!;
    if (ObjResultado.status === "fulfilled") bloques[StrCategoria] = ObjResultado.value;
    else errores[StrCategoria] = { codigo: "BLOQUE_NO_DISPONIBLE", mensaje: `No fue posible cargar el resumen de ${StrCategoria}.` };
  });
  return { periodo: Reportes.Reportes_periodoPublico(), bloques, ...(Object.keys(errores).length > 0 ? { errores } : {}) };
}
