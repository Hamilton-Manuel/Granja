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

export function Fecha_formatearMesCivil(StrMes: string): string {
  const ObjCoincidencia = /^(\d{4})-(\d{2})$/.exec(StrMes);
  if (!ObjCoincidencia) throw new RangeError("El mes civil no es válido.");
  return new Intl.DateTimeFormat("es-GT", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Number(ObjCoincidencia[1]), Number(ObjCoincidencia[2]) - 1, 1))).replace(".", "");
}

export function Fecha_datetimeLocalAContratoGuatemala(StrFechaHora:string):string{
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(StrFechaHora))throw new RangeError("La fecha y hora civil no es válida.");
  return `${StrFechaHora}:00.000-06:00`;
}
