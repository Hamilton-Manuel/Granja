const StrZonaHorariaGuatemala = "America/Guatemala";

const ObjFormateadorComponentes = new Intl.DateTimeFormat("en-CA", {
  timeZone: StrZonaHorariaGuatemala,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
  hourCycle: "h23",
});

interface FechaComponentes {
  IntAnio: number;
  IntMes: number;
  IntDia: number;
  IntHora: number;
  IntMinuto: number;
  IntSegundo: number;
  IntMilisegundo: number;
}

function Fecha_validar(DtFecha: Date): void {
  if (Number.isNaN(DtFecha.getTime())) {
    throw new RangeError("La fecha proporcionada no es válida.");
  }
}

function Fecha_obtenerComponentesGuatemala(DtInstante: Date): FechaComponentes {
  Fecha_validar(DtInstante);
  const ObjPartes = Object.fromEntries(
    ObjFormateadorComponentes
      .formatToParts(DtInstante)
      .filter((ObjParte) => ObjParte.type !== "literal")
      .map((ObjParte) => [ObjParte.type, ObjParte.value]),
  );

  return {
    IntAnio: Number(ObjPartes.year),
    IntMes: Number(ObjPartes.month),
    IntDia: Number(ObjPartes.day),
    IntHora: Number(ObjPartes.hour),
    IntMinuto: Number(ObjPartes.minute),
    IntSegundo: Number(ObjPartes.second),
    IntMilisegundo: Number(ObjPartes.fractionalSecond ?? "0"),
  };
}

function Fecha_componentesAEpoch(ObjComponentes: FechaComponentes): number {
  return Date.UTC(
    ObjComponentes.IntAnio,
    ObjComponentes.IntMes - 1,
    ObjComponentes.IntDia,
    ObjComponentes.IntHora,
    ObjComponentes.IntMinuto,
    ObjComponentes.IntSegundo,
    ObjComponentes.IntMilisegundo,
  );
}

function Fecha_obtenerComponentesAlmacenados(DtFecha: Date): FechaComponentes {
  Fecha_validar(DtFecha);
  return {
    IntAnio: DtFecha.getUTCFullYear(),
    IntMes: DtFecha.getUTCMonth() + 1,
    IntDia: DtFecha.getUTCDate(),
    IntHora: DtFecha.getUTCHours(),
    IntMinuto: DtFecha.getUTCMinutes(),
    IntSegundo: DtFecha.getUTCSeconds(),
    IntMilisegundo: DtFecha.getUTCMilliseconds(),
  };
}

function Fecha_rellenar(IntValor: number, IntLongitud = 2): string {
  return String(IntValor).padStart(IntLongitud, "0");
}

export function Fecha_obtenerInstanteActual(): Date {
  return new Date();
}

export function Fecha_convertirInstanteAAlmacenamientoGuatemala(
  DtInstante: Date,
): Date {
  return new Date(
    Fecha_componentesAEpoch(Fecha_obtenerComponentesGuatemala(DtInstante)),
  );
}

export function Fecha_obtenerAhoraGuatemala(): Date {
  return Fecha_convertirInstanteAAlmacenamientoGuatemala(
    Fecha_obtenerInstanteActual(),
  );
}

export function Fecha_obtenerRangoMesActualGuatemala(DtInstante = Fecha_obtenerInstanteActual()): {
  DtInicio: Date;
  DtFinExclusivo: Date;
  DtFinInclusivo: Date;
} {
  const DtAhoraGuatemala = Fecha_convertirInstanteAAlmacenamientoGuatemala(DtInstante);
  const IntAnio = DtAhoraGuatemala.getUTCFullYear();
  const IntMes = DtAhoraGuatemala.getUTCMonth();
  const DtInicio = new Date(Date.UTC(IntAnio, IntMes, 1));
  const DtFinExclusivo = new Date(Date.UTC(IntAnio, IntMes + 1, 1));
  const DtFinInclusivo = new Date(Date.UTC(IntAnio, IntMes + 1, 0));
  return { DtInicio, DtFinExclusivo, DtFinInclusivo };
}

export function Fecha_convertirAlmacenamientoGuatemalaAInstante(
  DtFechaAlmacenada: Date,
): Date {
  const ObjObjetivo = Fecha_obtenerComponentesAlmacenados(DtFechaAlmacenada);
  const IntEpochObjetivo = Fecha_componentesAEpoch(ObjObjetivo);
  let IntEpochCandidato = IntEpochObjetivo;

  for (let IntIntento = 0; IntIntento < 4; IntIntento += 1) {
    const ObjMostrado = Fecha_obtenerComponentesGuatemala(
      new Date(IntEpochCandidato),
    );
    const IntDiferencia = IntEpochObjetivo - Fecha_componentesAEpoch(ObjMostrado);
    IntEpochCandidato += IntDiferencia;
    if (IntDiferencia === 0) break;
  }

  const DtResultado = new Date(IntEpochCandidato);
  if (
    Fecha_componentesAEpoch(Fecha_obtenerComponentesGuatemala(DtResultado)) !==
    IntEpochObjetivo
  ) {
    throw new RangeError("La fecha local de Guatemala no pudo resolverse.");
  }
  return DtResultado;
}

export function Fecha_calcularExpiracionGuatemala(
  DtInstanteInicio: Date,
  IntHoras: number,
): {
  DtExpiracionInstante: Date;
  DtExpiracionAlmacenamiento: Date;
} {
  Fecha_validar(DtInstanteInicio);
  if (!Number.isFinite(IntHoras) || IntHoras <= 0) {
    throw new RangeError("La duración debe ser un número positivo de horas.");
  }
  const DtExpiracionInstante = new Date(
    DtInstanteInicio.getTime() + IntHoras * 60 * 60 * 1_000,
  );
  return {
    DtExpiracionInstante,
    DtExpiracionAlmacenamiento:
      Fecha_convertirInstanteAAlmacenamientoGuatemala(DtExpiracionInstante),
  };
}

export function Fecha_compararInstantes(
  DtPrimerInstante: Date,
  DtSegundoInstante: Date,
): number {
  Fecha_validar(DtPrimerInstante);
  Fecha_validar(DtSegundoInstante);
  return Math.sign(DtPrimerInstante.getTime() - DtSegundoInstante.getTime());
}

export function Fecha_formatearInstanteGuatemala(DtInstante: Date): string {
  const ObjComponentes = Fecha_obtenerComponentesGuatemala(DtInstante);
  const IntEpochLocal = Fecha_componentesAEpoch(ObjComponentes);
  const IntOffsetMinutos = Math.round(
    (IntEpochLocal - DtInstante.getTime()) / 60_000,
  );
  const StrSigno = IntOffsetMinutos >= 0 ? "+" : "-";
  const IntOffsetAbsoluto = Math.abs(IntOffsetMinutos);
  return `${Fecha_rellenar(ObjComponentes.IntAnio, 4)}-${Fecha_rellenar(ObjComponentes.IntMes)}-${Fecha_rellenar(ObjComponentes.IntDia)}T${Fecha_rellenar(ObjComponentes.IntHora)}:${Fecha_rellenar(ObjComponentes.IntMinuto)}:${Fecha_rellenar(ObjComponentes.IntSegundo)}.${Fecha_rellenar(ObjComponentes.IntMilisegundo, 3)}${StrSigno}${Fecha_rellenar(Math.floor(IntOffsetAbsoluto / 60))}:${Fecha_rellenar(IntOffsetAbsoluto % 60)}`;
}

export function Fecha_parsearFechaCivil(StrFecha: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(StrFecha)) {
    throw new RangeError("La fecha civil debe utilizar el formato YYYY-MM-DD.");
  }
  const [StrAnio, StrMes, StrDia] = StrFecha.split("-");
  const DtFecha = new Date(Date.UTC(Number(StrAnio), Number(StrMes) - 1, Number(StrDia)));
  if (Fecha_formatearFechaCivil(DtFecha) !== StrFecha) {
    throw new RangeError("La fecha civil no existe.");
  }
  return DtFecha;
}

export function Fecha_formatearFechaCivil(DtFecha: Date): string {
  Fecha_validar(DtFecha);
  return `${Fecha_rellenar(DtFecha.getUTCFullYear(), 4)}-${Fecha_rellenar(DtFecha.getUTCMonth() + 1)}-${Fecha_rellenar(DtFecha.getUTCDate())}`;
}

export function Fecha_parsearFechaHoraGuatemala(StrFecha: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-06:00$/.test(StrFecha)) {
    throw new RangeError(
      "La fecha y hora debe ser ISO-8601 con el offset de Guatemala.",
    );
  }
  const DtInstante = new Date(StrFecha);
  Fecha_validar(DtInstante);
  if (Fecha_formatearInstanteGuatemala(DtInstante) !== StrFecha) {
    throw new RangeError("La fecha y hora no corresponde a Guatemala.");
  }
  return DtInstante;
}

export function Fecha_crearRangoDiaGuatemala(StrFecha: string): {
  DtInicioAlmacenamiento: Date;
  DtFinExclusivoAlmacenamiento: Date;
  DtInicioInstante: Date;
  DtFinExclusivoInstante: Date;
} {
  const DtInicioAlmacenamiento = Fecha_parsearFechaCivil(StrFecha);
  const DtFinExclusivoAlmacenamiento = new Date(
    Date.UTC(
      DtInicioAlmacenamiento.getUTCFullYear(),
      DtInicioAlmacenamiento.getUTCMonth(),
      DtInicioAlmacenamiento.getUTCDate() + 1,
    ),
  );
  return {
    DtInicioAlmacenamiento,
    DtFinExclusivoAlmacenamiento,
    DtInicioInstante: Fecha_convertirAlmacenamientoGuatemalaAInstante(
      DtInicioAlmacenamiento,
    ),
    DtFinExclusivoInstante: Fecha_convertirAlmacenamientoGuatemalaAInstante(
      DtFinExclusivoAlmacenamiento,
    ),
  };
}
