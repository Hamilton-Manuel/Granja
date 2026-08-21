export const ArrCatalogoPermisosClientes = [
  { StrCodigo: "CLIENTES_CONSULTAR", StrNombre: "Consultar clientes", StrAccion: "CONSULTAR" },
  { StrCodigo: "CLIENTES_CREAR", StrNombre: "Crear clientes", StrAccion: "CREAR" },
  { StrCodigo: "CLIENTES_EDITAR", StrNombre: "Editar clientes", StrAccion: "EDITAR" },
  { StrCodigo: "CLIENTES_CAMBIAR_ESTADO", StrNombre: "Cambiar estado de clientes", StrAccion: "CAMBIAR_ESTADO" },
] as const;

export const ArrCatalogoTiposClientes = [
  { StrCodigo: "PERSONA_INDIVIDUAL", StrNombre: "Persona individual" },
  { StrCodigo: "PERSONA_JURIDICA", StrNombre: "Persona juridica" },
] as const;

export function Clientes_canonicalizarIdentificacion(StrValor: string | null | undefined): string | null {
  if (StrValor === undefined || StrValor === null) return null;
  const StrCanonico = StrValor.trim().replace(/[\s-]+/g, "").toUpperCase();
  return StrCanonico.length === 0 ? null : StrCanonico;
}
