import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSesion } from "../../hooks/useSesion";
import { Alimentacion_mensajeError } from "../../hooks/useAlimentacion";
import { MensajeError } from "../../components/ui/MensajeError";
import { IndicadorCarga } from "../../components/ui/IndicadorCarga";
import { Modal } from "../../components/ui/Modal";
import { ResumenConcentrado, Alimentacion_decimal as D } from "../../components/alimentacion/ConcentradosCompartidos";
import { Fecha_formatearTimestampGuatemala } from "../../utils/fecha";
import * as S from "../../services/concentrados.service";
import type { ElaboracionConcentrado, DependenciasConcentrado } from "../../types/concentrados.types";

export function PaginaDetalleConcentrado() {
  const IntId = Number(useParams().elaboracionId);
  const { Autenticacion_tienePermiso: P } = useSesion();
  const [ObjDetalle, establecerDetalle] = useState<ElaboracionConcentrado | null>(null);
  const [ObjDependencias, establecerDependencias] = useState<DependenciasConcentrado | null>(null);
  const [StrError, establecerError] = useState<string | null>(null);
  const [StrMotivo, establecerMotivo] = useState("");
  const [BoolConfirmar, establecerConfirmar] = useState(false);
  const [BoolProcesando, establecerProcesando] = useState(false);
  const [BoolCargando, establecerCargando] = useState(true);
  const RefProcesando = useRef(false);
  useEffect(() => { let BoolVigente = true; establecerCargando(true); establecerDetalle(null); establecerDependencias(null); establecerError(null);
    void S.Alimentacion_detalleConcentrado(IntId).then(Obj => { if (BoolVigente) establecerDetalle(Obj); }).catch(E => { if (BoolVigente) establecerError(Alimentacion_mensajeError(E)); }).finally(() => { if (BoolVigente) establecerCargando(false); });
    return () => { BoolVigente = false; };
  }, [IntId]);
  async function Alimentacion_dependencias() {
    if (RefProcesando.current) return;
    RefProcesando.current = true; establecerProcesando(true); establecerError(null); establecerDependencias(null);
    try { establecerDependencias(await S.Alimentacion_dependenciasConcentrado(IntId)); }
    catch (E) { establecerError(Alimentacion_mensajeError(E)); } finally { RefProcesando.current = false; establecerProcesando(false); }
  }
  async function Alimentacion_revertir() {
    if (!StrMotivo.trim() || !ObjDependencias?.reversible || RefProcesando.current) return;
    RefProcesando.current = true; establecerProcesando(true); establecerError(null);
    try {
      const Obj = await S.Alimentacion_revertirConcentrado(IntId, StrMotivo.trim());
      establecerDetalle(ObjAnterior => ObjAnterior ? { ...ObjAnterior, ...Obj.datos, detalles: ObjAnterior.detalles } : Obj.datos);
      establecerConfirmar(false); establecerDependencias(null); establecerMotivo("");
    } catch (E) {
      establecerError(Alimentacion_mensajeError(E)); establecerConfirmar(false); establecerDependencias(null);
      // El diagnóstico puede haber cambiado después de la consulta inicial. Nunca habilitar con datos viejos.
      try { establecerDependencias(await S.Alimentacion_dependenciasConcentrado(IntId)); } catch { /* Se exige consultar otra vez. */ }
    } finally { RefProcesando.current = false; establecerProcesando(false); }
  }
  return <section className="alimentacion-contenido"><header className="alimentacion-seccion-encabezado"><h2>Detalle de elaboración #{IntId}</h2><Link to="/alimentacion/concentrados/historial">Volver al historial</Link></header>
    {StrError && <MensajeError StrMensaje={StrError} />}{BoolCargando && <IndicadorCarga StrMensaje="Cargando elaboración…" />}
    {ObjDetalle && <><ResumenConcentrado Obj={ObjDetalle} /><p>Receta histórica: {ObjDetalle.nombreRecetaSnapshot} · versión {ObjDetalle.versionReceta}</p><p>Responsable: {ObjDetalle.usuario?.nombreCompleto ?? `#${ObjDetalle.usuarioId}`}</p>
      <p>Cantidad teórica: {D(ObjDetalle.cantidadTeorica)} {ObjDetalle.unidadCaptura} · Cantidad real: {D(ObjDetalle.cantidadReal)} {ObjDetalle.unidadCaptura}</p>
      <p>Movimiento de ingreso: #{ObjDetalle.transaccionIngresoId}</p>
      {ObjDetalle.motivoDiferencia && <p>Justificación de diferencia: {ObjDetalle.motivoDiferencia}</p>}{ObjDetalle.observaciones && <p>Observaciones: {ObjDetalle.observaciones}</p>}
      <h3>Materias primas consumidas</h3><div className="alimentacion-tabla"><table><thead><tr><th>Ingrediente</th><th>Cantidad consumida</th><th>Fuentes y costos históricos</th></tr></thead><tbody>{ObjDetalle.detalles.map(Obj => <tr key={Obj.elaboracionDetalleId}><td>{Obj.codigoProductoSnapshot} · {Obj.nombreProductoSnapshot}</td><td>{D(Obj.cantidadConsumida)} {Obj.unidadBaseSnapshot}</td><td><ul className="alimentacion-detalles">{Obj.fuentes.map(F => <li key={F.elaboracionFuenteId}><strong>{F.almacen?.nombre ?? "Almacén"} · Lote {F.lote?.codigoLote ?? `fuente #${F.existenciaLoteId}`}</strong><span>{D(F.cantidadConsumida)} {Obj.unidadBaseSnapshot} · Q{D(F.costoUnitarioHistorico)} / {Obj.unidadBaseSnapshot}</span><span>Importe: Q{D(F.costoTotal)} · Movimiento #{F.transaccionConsumoId}</span></li>)}</ul></td></tr>)}</tbody></table></div>
      {ObjDetalle.estado === "REVERTIDA" ? <p role="status" className="alimentacion-aviso">Elaboración revertida{ObjDetalle.fechaReversion ? ` el ${Fecha_formatearTimestampGuatemala(ObjDetalle.fechaReversion)}` : ""}. Motivo: {ObjDetalle.motivoReversion}</p> : <>
        <button disabled={BoolProcesando} onClick={() => void Alimentacion_dependencias()}>Consultar dependencias</button>
        {ObjDependencias && <section aria-label="Dependencias de elaboración"><h3>{ObjDependencias.reversible ? "Reversión disponible" : "Reversión bloqueada"}</h3>
          <ul>{ObjDependencias.bloqueos.map(B => <li key={B.codigo}>{B.mensaje}</li>)}</ul>
          <ul className="alimentacion-detalles">{ObjDependencias.dependencias.map(Obj => <li key={Obj.transaccionId}>Movimiento #{Obj.transaccionId} · {Obj.subtipo} · {D(Obj.cantidad)} {ObjDependencias.unidad} · {Obj.codigoAlmacen}
            {Obj.alimentacionId && <span>Alimentación #{Obj.alimentacionId}</span>}{Obj.elaboracionId && <Link to={`/alimentacion/concentrados/historial/${Obj.elaboracionId}`}>Elaboración dependiente #{Obj.elaboracionId}</Link>}{Obj.transferenciaId && <span>Transferencia #{Obj.transferenciaId}</span>}
          </li>)}</ul>
          <p>No se revierten dependencias automáticamente. El backend volverá a comprobar existencias y dependencias al confirmar.</p>
          {ObjDependencias.reversible && P("ALIMENTACION_ELABORACIONES_REVERTIR") && <button className="boton-primario" disabled={BoolProcesando} onClick={() => establecerConfirmar(true)}>Revertir elaboración</button>}
        </section>}
      </>}
    </>}
    <Modal BoolAbierto={BoolConfirmar} StrTitulo="Confirmar reversión integral" Autenticacion_cerrar={() => { if (!BoolProcesando) establecerConfirmar(false); }}>
      <form className="alimentacion-formulario" onSubmit={E => { E.preventDefault(); void Alimentacion_revertir(); }}><p className="alimentacion-observaciones">Se retirará todo el concentrado y se restituirán las materias primas a sus fuentes originales. El historial se conservará.</p>
        <label>Motivo de reversión<textarea required maxLength={500} value={StrMotivo} disabled={BoolProcesando} onChange={E => establecerMotivo(E.target.value)} /></label>
        <button className="boton-primario" disabled={BoolProcesando || !StrMotivo.trim()}>{BoolProcesando ? "Revirtiendo…" : "Confirmar reversión"}</button>
      </form>
    </Modal>
  </section>;
}
