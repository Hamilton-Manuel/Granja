export type DecimalInventario = string;
export type EstadoFiltro = "ACTIVO" | "INACTIVO";
export type TipoMovimiento = "INGRESO" | "SALIDA" | "AJUSTE";

export interface PaginacionInventario { pagina: number; limite: number; total: number }
export interface RespuestaLista<T> { datos: T[]; paginacion: PaginacionInventario }
export interface RespuestaDato<T> { datos: T }
export interface ConsultaBase { pagina: number; limite: number; busqueda?: string; estado?: EstadoFiltro }

export interface CategoriaInventario { categoriaId: number; nombre: string; descripcion: string | null; activo: boolean; fechaCreacion: string; fechaActualizacion: string }
export interface AlmacenInventario { inventarioId: number; codigo: string; nombre: string; descripcion: string | null; ubicacion: string | null; activo: boolean; fechaCreacion?: string; fechaActualizacion?: string }
export interface ProductoResumen { productoId: number; codigo: string; nombre: string; unidadMedida: string; manejaLotes: boolean; activo: boolean }
export interface ProductoInventario extends ProductoResumen { categoriaId: number; descripcion: string | null; fechaCreacion: string; fechaActualizacion: string; categoria: Pick<CategoriaInventario, "categoriaId" | "nombre" | "activo"> }
export interface ProveedorInventario { proveedorId: number; codigo: string; nombre: string; nombreComercial: string | null; activo: boolean }
export interface UsuarioInventario { usuarioId: number; nombreCompleto: string }
export interface LoteResumen { loteInventarioId: number; codigoLote: string; fechaFabricacion: string | null; fechaVencimiento: string | null; costoUnitario: DecimalInventario | null; activo: boolean }
export interface ExistenciaLote { existenciaLoteId: number; loteInventarioId: number; existenciaActual: DecimalInventario; lote: LoteResumen }
export interface ExistenciaInventario { inventarioProductoId: number; inventarioId: number; productoId: number; existenciaActual: DecimalInventario; existenciaMinima: DecimalInventario; activo: boolean; producto: ProductoResumen; almacen: AlmacenInventario; lotes: ExistenciaLote[] }
export interface LoteInventario extends LoteResumen { productoId: number; proveedorId: number | null; observaciones: string | null; producto: ProductoResumen; proveedor: ProveedorInventario | null; existencias: Array<{ existenciaLoteId: number; existenciaActual: DecimalInventario; existencia: { inventarioId: number; almacen: AlmacenInventario } }> }
export interface ProveedorProducto { proveedorProductoId: number; proveedorId: number; productoId: number; precioReferencia: DecimalInventario | null; activo: boolean; fechaRelacion: string; fechaActualizacion: string; proveedor: ProveedorInventario; producto: ProductoResumen }
export interface MovimientoInventario { transaccionInventarioId: number; inventarioProductoId: number; existenciaLoteId: number | null; transferenciaId: number | null; transaccionRevertidaId: number | null; usuarioId: number; proveedorId: number | null; tipoTransaccion: TipoMovimiento; subtipoTransaccion: string; cantidad: DecimalInventario; costoUnitario: DecimalInventario | null; documentoReferencia: string | null; motivo: string | null; observaciones: string | null; fechaTransaccion: string; producto: ProductoResumen; almacen: AlmacenInventario; lote: LoteResumen | null; proveedor: ProveedorInventario | null; usuario: UsuarioInventario; revertida: boolean; reversion: { transaccionInventarioId: number; fechaTransaccion: string } | null }
export interface TransferenciaInventario { transferenciaId: number; cantidad: DecimalInventario; documentoReferencia: string | null; motivo: string | null; observaciones: string | null; fechaTransferencia: string; producto: ProductoResumen; origen: AlmacenInventario; destino: AlmacenInventario; lote: LoteResumen | null; usuario: UsuarioInventario; movimientosOriginales: { salidaId: number; entradaId: number }; revertida: boolean; reversion: { salidaReversionId: number; entradaReversionId: number; fechaReversion: string } | null }
export interface ResumenInventario { productosActivos: number; existenciasOperativas: number; existenciasBajoMinimo: number; lotesActivos: number; lotesProximosVencer: number; lotesVencidos: number; movimientosRecientes: MovimientoInventario[] }
export interface DiferenciaSaldo { inventarioProductoId?: number; existenciaLoteId?: number; saldoMaterializado?: DecimalInventario; saldoHistorial?: DecimalInventario; saldoProducto?: DecimalInventario; saldoLotes?: DecimalInventario; diferencia: DecimalInventario; producto: ProductoResumen; almacen: AlmacenInventario; lote?: LoteResumen }
export interface DiagnosticoInventario { fechaDiagnostico: string; consistente: boolean; totalDiferencias: number; revisados: { existencias: number; existenciasConLotes: number; saldosLote: number }; saldos: DiferenciaSaldo[]; lotes: DiferenciaSaldo[]; saldosLote: DiferenciaSaldo[] }

export interface DatosProducto { categoriaId: number; codigo: string; nombre: string; descripcion?: string | null; unidadMedida: string; manejaLotes: boolean }
export type CambiosProducto = Partial<Omit<DatosProducto, "codigo">>;
export interface DatosCategoria { nombre: string; descripcion?: string | null }
export interface DatosAlmacen { codigo: string; nombre: string; descripcion?: string | null; ubicacion?: string | null }
export interface DatosMovimientoBase { productoId: number; inventarioId: number; loteInventarioId?: number; proveedorId?: number; cantidad: DecimalInventario; documentoReferencia?: string | null; motivo?: string | null; observaciones?: string | null }
export interface DatosEntrada extends DatosMovimientoBase { subtipo: "COMPRA" | "INVENTARIO_INICIAL"; codigoLote?: string; costoUnitario?: DecimalInventario | null; fechaFabricacion?: string | null; fechaVencimiento?: string | null }
export interface DatosSalida extends DatosMovimientoBase { subtipo: "DEVOLUCION_PROVEEDOR" | "MERMA" | "DISPOSICION" }
export interface DatosAjuste extends Omit<DatosMovimientoBase, "proveedorId"> { subtipo: "CONTEO_FISICO"; motivo: string }
export interface DatosTransferencia { productoId: number; inventarioOrigenId: number; inventarioDestinoId: number; loteInventarioId?: number; cantidad: DecimalInventario; documentoReferencia?: string | null; motivo?: string | null; observaciones?: string | null }
