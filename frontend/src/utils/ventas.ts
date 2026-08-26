import type { DecimalVentas, FormaPagoVenta } from "../types/ventas.types";

const IntEscalaVentas = 2;
const IntFactorVentas = 100n;

export function Ventas_decimalValido(StrValor: string): boolean { return /^(?!0+(?:\.0{1,2})?$)\d{1,14}(?:\.\d{1,2})?$/.test(StrValor.trim()); }
export function Ventas_decimalEscalado(StrValor: DecimalVentas): bigint {
  if (!/^\d+(?:\.\d{1,2})?$/.test(StrValor.trim())) throw new RangeError("Monto de Ventas no válido.");
  const [StrEntero, StrFraccion = ""] = StrValor.trim().split(".");
  return BigInt(StrEntero) * IntFactorVentas + BigInt(StrFraccion.padEnd(IntEscalaVentas, "0"));
}
export function Ventas_sumarMontos(ArrMontos: DecimalVentas[]): DecimalVentas {
  const IntTotal = ArrMontos.reduce((IntSuma, StrMonto) => IntSuma + Ventas_decimalEscalado(StrMonto), 0n);
  return `${IntTotal / IntFactorVentas}.${(IntTotal % IntFactorVentas).toString().padStart(IntEscalaVentas, "0")}`;
}
export function Ventas_formatearMoneda(StrMonto: DecimalVentas): string {
  const StrNormalizado = Ventas_sumarMontos([StrMonto]); const [StrEntero, StrFraccion] = StrNormalizado.split(".");
  return `Q${BigInt(StrEntero!).toLocaleString("es-GT")}.${StrFraccion}`;
}
export function Ventas_formatearRecibo(StrSerie: string, IntNumero: number): string { return `${StrSerie}-${String(IntNumero).padStart(6, "0")}`; }
export function Ventas_normalizarBusquedaRecibo(StrBusqueda: string): string { const ObjRecibo=/^[^-]+-(\d+)$/.exec(StrBusqueda.trim()); return ObjRecibo?String(BigInt(ObjRecibo[1]!)):StrBusqueda.trim(); }
export function Ventas_etiquetaFormaPago(StrForma: FormaPagoVenta): string { return ({ EFECTIVO:"Efectivo", TRANSFERENCIA:"Transferencia", DEPOSITO:"Depósito", CREDITO:"Crédito" })[StrForma]; }
export function Ventas_fechaHoraLocalActual(): string {
  const ObjPartes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone:"America/Guatemala",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23" }).formatToParts(new Date()).filter(ObjParte=>ObjParte.type!=="literal").map(ObjParte=>[ObjParte.type,ObjParte.value]));
  return `${ObjPartes.year}-${ObjPartes.month}-${ObjPartes.day}T${ObjPartes.hour}:${ObjPartes.minute}`;
}
