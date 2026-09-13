import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Autocomplete } from "../../components/ui/Autocomplete";
import { Produccion_mensajeError } from "../../hooks/useProduccionLista";
import * as S from "../../services/produccion.service";
import type { AnalisisGananciaLote, AnalisisGananciaPeso, AnimalProduccion, ConsultaGananciaPeso, LoteProduccion, PesoGanancia } from "../../types/produccion.types";
import { Fecha_formatearTimestampGuatemala } from "../../utils/fecha";
import { Produccion_formatearDecimal, Produccion_etiquetaMetodo } from "../../utils/produccion";

function Produccion_mostrarMagnitud(StrKg: string | null, StrLb: string | null, BoolGpd = false) {
  if (StrKg === null || StrLb === null) return "N/D";
  return `${Produccion_formatearDecimal(StrKg)} ${BoolGpd ? "kg/día" : "kg"} / ${Produccion_formatearDecimal(StrLb)} ${BoolGpd ? "lb/día" : "lb"}`;
}
function Produccion_mostrarDias(StrDias: string | null) {
  if (StrDias === null) return "N/D";
  if (Number(StrDias) > 0 && Number(StrDias) < 0.00005) return "<0.0001";
  return Produccion_formatearDecimal(StrDias, 4);
}
function Produccion_mostrarPesada(ObjPeso: PesoGanancia | null) {
  return ObjPeso ? <><time>{Fecha_formatearTimestampGuatemala(ObjPeso.fechaMedicion)}</time><br />{Produccion_mostrarMagnitud(ObjPeso.pesoKg, ObjPeso.pesoLb)}</> : "N/D";
}

function Produccion_detalleGanancia({ ObjAnalisis }: { ObjAnalisis: AnalisisGananciaPeso }) {
  const ObjResumen = ObjAnalisis.resumen;
  return <section className="produccion-panel" aria-label="Detalle de ganancia de peso">
    <h3>{ObjAnalisis.animal.identificacion} · Evolución de peso</h3>
    {ObjAnalisis.permanencia && <p>Permanencia en {ObjAnalisis.permanencia.lote.codigo}: {Fecha_formatearTimestampGuatemala(ObjAnalisis.permanencia.fechaInicio)} → {ObjAnalisis.permanencia.fechaFin ? Fecha_formatearTimestampGuatemala(ObjAnalisis.permanencia.fechaFin) : "Vigente"}</p>}
    {ObjResumen.estado === "INCONSISTENTE" ? <p>La permanencia tiene inconsistencias históricas; no se calcularon métricas.</p> :
      ObjResumen.estado === "SIN_MEDICIONES" ? <p>No hay mediciones válidas en el período seleccionado.</p> :
      ObjResumen.estado === "DATOS_INSUFICIENTES" && <p>Se necesitan al menos dos mediciones en instantes diferentes para calcular GPD.</p>}
    <div className="produccion-resumen-grid">
      <article><span>Primera pesada</span><strong>{Produccion_mostrarPesada(ObjResumen.primera)}</strong></article>
      <article><span>Última pesada</span><strong>{Produccion_mostrarPesada(ObjResumen.ultima)}</strong></article>
      <article><span>Ganancia total</span><strong>{Produccion_mostrarMagnitud(ObjResumen.gananciaTotalKg, ObjResumen.gananciaTotalLb)}</strong></article>
      <article><span>Días totales</span><strong>{Produccion_mostrarDias(ObjResumen.diasTotales)}</strong></article>
      <article><span>GPD acumulada</span><strong>{Produccion_mostrarMagnitud(ObjResumen.gpdAcumuladaKg, ObjResumen.gpdAcumuladaLb, true)}</strong></article>
    </div>
    {ObjAnalisis.medicionesExcluidas > 0 && <p>Mediciones excluidas por datos incompatibles: {ObjAnalisis.medicionesExcluidas}.</p>}
    {ObjAnalisis.incidencias.length > 0 && <ul>{ObjAnalisis.incidencias.map((Str, Int) => <li key={Int}>{Str}</li>)}</ul>}
    {ObjAnalisis.evolucion.length > 0 && <div className="produccion-ficha-tabla"><table>
      <caption>Evolución cronológica · kg y equivalente lb</caption>
      <thead><tr><th>Fecha</th><th>Peso</th><th>Días desde anterior</th><th>Cambio respecto a anterior</th><th>GPD del período</th><th>Ganancia acumulada</th><th>GPD acumulada</th><th>Método</th></tr></thead>
      <tbody>{ObjAnalisis.evolucion.map(Obj => <tr key={Obj.medicionId}>
        <td>{Fecha_formatearTimestampGuatemala(Obj.fechaMedicion)}</td>
        <td>{Produccion_mostrarMagnitud(Obj.pesoKg, Obj.pesoLb)}</td>
        <td>{Produccion_mostrarDias(Obj.diasDesdeAnterior)}</td>
        <td>{Produccion_mostrarMagnitud(Obj.cambioKg, Obj.cambioLb)}</td>
        <td>{Produccion_mostrarMagnitud(Obj.gpdPeriodoKg, Obj.gpdPeriodoLb, true)}</td>
        <td>{Produccion_mostrarMagnitud(Obj.gananciaAcumuladaKg, Obj.gananciaAcumuladaLb)}</td>
        <td>{Produccion_mostrarMagnitud(Obj.gpdAcumuladaKg, Obj.gpdAcumuladaLb, true)}</td>
        <td>{Produccion_etiquetaMetodo(Obj.metodoObtencion === "BASCULA" || Obj.metodoObtencion === "ESTIMACION_SCHAEFFER" ? Obj.metodoObtencion : null)}</td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}

export function PaginaGananciaPesoProduccion() {
  const [StrTipo, establecerTipo] = useState<"ANIMAL" | "LOTE">("ANIMAL");
  const [ObjAnimal, establecerAnimal] = useState<AnimalProduccion | null>(null);
  const [ObjLote, establecerLote] = useState<LoteProduccion | null>(null);
  const [StrDesde, establecerDesde] = useState("");
  const [StrHasta, establecerHasta] = useState("");
  const [ObjAnalisis, establecerAnalisis] = useState<AnalisisGananciaPeso | null>(null);
  const [ObjAnalisisLote, establecerAnalisisLote] = useState<AnalisisGananciaLote | null>(null);
  const [StrError, establecerError] = useState<string | null>(null);
  const [BoolCargando, establecerCargando] = useState(false);
  const IntSolicitud = useRef(0);

  function Produccion_limpiarResultado() {
    IntSolicitud.current += 1;
    establecerAnalisis(null);
    establecerAnalisisLote(null);
    establecerError(null);
    establecerCargando(false);
  }
  function Produccion_periodo(): ConsultaGananciaPeso {
    return { ...(StrDesde ? { fechaDesde: StrDesde } : {}), ...(StrHasta ? { fechaHasta: StrHasta } : {}) };
  }
  async function Produccion_consultar(IntAsignacionId?: number) {
    if (StrDesde && StrHasta && StrDesde > StrHasta) { establecerError("Desde no puede ser posterior a Hasta."); return; }
    if (IntAsignacionId === undefined && (StrTipo === "ANIMAL" ? !ObjAnimal : !ObjLote)) { establecerError(`Seleccione un ${StrTipo === "ANIMAL" ? "animal" : "lote"}.`); return; }
    const IntActual = ++IntSolicitud.current;
    establecerCargando(true);
    establecerError(null);
    establecerAnalisis(null);
    if (IntAsignacionId === undefined) establecerAnalisisLote(null);
    try {
      if (IntAsignacionId !== undefined) {
        const ObjRespuesta = await S.Produccion_analizarGananciaAsignacion(IntAsignacionId, Produccion_periodo());
        if (IntActual === IntSolicitud.current) establecerAnalisis(ObjRespuesta.datos);
      } else if (StrTipo === "ANIMAL") {
        const ObjRespuesta = await S.Produccion_analizarGananciaAnimal(ObjAnimal!.animalId, Produccion_periodo());
        if (IntActual === IntSolicitud.current) establecerAnalisis(ObjRespuesta.datos);
      } else {
        const ObjRespuesta = await S.Produccion_analizarGananciaLote(ObjLote!.loteProduccionId, Produccion_periodo());
        if (IntActual === IntSolicitud.current) establecerAnalisisLote(ObjRespuesta.datos);
      }
    } catch (ObjError) {
      if (IntActual === IntSolicitud.current) establecerError(Produccion_mensajeError(ObjError));
    } finally {
      if (IntActual === IntSolicitud.current) establecerCargando(false);
    }
  }

  return <div className="produccion-contenido produccion-ganancia">
    <header className="produccion-seccion-encabezado"><div><h2>Análisis de ganancia de peso</h2><p>GPD = (peso final − peso inicial) / días transcurridos.</p></div><Link className="boton-secundario enlace-boton" to="/produccion/mediciones">Volver a Mediciones</Link></header>
    <form className="produccion-panel" onSubmit={ObjEvento => { ObjEvento.preventDefault(); void Produccion_consultar(); }}>
      <div className="produccion-formulario">
        <label>Analizar por<select value={StrTipo} onChange={ObjEvento => { establecerTipo(ObjEvento.target.value as "ANIMAL" | "LOTE"); Produccion_limpiarResultado(); }}><option value="ANIMAL">Animal</option><option value="LOTE">Lote</option></select></label>
        {StrTipo === "ANIMAL" ? <Autocomplete StrEtiqueta="Animal" StrPlaceholder="Buscar identificación..." ObjSeleccion={ObjAnimal}
          Autocomplete_buscar={async StrBusqueda => (await S.Produccion_listarAnimales({ pagina: 1, limite: 20, busqueda: StrBusqueda })).datos}
          Autocomplete_clave={Obj => Obj.animalId} Autocomplete_etiqueta={Obj => Obj.identificacion}
          Autocomplete_seleccionar={Obj => { establecerAnimal(Obj); Produccion_limpiarResultado(); }} /> :
          <Autocomplete StrEtiqueta="Lote" StrPlaceholder="Buscar código o nombre..." ObjSeleccion={ObjLote}
            Autocomplete_buscar={async StrBusqueda => (await S.Produccion_listarLotes({ pagina: 1, limite: 20, busqueda: StrBusqueda })).datos}
            Autocomplete_clave={Obj => Obj.loteProduccionId} Autocomplete_etiqueta={Obj => `${Obj.codigo} · ${Obj.nombre}`}
            Autocomplete_seleccionar={Obj => { establecerLote(Obj); Produccion_limpiarResultado(); }} />}
        <label>Desde<input type="date" value={StrDesde} onChange={ObjEvento => { establecerDesde(ObjEvento.target.value); Produccion_limpiarResultado(); }} /></label>
        <label>Hasta<input type="date" value={StrHasta} onChange={ObjEvento => { establecerHasta(ObjEvento.target.value); Produccion_limpiarResultado(); }} /></label>
      </div>
      <p>Fechas y horas de Guatemala. Los días incluyen fracciones de 24 horas; un intervalo cero produce GPD N/D. La primera pesada incluida es la base del análisis.</p>
      <p>Las estimaciones corporales y las pesadas en báscula pueden tener distinta precisión.</p>
      {StrTipo === "LOTE" && <p>Una fila por permanencia histórica. Solo se incluyen pesadas dentro de cada ingreso/salida; los reingresos se analizan por separado.</p>}
      <button className="boton-primario" disabled={BoolCargando}>Analizar</button>
    </form>
    {StrError && <p role="alert">{StrError}</p>}
    {BoolCargando && <p role="status">Consultando análisis…</p>}
    {ObjAnalisisLote && <section className="produccion-panel" aria-label="Resumen del lote">
      <h3>{ObjAnalisisLote.lote.codigo} · {ObjAnalisisLote.lote.nombre}</h3>
      <div className="produccion-resumen-grid">{[
        ["Animales distintos", ObjAnalisisLote.cantidades.animales], ["Permanencias", ObjAnalisisLote.cantidades.permanencias],
        ["Con datos suficientes", ObjAnalisisLote.cantidades.conDatosSuficientes], ["Sin datos suficientes", ObjAnalisisLote.cantidades.sinDatosSuficientes],
      ].map(([Str, Int]) => <article key={Str}><span>{Str}</span><strong>{Int}</strong></article>)}</div>
      {!ObjAnalisisLote.permanencias.length ? <p>No hay permanencias en el período seleccionado.</p> : <div className="produccion-ficha-tabla"><table>
        <caption>Resumen por animal y permanencia</caption>
        <thead><tr><th>Animal</th><th>Permanencia</th><th>Primera pesada</th><th>Última pesada</th><th>Peso inicial</th><th>Peso actual</th><th>Ganancia total</th><th>Última GPD</th><th>GPD acumulada</th></tr></thead>
        <tbody>{ObjAnalisisLote.permanencias.map(Obj => <tr key={Obj.asignacionLoteId}>
          <td><button type="button" className="boton-secundario" disabled={BoolCargando} onClick={() => void Produccion_consultar(Obj.asignacionLoteId)} aria-label={`Ver detalle de ${Obj.animal.identificacion}, permanencia ${Obj.asignacionLoteId}`}>{Obj.animal.identificacion}</button><small>{Obj.resumen.estado === "CALCULADO" ? "" : Obj.resumen.estado === "INCONSISTENTE" ? " Historial inconsistente" : " Datos insuficientes"}</small></td>
          <td>{Fecha_formatearTimestampGuatemala(Obj.fechaInicio)} → {Obj.fechaFin ? Fecha_formatearTimestampGuatemala(Obj.fechaFin) : "Vigente"}</td>
          <td>{Obj.resumen.primera ? Fecha_formatearTimestampGuatemala(Obj.resumen.primera.fechaMedicion) : "N/D"}</td>
          <td>{Obj.resumen.ultima ? Fecha_formatearTimestampGuatemala(Obj.resumen.ultima.fechaMedicion) : "N/D"}</td>
          <td>{Produccion_mostrarMagnitud(Obj.resumen.primera?.pesoKg ?? null, Obj.resumen.primera?.pesoLb ?? null)}</td>
          <td>{Produccion_mostrarMagnitud(Obj.resumen.ultima?.pesoKg ?? null, Obj.resumen.ultima?.pesoLb ?? null)}</td>
          <td>{Produccion_mostrarMagnitud(Obj.resumen.gananciaTotalKg, Obj.resumen.gananciaTotalLb)}</td>
          <td>{Produccion_mostrarMagnitud(Obj.resumen.ultimaGpdKg, Obj.resumen.ultimaGpdLb, true)}</td>
          <td>{Produccion_mostrarMagnitud(Obj.resumen.gpdAcumuladaKg, Obj.resumen.gpdAcumuladaLb, true)}</td>
        </tr>)}</tbody>
      </table></div>}
      {ObjAnalisisLote.incidencias.length > 0 && <ul>{ObjAnalisisLote.incidencias.map((Str, Int) => <li key={Int}>{Str}</li>)}</ul>}
    </section>}
    {ObjAnalisis && <Produccion_detalleGanancia ObjAnalisis={ObjAnalisis} />}
  </div>;
}
