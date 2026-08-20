const ObjFormatoFechaHoraGuatemala = new Intl.DateTimeFormat("es-GT", {
  timeZone: "America/Guatemala",
  dateStyle: "medium",
  timeStyle: "short",
  hour12: false,
});

export function Fecha_formatearTimestampGuatemala(StrTimestamp: string): string {
  const DtInstante = new Date(StrTimestamp);
  if (Number.isNaN(DtInstante.getTime())) throw new RangeError("El timestamp no es válido.");
  return ObjFormatoFechaHoraGuatemala.format(DtInstante);
}

export function Fecha_validarFechaCivil(StrFecha: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(StrFecha)) throw new RangeError("La fecha civil no es válida.");
  return StrFecha;
}
