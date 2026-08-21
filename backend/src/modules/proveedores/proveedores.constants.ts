export const ArrCatalogoPermisosProveedores = [
  { StrCodigo: "PROVEEDORES_CONSULTAR", StrNombre: "Consultar proveedores", StrAccion: "CONSULTAR" },
  { StrCodigo: "PROVEEDORES_CREAR", StrNombre: "Crear proveedores", StrAccion: "CREAR" },
  { StrCodigo: "PROVEEDORES_EDITAR", StrNombre: "Editar proveedores", StrAccion: "EDITAR" },
  { StrCodigo: "PROVEEDORES_CAMBIAR_ESTADO", StrNombre: "Cambiar estado de proveedores", StrAccion: "CAMBIAR_ESTADO" },
] as const;
export const ArrCatalogoTiposProveedores = [
  { StrCodigo: "PERSONA_INDIVIDUAL", StrNombre: "Persona individual" },
  { StrCodigo: "PERSONA_JURIDICA", StrNombre: "Persona juridica" },
] as const;
export function Proveedores_canonicalizarIdentificacion(StrValor: string | null | undefined): string | null {
  if (StrValor === undefined || StrValor === null) return null;
  const StrCanonico = StrValor.trim().replace(/[\s-]+/g, "").toUpperCase();
  return StrCanonico.length === 0 ? null : StrCanonico;
}
