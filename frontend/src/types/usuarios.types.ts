export type EstadoUsuario = "ACTIVO" | "INACTIVO";

export interface RolAdministrativo {
  rolId: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  esReservado?: boolean;
  _count: { rolesPermisos: number; usuarios: number };
}

export interface UsuarioAdministrativo {
  usuarioId: number;
  nombreCompleto: string;
  nombreUsuario: string;
  correo: string;
  estado: EstadoUsuario;
  fechaCreacion: string;
  fechaActualizacion: string;
  rol: { rolId: number; nombre: string; activo: boolean };
}

export interface ConsultaUsuarios {
  pagina: number;
  limite: number;
  busqueda?: string;
  estado?: EstadoUsuario;
  rolId?: number;
}

export interface DatosCrearUsuario {
  nombreCompleto: string;
  nombreUsuario: string;
  correo: string;
  contrasena: string;
  rolId: number;
}

export interface DatosEditarUsuario {
  nombreCompleto?: string;
  nombreUsuario?: string;
  correo?: string;
  nuevaContrasena?: string;
}

export interface RespuestaListadoUsuarios {
  datos: UsuarioAdministrativo[];
  paginacion: { pagina: number; limite: number; total: number };
}

export interface RespuestaUsuario { datos: UsuarioAdministrativo }
export interface RespuestaRoles { datos: RolAdministrativo[] }
export type EstadoAcceso = "HEREDAR" | "PERMITIR" | "DENEGAR";
export interface UsuarioAccesoResumen { usuarioId: number; nombreCompleto: string; nombreUsuario: string; estado: EstadoUsuario; esProtegida: boolean; rol: { rolId: number; nombre: string } }
export interface PermisoAcceso { permisoId: number; codigo: string; nombre: string; modulo: string; activo: boolean; estado: EstadoAcceso; permitido: boolean; origen: string }
export interface DetalleAccesos { usuario: Omit<UsuarioAccesoResumen, "rol">; versionAccesos: number; rol: { rolId: number; nombre: string }; permisos: PermisoAcceso[] }
export interface RespuestaListadoAccesos { datos: UsuarioAccesoResumen[]; paginacion: { pagina: number; limite: number; total: number } }
export interface RespuestaDetalleAccesos { datos: DetalleAccesos }
