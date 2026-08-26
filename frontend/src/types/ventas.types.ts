export type DecimalVentas = string;
export type EstadoVenta = "CONFIRMADA" | "ANULADA";
export type FormaPagoVenta = "EFECTIVO" | "TRANSFERENCIA" | "DEPOSITO" | "CREDITO";

export interface RespuestaDatoVentas<T> { ok: boolean; datos: T }
export interface RespuestaListaVentas<T> { ok: boolean; datos: T[]; paginacion: { pagina: number; limite: number; total: number } }
export interface ReciboVenta { serie: string; numero: number; estado: "EMITIDO" | "ANULADO" }
export interface ClienteVenta { clienteId: number; codigo: string; nombreCompleto: string; nit: string | null; activo: boolean }
export interface LoteVenta { loteProduccionId: number; codigo: string; nombre: string; tipoAnimal: { tipoAnimalId: number; nombre: string }; cantidadAnimalesVigentes: number }
export interface AnimalVentaLookup { animalId: number; identificacion: string; sexo: string; tipoAnimal: { tipoAnimalId: number; nombre: string }; raza: { razaId: number; nombre: string } | null; asignacionVigente: { asignacionLoteId: number; fechaInicio: string; lote: { loteProduccionId: number; codigo: string; nombre: string } } }
export interface AnimalDetalleVenta { detalleVentaAnimalId: number; animalId: number; precioVenta: DecimalVentas; animal: { animalId: number; identificacion: string; sexo: string; tipoAnimal: { tipoAnimalId: number; nombre: string }; raza: { razaId: number; nombre: string } | null }; asignacion: { asignacionLoteId: number; fechaInicio: string; fechaFin: string | null } }
export interface DetalleVenta { detalleVentaId: number; loteProduccionId: number; cantidadAnimales: number; subtotal: DecimalVentas; lote: { loteProduccionId: number; codigo: string; nombre: string; tipoAnimal: { tipoAnimalId: number; nombre: string } }; animales: AnimalDetalleVenta[] }
export interface Venta { ventaId: number; clienteId: number; fechaVenta: string; clienteCodigo: string; clienteNombre: string; clienteNit: string | null; subtotal: DecimalVentas; total: DecimalVentas; formaPago: FormaPagoVenta; estado: EstadoVenta; documentoReferencia: string | null; observaciones: string | null; fechaAnulacion: string | null; motivoAnulacion: string | null; cliente: Omit<ClienteVenta, "activo">; usuario: { usuarioId: number; nombreCompleto: string }; usuarioAnulacion: { usuarioId: number; nombreCompleto: string } | null; recibo: ReciboVenta | null; detalles: DetalleVenta[] }
export interface ConsultaVentas { pagina: number; limite: number; busqueda?: string; estado?: EstadoVenta; clienteId?: number; animalIdentificacion?: string; loteProduccionId?: number; formaPago?: FormaPagoVenta; fechaDesde?: string; fechaHasta?: string }
export interface RegistroVenta { clienteId: number; fechaVenta: string; formaPago: FormaPagoVenta; documentoReferencia?: string | null; observaciones?: string | null; animales: Array<{ animalId: number; precioVenta: DecimalVentas }> }
export interface DiagnosticoVentas { consistente: boolean; ventasRevisadas: number; detallesRevisados: number; animalesRevisados: number; diferencias: Array<{ tipo: string; cantidad: number }> }
