import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { Alimentacion_mensajeError } from "../../hooks/useAlimentacion";
import type { ConsultaConcentrados, ListaConcentrados } from "../../types/concentrados.types";
import { useSesion } from "../../hooks/useSesion";
import { ArrGruposUnidadesInventario } from "../../utils/unidadesInventario";
import { Inventario_formatearDecimal } from "../../utils/inventario";
import type { CatalogosConcentrados, ElaboracionConcentrado } from "../../types/concentrados.types";
import { Fecha_formatearTimestampGuatemala } from "../../utils/fecha";

export const ArrPermisosConcentrados = ["ALIMENTACION_CONCENTRADOS_CONSULTAR", "ALIMENTACION_RECETAS_GESTIONAR", "ALIMENTACION_ELABORACIONES_REGISTRAR", "ALIMENTACION_ELABORACIONES_CONSULTAR", "ALIMENTACION_ELABORACIONES_REVERTIR"];
export function LayoutConcentrados() {
  const { Autenticacion_tienePermiso: P } = useSesion();
  return <div className="alimentacion-contenido concentrados-contenido">
    <nav className="alimentacion-navegacion" aria-label="Secciones de Concentrados">
      {P("ALIMENTACION_CONCENTRADOS_CONSULTAR") && <><NavLink end to="/alimentacion/concentrados">Concentrados</NavLink><NavLink to="/alimentacion/concentrados/recetas">Recetas</NavLink></>}
      {P("ALIMENTACION_CONCENTRADOS_CONSULTAR") && P("ALIMENTACION_ELABORACIONES_REGISTRAR") && <NavLink to="/alimentacion/concentrados/elaborar">Elaborar</NavLink>}
      {P("ALIMENTACION_ELABORACIONES_CONSULTAR") && <NavLink to="/alimentacion/concentrados/historial">Historial de elaboraciones</NavLink>}
    </nav><Outlet />
  </div>;
}
/** Presentación exacta: el helper existente cubre 18 decimales; costos totales admiten 24. */
export function Alimentacion_decimal(StrValor: string): string {
  if (/^-?\d+(?:\.\d{1,18})?$/.test(StrValor)) return Inventario_formatearDecimal(StrValor);
  return StrValor.includes(".") && !/[eE]/.test(StrValor) ? StrValor.replace(/0+$/, "").replace(/\.$/, "") : StrValor;
}
export const Alimentacion_cantidadValida = (Str: string) => /^(?!0+(?:\.0+)?$)\d{1,18}(?:\.\d{1,6})?$/.test(Str);
export function UnidadConcentrado({ StrEtiqueta, StrValor, ArrUnidades, Alimentacion_cambiar }: { StrEtiqueta: string; StrValor: string; ArrUnidades: CatalogosConcentrados["unidades"]; Alimentacion_cambiar: (Str: string) => void }) {
  return <label>{StrEtiqueta}<select required value={StrValor} onChange={E => Alimentacion_cambiar(E.target.value)}><option value="">Seleccione</option>
    {StrValor && !ArrUnidades.some(Obj => Obj.codigo === StrValor) && <option value={StrValor}>{StrValor} (no disponible)</option>}
    {ArrUnidades.map(Obj => <option key={Obj.codigo} value={Obj.codigo}>{ArrGruposUnidadesInventario[0].ArrUnidades.find(U => U.StrValor === Obj.codigo)?.StrEtiqueta ?? Obj.codigo}</option>)}
  </select></label>;
}
export function ResumenConcentrado({ Obj }: { Obj: ElaboracionConcentrado }) {
  return <div className="alimentacion-resumen-confirmacion">
    <h3>{Obj.codigoProductoSnapshot} · {Obj.nombreProductoSnapshot}</h3>
    <p>Elaboración #{Obj.elaboracionId} · {Obj.estado}</p>
    <p>Cantidad obtenida: {Alimentacion_decimal(Obj.cantidadRealBase)} {Obj.unidadBaseSnapshot}</p>
    <p>Lote generado: {Obj.lote?.codigoLote ?? `#${Obj.loteInventarioId}`}</p>
    {Obj.almacenDestino && <p>Almacén destino: {Obj.almacenDestino.codigo} · {Obj.almacenDestino.nombre}</p>}
    <p>Costo de materias primas: Q{Alimentacion_decimal(Obj.costoTotal)}</p>
    <p>Costo unitario: Q{Alimentacion_decimal(Obj.costoUnitario)} / {Obj.unidadBaseSnapshot}</p>
    <p>Residual de valoración: Q{Alimentacion_decimal(Obj.residualValoracion)}</p>
    <p>Fecha: {Fecha_formatearTimestampGuatemala(Obj.fechaEfectiva)}</p>
  </div>;
}

export function useConcentradosLista<T>(Alimentacion_listar: (Obj: ConsultaConcentrados) => Promise<ListaConcentrados<T>>, IntConcentradoId?: number) {
  const [ObjConsulta, establecerConsulta] = useState<ConsultaConcentrados>({ pagina: 1, limite: 20, concentradoId: IntConcentradoId });
  const [ArrDatos, establecerDatos] = useState<T[]>([]);
  const [IntTotal, establecerTotal] = useState(0);
  const [BoolCargando, establecerCargando] = useState(true);
  const [StrError, establecerError] = useState<string | null>(null);
  const [IntRevision, establecerRevision] = useState(0);
  useEffect(() => { establecerConsulta(Obj => Obj.concentradoId === IntConcentradoId ? Obj : { ...Obj, pagina: 1, concentradoId: IntConcentradoId }); }, [IntConcentradoId]);
  useEffect(() => {
    let BoolVigente = true;
    establecerCargando(true); establecerError(null);
    void Alimentacion_listar(ObjConsulta).then(Obj => { if (BoolVigente) { establecerDatos(Obj.datos); establecerTotal(Obj.paginacion.total); } })
      .catch(E => { if (BoolVigente) establecerError(Alimentacion_mensajeError(E)); })
      .finally(() => { if (BoolVigente) establecerCargando(false); });
    return () => { BoolVigente = false; };
  }, [Alimentacion_listar, ObjConsulta, IntRevision]);
  return { ObjConsulta, establecerConsulta, ArrDatos, IntTotal, BoolCargando, StrError, Alimentacion_recargar: () => establecerRevision(Int => Int + 1) };
}
