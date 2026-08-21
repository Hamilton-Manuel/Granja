export type EstadoUsuario = "ACTIVO" | "INACTIVO";

export interface RolAdministrativo {
  rolId: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
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
}

export interface RespuestaListadoUsuarios {
  datos: UsuarioAdministrativo[];
  paginacion: { pagina: number; limite: number; total: number };
}

export interface RespuestaUsuario { datos: UsuarioAdministrativo }
export interface RespuestaRoles { datos: RolAdministrativo[] }
