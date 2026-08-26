export const ArrCatalogoPermisosVentas = [
  ["VENTAS_CONSULTAR", "Consultar ventas", "CONSULTAR"],
  ["VENTAS_REGISTRAR", "Registrar ventas", "CREAR"],
  ["VENTAS_REVERTIR", "Revertir ventas", "REVERTIR"],
  ["VENTAS_RECONCILIACION_EJECUTAR", "Diagnosticar consistencia de ventas", "EJECUTAR"],
].map(([StrCodigo, StrNombre, StrAccion]) => ({ StrCodigo: StrCodigo!, StrNombre: StrNombre!, StrAccion: StrAccion! }));
export const ArrPermisosVentasOperador = ["VENTAS_CONSULTAR", "VENTAS_REGISTRAR"] as const;
export const ArrFormasPagoVentas = ["EFECTIVO", "TRANSFERENCIA", "DEPOSITO", "CREDITO"] as const;
export const StrSerieInicialVentas = "A";
