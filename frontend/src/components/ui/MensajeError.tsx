interface PropiedadesMensajeError {
  StrMensaje: string;
  StrTitulo?: string;
}

export function MensajeError({
  StrMensaje,
  StrTitulo = "No fue posible completar la operación",
}: PropiedadesMensajeError) {
  return (
    <div className="mensaje-error" role="alert">
      <strong>{StrTitulo}</strong>
      <span>{StrMensaje}</span>
    </div>
  );
}
