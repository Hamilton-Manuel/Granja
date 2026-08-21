export interface TipoCliente { tipoClienteId: number; codigo: string; nombre: string; descripcion: string | null; activo: boolean }
export interface Cliente { clienteId: number; tipoClienteId: number; codigo: string; nombreCompleto: string; numeroDocumento: string | null; nit: string | null; telefono: string | null; correo: string | null; direccion: string | null; observaciones: string | null; activo: boolean; fechaCreacion: string; fechaActualizacion: string; tipo: Pick<TipoCliente, "tipoClienteId" | "codigo" | "nombre" | "activo"> }
export interface ConsultaClientes { pagina: number; limite: number; busqueda?: string; estado?: "ACTIVO" | "INACTIVO"; tipoClienteId?: number }
export interface DatosCliente { tipoClienteId: number; nombreCompleto: string; numeroDocumento?: string | null; nit?: string | null; telefono?: string | null; correo?: string | null; direccion?: string | null; observaciones?: string | null }
export type CambiosCliente = Partial<DatosCliente>;
export interface RespuestaClientes { datos: Cliente[]; paginacion: { pagina: number; limite: number; total: number } }
export interface RespuestaCliente { datos: Cliente }
export interface RespuestaTiposCliente { datos: TipoCliente[] }
