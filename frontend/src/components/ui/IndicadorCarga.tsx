interface PropiedadesIndicadorCarga {
  StrMensaje?: string;
}

export function IndicadorCarga({ StrMensaje = "Cargando…" }: PropiedadesIndicadorCarga) {
  return (
    <div className="estado-pantalla" role="status" aria-live="polite">
      <span className="indicador-carga" aria-hidden="true" />
      <p>{StrMensaje}</p>
    </div>
  );
}
