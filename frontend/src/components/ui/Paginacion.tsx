interface PropiedadesPaginacion {
  IntPagina: number;
  IntTotalPaginas: number;
  BoolDeshabilitada?: boolean;
  Usuarios_cambiarPagina: (IntPagina: number) => void;
}

export function Paginacion({ IntPagina, IntTotalPaginas, BoolDeshabilitada = false, Usuarios_cambiarPagina }: PropiedadesPaginacion) {
  if (IntTotalPaginas <= 1) return null;
  return (
    <nav className="paginacion" aria-label="Paginación de usuarios">
      <button type="button" className="boton-secundario" disabled={BoolDeshabilitada || IntPagina === 1} onClick={() => Usuarios_cambiarPagina(IntPagina - 1)}>Anterior</button>
      <span>Página {IntPagina} de {IntTotalPaginas}</span>
      <button type="button" className="boton-secundario" disabled={BoolDeshabilitada || IntPagina === IntTotalPaginas} onClick={() => Usuarios_cambiarPagina(IntPagina + 1)}>Siguiente</button>
    </nav>
  );
}
