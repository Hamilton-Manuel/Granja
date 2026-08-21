export interface TipoProveedor { tipoProveedorId: number; codigo: string; nombre: string; descripcion: string | null; activo: boolean }
export interface Proveedor { proveedorId: number; tipoProveedorId: number; codigo: string; nombre: string; nombreComercial: string | null; numeroDocumento: string | null; nit: string | null; telefono: string | null; correo: string | null; direccion: string | null; observaciones: string | null; activo: boolean; fechaCreacion: string; fechaActualizacion: string; tipo: Pick<TipoProveedor, "tipoProveedorId" | "codigo" | "nombre" | "activo"> }
export interface ConsultaProveedores { pagina: number; limite: number; busqueda?: string; estado?: "ACTIVO" | "INACTIVO"; tipoProveedorId?: number }
export interface DatosProveedor { tipoProveedorId: number; nombre: string; nombreComercial?: string | null; numeroDocumento?: string | null; nit?: string | null; telefono?: string | null; correo?: string | null; direccion?: string | null; observaciones?: string | null }
export type CambiosProveedor = Partial<DatosProveedor>;
export interface RespuestaProveedores { datos: Proveedor[]; paginacion: { pagina: number; limite: number; total: number } }
export interface RespuestaProveedor { datos: Proveedor }
export interface RespuestaTiposProveedor { datos: TipoProveedor[] }
