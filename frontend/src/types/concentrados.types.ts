export interface ProductoConcentrado { productoId: number; codigo: string; nombre: string; unidadMedida: string; activo: boolean }
export interface Concentrado { concentradoId: number; productoId: number; activo: boolean; producto: Omit<ProductoConcentrado, "productoId"> }
export interface AlmacenConcentrado { inventarioId: number; codigo: string; nombre: string }
export interface CatalogosConcentrados { unidades: { codigo: string; factorReferencia: string }[]; almacenes: AlmacenConcentrado[] }
export interface ConsultaConcentrados { pagina: number; limite: number; busqueda?: string; concentradoId?: number }
export interface ListaConcentrados<T> { datos: T[]; paginacion: { pagina: number; limite: number; total: number } }
export interface IngredienteReceta { productoId: number; cantidad: string; unidadMedida: string }
export interface DatosRecetaConcentrado { concentradoId: number; nombre: string; descripcion?: string; cantidadBase: string; unidadBase: string; detalles: IngredienteReceta[] }
export interface RecetaConcentrado extends Omit<DatosRecetaConcentrado, "descripcion" | "detalles"> {
  recetaId: number; productoId: number; version: number; activo: boolean; descripcion: string | null;
  detalles: (IngredienteReceta & { recetaDetalleId: number; activo: boolean; producto: Omit<ProductoConcentrado, "productoId"> })[];
}
export interface DatosPreviaConcentrado {
  recetaId: number; versionReceta: number; fechaEfectiva: string; cantidadTeorica: string; cantidadReal: string;
  unidadCaptura: string; inventarioDestinoId: number; fechaVencimiento?: string; motivoDiferencia?: string; observaciones?: string;
}
export interface DatosConfirmacionConcentrado extends DatosPreviaConcentrado { claveIdempotencia: string; huellaPrevisualizacion: string }
export interface FuentePreviaConcentrado {
  existenciaLoteId: number; inventarioId: number; loteInventarioId: number; codigoLote: string;
  existenciaActual: string; cantidad: string; costoUnitario: string; importe: string; fechaVencimiento: string | null;
}
export interface PreviaConcentrado {
  disponible: boolean; reservaExistencias: false; huellaPrevisualizacion: string;
  receta: { recetaId: number; version: number; nombre: string };
  productoTerminado: { productoId: number; codigo: string; nombre: string; unidadBase: string };
  destino: AlmacenConcentrado; fechaEfectiva: string; cantidadTeorica: string; cantidadReal: string; unidadCaptura: string;
  cantidadTeoricaBase: string; cantidadRealBase: string;
  rendimiento: { diferencia: string; porcentaje: string; motivo: string | null };
  balanceMasa: { unidad: string; ingredientesRequeridos: string; ingredientesDisponiblesAsignados: string; salidaTeorica: string; salidaReal: string; diferenciaEntradaSalida: string; residualCuantizacionSalida: string };
  ingredientes: { productoId: number; codigo: string; nombre: string; unidadBase: string; cantidadRequerida: string; cantidadDisponible: string; cantidadFaltante: string; fuentes: FuentePreviaConcentrado[] }[];
  faltantes: { productoId: number; nombre: string; unidadBase: string; cantidadFaltante: string }[];
  costoDisponible: string;
  costoEstimado: { total: string; unitario: string; unidad: string; residualValoracion: string } | null;
}
export interface ResumenElaboracion {
  elaboracionId: number; fechaEfectiva: string; codigoProductoSnapshot: string; nombreProductoSnapshot: string;
  nombreRecetaSnapshot: string; versionReceta: number; estado: "CONFIRMADA" | "REVERTIDA";
  cantidadRealBase: string; unidadBaseSnapshot: string; costoTotal: string; usuario?: { nombreCompleto: string };
}
export interface ElaboracionConcentrado extends ResumenElaboracion {
  recetaId: number; productoId: number; cantidadTeorica: string; cantidadReal: string; unidadCaptura: string;
  cantidadTeoricaBase: string; costoUnitario: string; residualValoracion: string; usuarioId: number;
  loteInventarioId: number; transaccionIngresoId: number; motivoDiferencia: string | null; observaciones: string | null;
  fechaReversion: string | null; motivoReversion: string | null;
  lote?: { codigoLote: string; fechaVencimiento: string | null }; almacenDestino?: AlmacenConcentrado;
  detalles: { elaboracionDetalleId: number; productoId: number; codigoProductoSnapshot: string; nombreProductoSnapshot: string;
    cantidadConsumida: string; unidadBaseSnapshot: string;
    fuentes: { elaboracionFuenteId: number; existenciaLoteId: number; transaccionConsumoId: number;
      cantidadConsumida: string; costoUnitarioHistorico: string; costoTotal: string;
      lote?: { loteInventarioId: number; codigoLote: string }; almacen?: AlmacenConcentrado }[] }[];
}
export interface DependenciasConcentrado {
  elaboracionId: number; reversible: boolean; estado: string; cantidadRequerida: string; unidad: string;
  bloqueos: { codigo: string; mensaje: string }[];
  dependencias: { transaccionId: number; subtipo: string; cantidad: string; fecha: string; codigoAlmacen: string;
    alimentacionId: number | null; elaboracionId: number | null; transferenciaId: number | null }[];
}
