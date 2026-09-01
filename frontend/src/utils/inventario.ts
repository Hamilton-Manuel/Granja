import type { DecimalInventario, LoteInventario, LoteResumen } from "../types/inventario.types";

const IntEscalaCaptura = 4;
// Escala máxima persistida por Inventario: costo_unitario es DECIMAL(38,18).
const IntEscalaPersistida = 18;
const IntFactor = 10n ** BigInt(IntEscalaPersistida);
const ObjDecimalPersistido = /^-?\d+(?:\.\d{1,18})?$/;

export function Inventario_decimalValido(StrValor: string, BoolPermitirNegativo = false): boolean {
  return new RegExp(`^${BoolPermitirNegativo ? "-?" : ""}\\d+(?:\\.\\d{1,${IntEscalaCaptura}})?$`).test(StrValor.trim());
}

export function Inventario_decimalEscalado(StrValor: DecimalInventario): bigint {
  if (!ObjDecimalPersistido.test(StrValor)) throw new RangeError("Decimal de Inventario no válido.");
  const BoolNegativo = StrValor.startsWith("-");
  const [StrEntero, StrFraccion = ""] = StrValor.replace("-", "").split(".");
  const IntValor = BigInt(StrEntero) * IntFactor + BigInt(StrFraccion.padEnd(IntEscalaPersistida, "0"));
  return BoolNegativo ? -IntValor : IntValor;
}

export function Inventario_formatearDecimal(StrValor: DecimalInventario | null): string {
  if (StrValor === null) return "—";
  const IntValor = Inventario_decimalEscalado(StrValor);
  const BoolNegativo = IntValor < 0n;
  const IntAbsoluto = BoolNegativo ? -IntValor : IntValor;
  const StrEntero = (IntAbsoluto / IntFactor).toString();
  const StrFraccion = (IntAbsoluto % IntFactor).toString().padStart(IntEscalaPersistida, "0").replace(/0+$/, "");
  return `${BoolNegativo ? "−" : ""}${StrEntero}${StrFraccion ? `.${StrFraccion}` : ""}`;
}

export function Inventario_fechaCivilHoyGuatemala(): string {
  const ArrPartes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const Inventario_parte = (StrTipo: Intl.DateTimeFormatPartTypes) => ArrPartes.find((ObjParte) => ObjParte.type === StrTipo)?.value ?? "";
  return `${Inventario_parte("year")}-${Inventario_parte("month")}-${Inventario_parte("day")}`;
}

export function Inventario_formatearFechaCivil(StrFecha: string | null): string {
  if (StrFecha === null) return "Sin vencimiento";
  const ObjCoincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(StrFecha);
  if (!ObjCoincidencia) return "Fecha inválida";
  return `${ObjCoincidencia[3]}/${ObjCoincidencia[2]}/${ObjCoincidencia[1]}`;
}

export function Inventario_estadoLote(ObjLote: LoteResumen | LoteInventario): "INACTIVO" | "VENCIDO" | "AGOTADO" | "ACTIVO" {
  if (!ObjLote.activo) return "INACTIVO";
  if (ObjLote.fechaVencimiento && ObjLote.fechaVencimiento.slice(0, 10) < Inventario_fechaCivilHoyGuatemala()) return "VENCIDO";
  if ("existencias" in ObjLote && ObjLote.existencias.every((ObjExistencia) => Inventario_decimalEscalado(ObjExistencia.existenciaActual) === 0n)) return "AGOTADO";
  return "ACTIVO";
}

export function Inventario_opcional(StrValor: string): string | null { return StrValor.trim() || null; }
