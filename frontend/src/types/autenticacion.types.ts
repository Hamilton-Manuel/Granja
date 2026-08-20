export interface RolUsuario {
  rolId: number;
  nombre: string;
}

export interface UsuarioAutenticado {
  usuarioId: number;
  nombreCompleto: string;
  nombreUsuario: string;
  correo: string;
  estado: string;
  rol: RolUsuario;
  permisos: string[];
}

export type EstadoSesion = "cargando" | "autenticada" | "noAutenticada" | "error";

export interface RespuestaSesion {
  datos: {
    usuario: UsuarioAutenticado;
  };
}

export interface RespuestaLogin extends RespuestaSesion {
  datos: RespuestaSesion["datos"] & {
    sesion: {
      fechaExpiracion: string;
    };
  };
}
