export const ObjRolesUsuarios = {
  WEBMASTER: "WEBMASTER",
  ADMINISTRADOR: "ADMINISTRADOR",
  OPERADOR: "OPERADOR",
} as const;

export const ArrCatalogoPermisosUsuarios = [
  { StrCodigo: "USUARIOS_CONSULTAR", StrNombre: "Consultar usuarios", StrAccion: "CONSULTAR" },
  { StrCodigo: "USUARIOS_CREAR", StrNombre: "Crear usuarios", StrAccion: "CREAR" },
  { StrCodigo: "USUARIOS_EDITAR", StrNombre: "Editar usuarios", StrAccion: "EDITAR" },
  { StrCodigo: "USUARIOS_CAMBIAR_ESTADO", StrNombre: "Cambiar estado de usuarios", StrAccion: "CAMBIAR_ESTADO" },
  { StrCodigo: "USUARIOS_ASIGNAR_ROL", StrNombre: "Asignar rol a usuarios", StrAccion: "ASIGNAR_ROL" },
  { StrCodigo: "USUARIOS_CONSULTAR_CATALOGOS", StrNombre: "Consultar roles y permisos", StrAccion: "CONSULTAR_CATALOGOS" },
  { StrCodigo: "USUARIOS_REVOCAR_SESIONES", StrNombre: "Revocar sesiones de usuarios", StrAccion: "REVOCAR_SESIONES" },
] as const;

export const ArrCodigosPermisosUsuarios = ArrCatalogoPermisosUsuarios.map(
  (ObjPermiso) => ObjPermiso.StrCodigo,
);

export const ArrDefinicionesRolesUsuarios = [
  { StrNombre: ObjRolesUsuarios.WEBMASTER, StrDescripcion: "Administración técnica máxima del sistema." },
  { StrNombre: ObjRolesUsuarios.ADMINISTRADOR, StrDescripcion: "Administración general del sistema." },
  { StrNombre: ObjRolesUsuarios.OPERADOR, StrDescripcion: "Captura y operación diaria." },
] as const;
