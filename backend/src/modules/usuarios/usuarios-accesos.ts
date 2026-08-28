export type EstadoAcceso = "HEREDAR" | "PERMITIR" | "DENEGAR";
export type OrigenAcceso = "DENEGADO_DIRECTAMENTE" | "PERMITIDO_DIRECTAMENTE" | "HEREDADO_DEL_ROL" | "SIN_ACCESO" | "PERMISO_INACTIVO";

export function Usuarios_resolverPermiso(ObjPermiso: { activo: boolean; heredado: boolean; efecto?: string | null | undefined }) {
  if (!ObjPermiso.activo) return { permitido: false, origen: "PERMISO_INACTIVO" as OrigenAcceso };
  if (ObjPermiso.efecto === "DENY") return { permitido: false, origen: "DENEGADO_DIRECTAMENTE" as OrigenAcceso };
  if (ObjPermiso.efecto === "ALLOW") return { permitido: true, origen: "PERMITIDO_DIRECTAMENTE" as OrigenAcceso };
  if (ObjPermiso.heredado) return { permitido: true, origen: "HEREDADO_DEL_ROL" as OrigenAcceso };
  return { permitido: false, origen: "SIN_ACCESO" as OrigenAcceso };
}

export function Usuarios_resolverCodigos(ObjCuenta: { rol: { rolesPermisos: Array<{ permiso: { codigo: string; activo: boolean } }> }; permisosDirectos: Array<{ efecto: string; permiso: { codigo: string; activo: boolean } }> }): string[] {
  const ObjEfectos = new Map(ObjCuenta.permisosDirectos.map((Obj) => [Obj.permiso.codigo, Obj]));
  const ObjCatalogo = new Map<string, { activo: boolean; heredado: boolean }>();
  for (const Obj of ObjCuenta.rol.rolesPermisos) ObjCatalogo.set(Obj.permiso.codigo, { activo: Obj.permiso.activo, heredado: true });
  for (const Obj of ObjCuenta.permisosDirectos) if (!ObjCatalogo.has(Obj.permiso.codigo)) ObjCatalogo.set(Obj.permiso.codigo, { activo: Obj.permiso.activo, heredado: false });
  return [...ObjCatalogo].filter(([StrCodigo, Obj]) => Usuarios_resolverPermiso({ ...Obj, efecto: ObjEfectos.get(StrCodigo)?.efecto }).permitido).map(([StrCodigo]) => StrCodigo);
}
