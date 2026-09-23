import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSesion } from "../../hooks/useSesion";
import { Alimentacion_mensajeError } from "../../hooks/useAlimentacion";
import { ErrorApi } from "../../types/api.types";
import { Autocomplete } from "../../components/ui/Autocomplete";
import { Modal } from "../../components/ui/Modal";
import { MensajeError } from "../../components/ui/MensajeError";
import { UnidadConcentrado, ResumenConcentrado, Alimentacion_decimal as D, Alimentacion_cantidadValida } from "../../components/alimentacion/ConcentradosCompartidos";
import { Fecha_datetimeLocalAContratoGuatemala } from "../../utils/fecha";
import { Inventario_formatearFechaCivil } from "../../utils/inventario";
import * as S from "../../services/concentrados.service";
import type { CatalogosConcentrados, RecetaConcentrado, PreviaConcentrado, DatosConfirmacionConcentrado, ElaboracionConcentrado } from "../../types/concentrados.types";

export function PaginaElaborarConcentrado() {
  const [ObjParametros] = useSearchParams();
  const IntReceta = Number(ObjParametros.get("recetaId")) || undefined;
  const IntConcentrado = Number(ObjParametros.get("concentradoId")) || undefined;
  const { Autenticacion_tienePermiso: P } = useSesion();
  const [ObjCatalogos, establecerCatalogos] = useState<CatalogosConcentrados>({ unidades: [], almacenes: [] });
  const [ObjReceta, establecerReceta] = useState<RecetaConcentrado | null>(null);
  const [StrFecha, establecerFecha] = useState("");
  const [StrTeorica, establecerTeorica] = useState("");
  const [StrReal, establecerReal] = useState("");
  const [StrUnidad, establecerUnidad] = useState("");
  const [StrDestino, establecerDestino] = useState("");
  const [StrVencimiento, establecerVencimiento] = useState("");
  const [StrMotivo, establecerMotivo] = useState("");
  const [StrObservaciones, establecerObservaciones] = useState("");
  const [ObjPrevia, establecerPrevia] = useState<PreviaConcentrado | null>(null);
  const [ObjSolicitud, establecerSolicitud] = useState<DatosConfirmacionConcentrado | null>(null);
  const [ObjResultado, establecerResultado] = useState<ElaboracionConcentrado | null>(null);
  const [StrError, establecerError] = useState<string | null>(null);
  const [BoolProcesando, establecerProcesando] = useState(false);
  const [BoolConfirmar, establecerConfirmar] = useState(false);
  const [BoolEnviada, establecerEnviada] = useState(false);
  const RefProcesando = useRef(false);
  useEffect(() => {
    let BoolVigente = true;
    void S.Alimentacion_catalogosConcentrados().then(Obj => { if (BoolVigente) establecerCatalogos(Obj); }).catch(E => { if (BoolVigente) establecerError(Alimentacion_mensajeError(E)); });
    if (IntReceta) void S.Alimentacion_recetaConcentrado(IntReceta).then(Obj => { if (BoolVigente) { establecerReceta(Obj); establecerUnidad(Obj.unidadBase); } }).catch(E => { if (BoolVigente) establecerError(Alimentacion_mensajeError(E)); });
    return () => { BoolVigente = false; };
  }, [IntReceta]);
  function Alimentacion_invalidar() { establecerPrevia(null); establecerSolicitud(null); establecerError(null); }
  async function Alimentacion_previsualizar(E: FormEvent) {
    E.preventDefault(); if (RefProcesando.current || BoolEnviada) return;
    Alimentacion_invalidar();
    const StrCantidadTeorica = StrTeorica.trim(), StrCantidadReal = StrReal.trim();
    if (!ObjReceta?.recetaId) { establecerError("Seleccione una receta de la lista de resultados; escribir su nombre no basta."); return; }
    let StrFechaEfectiva: string;
    try { StrFechaEfectiva = Fecha_datetimeLocalAContratoGuatemala(StrFecha); }
    catch { establecerError("Indique una fecha y hora efectiva válida."); return; }
    if (!Alimentacion_cantidadValida(StrCantidadTeorica)) { establecerError("Cantidad a elaborar: ingrese un número positivo, entero o con hasta seis decimales (por ejemplo, 395 o 395.25)."); return; }
    if (!Alimentacion_cantidadValida(StrCantidadReal)) { establecerError("Cantidad obtenida: ingrese un número positivo, entero o con hasta seis decimales (por ejemplo, 395 o 395.25)."); return; }
    if (!ObjCatalogos.unidades.some(Obj => Obj.codigo === StrUnidad)) { establecerError("Seleccione una unidad de elaboración válida."); return; }
    if (!ObjCatalogos.almacenes.some(Obj => Obj.inventarioId === Number(StrDestino))) { establecerError("Seleccione un almacén destino válido."); return; }
    if (StrVencimiento && StrVencimiento < StrFecha.slice(0, 10)) { establecerError("El vencimiento no puede ser anterior a la fecha efectiva."); return; }
    if (D(StrCantidadTeorica) !== D(StrCantidadReal) && !StrMotivo.trim()) { establecerError("Justifique la diferencia entre la cantidad a elaborar y la cantidad obtenida."); return; }
    RefProcesando.current = true; establecerProcesando(true);
    try {
      // Releer la versión al solicitar una nueva vista previa tras una edición concurrente.
      const ObjVigente = await S.Alimentacion_recetaConcentrado(ObjReceta.recetaId);
      establecerReceta(ObjVigente);
      const ObjEntrada = { recetaId: ObjVigente.recetaId, versionReceta: ObjVigente.version, fechaEfectiva: StrFechaEfectiva,
        cantidadTeorica: StrCantidadTeorica, cantidadReal: StrCantidadReal, unidadCaptura: StrUnidad, inventarioDestinoId: Number(StrDestino),
        ...(StrVencimiento ? { fechaVencimiento: StrVencimiento } : {}), ...(StrMotivo.trim() ? { motivoDiferencia: StrMotivo.trim() } : {}), ...(StrObservaciones.trim() ? { observaciones: StrObservaciones.trim() } : {}) };
      const Obj = await S.Alimentacion_previsualizarConcentrado(ObjEntrada);
      establecerPrevia(Obj);
      if (Obj.disponible) establecerSolicitud({ ...ObjEntrada, huellaPrevisualizacion: Obj.huellaPrevisualizacion, claveIdempotencia: crypto.randomUUID() });
    } catch (X) { establecerError(Alimentacion_mensajeError(X)); }
    finally { RefProcesando.current = false; establecerProcesando(false); }
  }
  async function Alimentacion_confirmar() {
    if (!ObjSolicitud || !ObjPrevia?.disponible || RefProcesando.current) return;
    RefProcesando.current = true; establecerProcesando(true); establecerEnviada(true); establecerError(null);
    try {
      const Obj = await S.Alimentacion_confirmarConcentrado(ObjSolicitud);
      establecerResultado({ ...Obj.datos, almacenDestino: ObjPrevia.destino }); establecerConfirmar(false);
    } catch (E) {
      establecerConfirmar(false);
      const BoolObsoleta = E instanceof ErrorApi && ["ELABORACION_PREVIA_OBSOLETA", "ELABORACION_CONSUMO_INCONSISTENTE", "ELABORACION_COSTO_INCONSISTENTE"].includes(E.StrCodigo);
      if (BoolObsoleta) {
        establecerPrevia(null); establecerSolicitud(null); establecerEnviada(false);
        establecerError("La vista previa quedó obsoleta. Genere una nueva vista previa antes de confirmar.");
      } else if (E instanceof ErrorApi && ["ELABORACION_CONFLICTO", "ELABORACION_CONFLICTO_CONCURRENCIA"].includes(E.StrCodigo)) {
        establecerError("Conflicto de concurrencia o integridad. Reintente la misma solicitud; se conserva la clave para evitar duplicados. No se ha declarado obsoleta la vista previa.");
      } else {
        establecerError(`${Alimentacion_mensajeError(E)} Se conserva la solicitud; reintente para verificar su resultado sin duplicarla.`);
      }
    } finally { RefProcesando.current = false; establecerProcesando(false); }
  }
  if (ObjResultado) return <section className="alimentacion-contenido"><h2>Elaboración registrada</h2><ResumenConcentrado Obj={ObjResultado} />
    {P("ALIMENTACION_ELABORACIONES_CONSULTAR") && <Link to={`/alimentacion/concentrados/historial/${ObjResultado.elaboracionId}`}>Consultar detalle de elaboración</Link>}
    <button onClick={() => { establecerResultado(null); establecerEnviada(false); Alimentacion_invalidar(); }}>Registrar otra elaboración</button></section>;
  return <section className="alimentacion-contenido"><h2>Elaborar concentrado</h2>
    <p className="alimentacion-aviso">La vista previa no reserva existencias. La confirmación revalida cantidades, fuentes, receta y costos.</p>
    {StrError && <MensajeError StrMensaje={StrError} />}
    {BoolEnviada && <p role="status">Solicitud enviada. Reintente con los mismos datos antes de iniciar otra elaboración.</p>}
    <form onSubmit={E => void Alimentacion_previsualizar(E)}>
      <fieldset disabled={BoolProcesando || BoolEnviada} className="alimentacion-formulario concentrados-captura" onChange={Alimentacion_invalidar}>
        <legend>Datos de elaboración</legend>
        <Autocomplete StrEtiqueta="Receta" StrPlaceholder="Buscar receta activa" ObjSeleccion={ObjReceta} Autocomplete_buscar={async Str => (await S.Alimentacion_recetasConcentrado({ pagina: 1, limite: 20, busqueda: Str, concentradoId: IntConcentrado })).datos.filter(Obj => Obj.activo)} Autocomplete_etiqueta={Obj => `${Obj.nombre} · versión ${Obj.version}`} Autocomplete_clave={Obj => Obj.recetaId} Autocomplete_seleccionar={Obj => { Alimentacion_invalidar(); establecerReceta(Obj); if (Obj) establecerUnidad(Obj.unidadBase); }} />
        <label>Fecha y hora efectiva<input required type="datetime-local" value={StrFecha} onChange={E => establecerFecha(E.target.value)} /></label>
        <label>Cantidad a elaborar<input required inputMode="decimal" value={StrTeorica} onChange={E => establecerTeorica(E.target.value)} /></label>
        <label>Cantidad obtenida<input required inputMode="decimal" value={StrReal} onChange={E => establecerReal(E.target.value)} /></label>
        <UnidadConcentrado StrEtiqueta="Unidad de elaboración" StrValor={StrUnidad} ArrUnidades={ObjCatalogos.unidades} Alimentacion_cambiar={establecerUnidad} />
        <label>Almacén destino<select required value={StrDestino} onChange={E => establecerDestino(E.target.value)}><option value="">Seleccione</option>{ObjCatalogos.almacenes.map(Obj => <option key={Obj.inventarioId} value={Obj.inventarioId}>{Obj.codigo} · {Obj.nombre}</option>)}</select></label>
        <label>Vencimiento (si aplica)<input type="date" min={StrFecha.slice(0, 10)} value={StrVencimiento} onChange={E => establecerVencimiento(E.target.value)} /></label>
        <label>Justificación de diferencia<textarea maxLength={1000} value={StrMotivo} onChange={E => establecerMotivo(E.target.value)} /></label>
        <label className="alimentacion-observaciones">Observaciones<textarea maxLength={1000} value={StrObservaciones} onChange={E => establecerObservaciones(E.target.value)} /></label>
        <div className="concentrados-acciones alimentacion-observaciones"><button className="boton-primario">Generar vista previa</button></div>
      </fieldset>
    </form>
    {ObjPrevia && <>
      <VistaPreviaConcentrado Obj={ObjPrevia} ObjCatalogos={ObjCatalogos} />
      {ObjPrevia.disponible && ObjSolicitud && <button className="boton-primario" disabled={BoolProcesando} onClick={() => establecerConfirmar(true)}>{BoolEnviada ? "Reintentar confirmación" : "Revisar y confirmar elaboración"}</button>}
    </>}
    <Modal BoolAbierto={BoolConfirmar} StrTitulo="Confirmar elaboración" Autenticacion_cerrar={() => { if (!BoolProcesando) establecerConfirmar(false); }}>
      {ObjPrevia?.costoEstimado && <div className="alimentacion-resumen-confirmacion"><p>{ObjPrevia.productoTerminado.nombre}</p><p>Se obtendrán {D(ObjPrevia.cantidadRealBase)} {ObjPrevia.productoTerminado.unidadBase} en {ObjPrevia.destino.nombre}.</p><p>Costo estimado: Q{D(ObjPrevia.costoEstimado.total)}</p><p>Se consumirán las materias primas indicadas y se creará un lote nuevo.</p>
        <button className="boton-primario" disabled={BoolProcesando} onClick={() => void Alimentacion_confirmar()}>{BoolProcesando ? "Confirmando…" : "Confirmar elaboración"}</button>
      </div>}
    </Modal>
  </section>;
}

function VistaPreviaConcentrado({ Obj, ObjCatalogos }: { Obj: PreviaConcentrado; ObjCatalogos: CatalogosConcentrados }) {
  return <section className="alimentacion-contenido" aria-label="Vista previa de elaboración"><h3>Vista previa · {Obj.productoTerminado.nombre}</h3>
    <p>Cantidad a elaborar: {D(Obj.cantidadTeorica)} {Obj.unidadCaptura} · Cantidad obtenida: {D(Obj.cantidadReal)} {Obj.unidadCaptura}</p>
    <p>Diferencia de rendimiento: {D(Obj.rendimiento.diferencia)} {Obj.unidadCaptura} · Rendimiento: {D(Obj.rendimiento.porcentaje)} %</p>
    {Obj.faltantes.length > 0 && <div role="alert" className="alimentacion-alerta"><strong>No se puede elaborar: ingredientes insuficientes.</strong><ul>{Obj.faltantes.map(F => <li key={F.productoId}>{F.nombre}: faltan {D(F.cantidadFaltante)} {F.unidadBase}</li>)}</ul></div>}
    <div className="alimentacion-tabla"><table><thead><tr><th>Ingrediente</th><th>Requerido</th><th>Disponible</th><th>Reparto por fuente</th></tr></thead><tbody>{Obj.ingredientes.map(I => <tr key={I.productoId}><td>{I.codigo} · {I.nombre}</td><td>{D(I.cantidadRequerida)} {I.unidadBase}</td><td>{D(I.cantidadDisponible)} {I.unidadBase}</td><td><ul className="alimentacion-detalles">{I.fuentes.map(F => <li key={F.existenciaLoteId}>
      <strong>{ObjCatalogos.almacenes.find(A => A.inventarioId === F.inventarioId)?.nombre ?? `Almacén #${F.inventarioId}`} · Lote {F.codigoLote}</strong>
      <span>Utilizar: {D(F.cantidad)} {I.unidadBase} · Existencia: {D(F.existenciaActual)} {I.unidadBase}</span><span>Costo unitario: Q{D(F.costoUnitario)} · Importe: Q{D(F.importe)}</span><small>{Inventario_formatearFechaCivil(F.fechaVencimiento)}</small>
    </li>)}</ul></td></tr>)}</tbody></table></div>
    <p>Costo estimado total: {Obj.costoEstimado ? `Q${D(Obj.costoEstimado.total)}` : "No calculable hasta cubrir todos los faltantes"}</p>
    {Obj.costoEstimado && <><p>Costo unitario estimado: Q{D(Obj.costoEstimado.unitario)} / {Obj.costoEstimado.unidad}</p><p>Residual de valoración: Q{D(Obj.costoEstimado.residualValoracion)}</p></>}
    <details><summary>Balance de masa ({Obj.balanceMasa.unidad})</summary><dl className="concentrados-balance">
      <dt>Ingredientes requeridos</dt><dd>{D(Obj.balanceMasa.ingredientesRequeridos)}</dd><dt>Ingredientes disponibles asignados</dt><dd>{D(Obj.balanceMasa.ingredientesDisponiblesAsignados)}</dd>
      <dt>Salida teórica</dt><dd>{D(Obj.balanceMasa.salidaTeorica)}</dd><dt>Salida real</dt><dd>{D(Obj.balanceMasa.salidaReal)}</dd><dt>Diferencia entrada/salida</dt><dd>{D(Obj.balanceMasa.diferenciaEntradaSalida)}</dd><dt>Residual de cuantización de salida</dt><dd>{D(Obj.balanceMasa.residualCuantizacionSalida)}</dd>
    </dl></details>
  </section>;
}
