import type { EstadoUsuario } from "../../types/usuarios.types";

export function InsigniaEstado({ StrEstado }: { StrEstado: EstadoUsuario }) {
  return <span className={`insignia-estado insignia-estado--${StrEstado.toLowerCase()}`}>{StrEstado === "ACTIVO" ? "Activo" : "Inactivo"}</span>;
}
