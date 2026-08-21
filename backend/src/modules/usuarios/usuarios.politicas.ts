import { ObjRolesUsuarios } from "./usuarios.constants.js";

export type OperacionAdministrativaUsuario =
  | "EDITAR"
  | "CAMBIAR_ESTADO"
  | "CAMBIAR_ROL"
  | "REVOCAR_SESIONES";

export function Usuarios_esRolReservado(StrNombreRol: string): boolean {
  return StrNombreRol === ObjRolesUsuarios.WEBMASTER;
}

export function Usuarios_puedeOperarSobreCuenta(
  IntUsuarioActorId: number,
  StrRolActor: string,
  IntUsuarioObjetivoId: number,
  StrRolObjetivo: string,
  StrOperacion: OperacionAdministrativaUsuario,
): boolean {
  if (StrRolObjetivo !== ObjRolesUsuarios.WEBMASTER) {
    return true;
  }

  const BoolEsMismaCuenta = IntUsuarioActorId === IntUsuarioObjetivoId;
  const BoolActorEsWebmaster = StrRolActor === ObjRolesUsuarios.WEBMASTER;
  return BoolEsMismaCuenta && BoolActorEsWebmaster &&
    (StrOperacion === "EDITAR" || StrOperacion === "REVOCAR_SESIONES");
}

export function Usuarios_obtenerIdsFaltantes(
  ArrIdsEsperados: readonly number[],
  ArrIdsExistentes: readonly number[],
): number[] {
  const ObjIdsExistentes = new Set(ArrIdsExistentes);
  return ArrIdsEsperados.filter((IntId) => !ObjIdsExistentes.has(IntId));
}
