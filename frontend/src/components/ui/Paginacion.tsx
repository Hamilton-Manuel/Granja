interface PropiedadesPaginacion {
  IntPagina: number;
  IntTotalPaginas: number;
  BoolDeshabilitada?: boolean;
  Usuarios_cambiarPagina: (IntPagina: number) => void;
  StrEtiqueta?: string;
}

export function Paginacion({ IntPagina, IntTotalPaginas, BoolDeshabilitada = false, Usuarios_cambiarPagina, StrEtiqueta = "Paginación de resultados" }: PropiedadesPaginacion) {
  if (IntTotalPaginas <= 1) return null;
  return (
    <nav className="paginacion" aria-label={StrEtiqueta}>
      <button type="button" className="boton-secundario" disabled={BoolDeshabilitada || IntPagina === 1} onClick={() => Usuarios_cambiarPagina(IntPagina - 1)}>Anterior</button>
      <span>Página {IntPagina} de {IntTotalPaginas}</span>
      <button type="button" className="boton-secundario" disabled={BoolDeshabilitada || IntPagina === IntTotalPaginas} onClick={() => Usuarios_cambiarPagina(IntPagina + 1)}>Siguiente</button>
    </nav>
  );
}
