import { useState } from "react";
import { Autocomplete } from "../../components/ui/Autocomplete";
import { Paginacion } from "../../components/ui/Paginacion";
import { useSesion } from "../../hooks/useSesion";
import { Produccion_mensajeError, useProduccionLista } from "../../hooks/useProduccionLista";
import * as S from "../../services/produccion.service";
import type { AnimalProduccion, MedicionProduccion, MetodoObtencionPeso } from "../../types/produccion.types";
import { Fecha_formatearTimestampGuatemala } from "../../utils/fecha";
import { Produccion_calcularPesoEstimado, Produccion_decimalValido, Produccion_etiquetaMetodo, Produccion_formatearDecimal, Produccion_medidaCorporalValida } from "../../utils/produccion";

const Produccion_solicitarMediciones = (ObjConsulta: { pagina: number; limite: number; animalId?: number }) => S.Produccion_listarMediciones(ObjConsulta);
function Produccion_detalleMedidas(ObjMedicion:MedicionProduccion){return ObjMedicion.metodoObtencion==="ESTIMACION_SCHAEFFER"?`PT: ${ObjMedicion.perimetroToracicoCm} cm · LC: ${ObjMedicion.longitudCorporalCm} cm`:"—"}

export function PaginaMedicionesProduccion() {
  const { Autenticacion_tienePermiso } = useSesion();
  const ObjLista = useProduccionLista<MedicionProduccion, { animalId?: number }>(Produccion_solicitarMediciones, {});
  const [ObjAnimal, establecerAnimal] = useState<AnimalProduccion | null>(null);
  const [StrMetodo, establecerMetodo] = useState<MetodoObtencionPeso>("ESTIMACION_SCHAEFFER");
  const [StrPerimetro, establecerPerimetro] = useState("");
  const [StrLongitud, establecerLongitud] = useState("");
  const [StrPeso, establecerPeso] = useState("");
  const [StrObservaciones, establecerObservaciones] = useState("");
  const [StrError, establecerError] = useState<string | null>(null);
  const [BoolProcesando, establecerProcesando] = useState(false);
  const ObjEstimacion=Produccion_calcularPesoEstimado(StrPerimetro,StrLongitud);
  const ObjPesoMedido=Produccion_decimalValido(StrPeso,false)?{DecPesoKg:Number(StrPeso),DecPesoLb:Number(StrPeso)*2.2046226218487757}:null;
  const BoolPerimetroValido=Produccion_medidaCorporalValida(StrPerimetro),BoolLongitudValida=Produccion_medidaCorporalValida(StrLongitud);
  const BoolFormularioValido=!!ObjAnimal&&(StrMetodo==="BASCULA"?Produccion_decimalValido(StrPeso,false):BoolPerimetroValido&&BoolLongitudValida);
  async function Produccion_buscarAnimales(StrBusqueda: string) { return (await S.Produccion_listarAnimales({ pagina: 1, limite: 10, busqueda: StrBusqueda, estado: "ACTIVO" })).datos; }
  async function Produccion_guardar() {
    if (!ObjAnimal||!BoolFormularioValido) return;
    establecerProcesando(true); establecerError(null);
    try {
      await S.Produccion_registrarMedicion(StrMetodo==="BASCULA"?{animalId:ObjAnimal.animalId,metodoObtencion:"BASCULA",pesoKg:StrPeso,observaciones:StrObservaciones||null}:{animalId:ObjAnimal.animalId,metodoObtencion:"ESTIMACION_SCHAEFFER",perimetroToracicoCm:StrPerimetro,longitudCorporalCm:StrLongitud,observaciones:StrObservaciones||null});
      establecerPerimetro(""); establecerLongitud(""); establecerPeso(""); establecerObservaciones(""); await ObjLista.Produccion_recargar();
    } catch (ObjError) { establecerError(Produccion_mensajeError(ObjError)); }
    finally { establecerProcesando(false); }
  }
  return <div className="produccion-contenido produccion-mediciones"><h2>Mediciones de peso</h2><p>Registre un peso medido en báscula o estímelo a partir de medidas corporales.</p>
    {Autenticacion_tienePermiso("PRODUCCION_MEDICIONES_CREAR") && <form className="produccion-panel produccion-medicion-formulario" onSubmit={(ObjEvento) => { ObjEvento.preventDefault(); void Produccion_guardar(); }}>
      <Autocomplete StrEtiqueta="Animal" StrPlaceholder="Buscar por código o identificación..." ObjSeleccion={ObjAnimal} Autocomplete_buscar={Produccion_buscarAnimales} Autocomplete_clave={(ObjActual) => ObjActual.animalId} Autocomplete_etiqueta={(ObjActual) => `${ObjActual.identificacion} — ${ObjActual.tipoAnimal.nombre}${ObjActual.raza ? ` / ${ObjActual.raza.nombre}` : ""}`} Autocomplete_seleccionar={establecerAnimal} />
      <label>Método de medición<select value={StrMetodo} onChange={ObjEvento=>establecerMetodo(ObjEvento.target.value as MetodoObtencionPeso)}><option value="ESTIMACION_SCHAEFFER">Estimación por medidas corporales</option><option value="BASCULA">Báscula</option></select></label>
      {StrMetodo==="ESTIMACION_SCHAEFFER"?<>
        <label>Perímetro torácico (cm)<input required inputMode="decimal" aria-invalid={!!StrPerimetro&&!BoolPerimetroValido} value={StrPerimetro} onChange={ObjEvento=>establecerPerimetro(ObjEvento.target.value)}/>{StrPerimetro&&!BoolPerimetroValido&&<small className="mensaje-error">Ingrese un número mayor que cero, con máximo 4 decimales.</small>}</label>
        <label>Longitud corporal (cm)<input required inputMode="decimal" aria-invalid={!!StrLongitud&&!BoolLongitudValida} value={StrLongitud} onChange={ObjEvento=>establecerLongitud(ObjEvento.target.value)}/>{StrLongitud&&!BoolLongitudValida&&<small className="mensaje-error">Ingrese un número mayor que cero, con máximo 4 decimales.</small>}</label>
        <section className="produccion-peso-estimado" aria-live="polite"><strong>Peso estimado</strong>{ObjEstimacion?<div><span className="produccion-peso-principal">{Produccion_formatearDecimal(ObjEstimacion.DecPesoKg)} kg</span><span className="produccion-peso-secundario">{Produccion_formatearDecimal(ObjEstimacion.DecPesoLb)} lb</span></div>:<p>Ingrese las medidas para calcular el peso.</p>}</section>
      </>:<><label className="produccion-medicion-campo-bascula">Peso medido (kg)<input required inputMode="decimal" aria-invalid={!!StrPeso&&!Produccion_decimalValido(StrPeso,false)} value={StrPeso} onChange={ObjEvento=>establecerPeso(ObjEvento.target.value)}/>{StrPeso&&!Produccion_decimalValido(StrPeso,false)&&<small className="mensaje-error">Ingrese un peso mayor que cero, con máximo 4 decimales.</small>}</label><section className="produccion-peso-estimado" aria-live="polite"><strong>Peso medido</strong>{ObjPesoMedido?<div><span className="produccion-peso-principal">{Produccion_formatearDecimal(ObjPesoMedido.DecPesoKg)} kg</span><span className="produccion-peso-secundario">{Produccion_formatearDecimal(ObjPesoMedido.DecPesoLb)} lb</span></div>:<p>Ingrese el peso medido para ver la conversión.</p>}</section></>}
      <label className="produccion-medicion-observaciones">Observaciones (opcional)<textarea maxLength={1000} value={StrObservaciones} onChange={(ObjEvento) => establecerObservaciones(ObjEvento.target.value)} /></label>
      <div className="produccion-medicion-acciones"><button className="boton-primario" disabled={BoolProcesando||!BoolFormularioValido}>{BoolProcesando?"Registrando…":"Registrar medición"}</button></div>
    </form>}
    {(StrError || ObjLista.StrError) && <p role="alert" className="mensaje-error">{StrError || ObjLista.StrError}</p>}
    <section className="produccion-mediciones-historial" aria-labelledby="produccion-mediciones-historial-titulo"><h3 id="produccion-mediciones-historial-titulo">Historial de mediciones</h3><div className="produccion-tabla"><table><thead><tr><th>Fecha</th><th>Animal</th><th>Peso</th><th>Método</th><th>Medidas fuente</th><th>Observaciones</th></tr></thead><tbody>{ObjLista.ArrDatos.map(Obj=><tr key={Obj.medicionId}><td>{Fecha_formatearTimestampGuatemala(Obj.fechaMedicion)}</td><td>{Obj.animal?.identificacion??"—"}</td><td>{Produccion_formatearDecimal(Obj.valor)} kg / {Produccion_formatearDecimal(Obj.pesoLb)} lb</td><td>{Produccion_etiquetaMetodo(Obj.metodoObtencion)}</td><td>{Produccion_detalleMedidas(Obj)}</td><td>{Obj.observaciones??"—"}</td></tr>)}</tbody></table></div>
      <div className="produccion-tarjetas">{ObjLista.ArrDatos.map(Obj=><article key={Obj.medicionId}><strong>{Obj.animal?.identificacion??"Animal"}</strong><time>{Fecha_formatearTimestampGuatemala(Obj.fechaMedicion)}</time><p>{Produccion_formatearDecimal(Obj.valor)} kg / {Produccion_formatearDecimal(Obj.pesoLb)} lb</p><p><b>Método:</b> {Produccion_etiquetaMetodo(Obj.metodoObtencion)}</p><p>{Produccion_detalleMedidas(Obj)}</p>{Obj.observaciones&&<p><b>Observaciones:</b> {Obj.observaciones}</p>}</article>)}</div>
      {!ObjLista.ArrDatos.length && <p className="produccion-vacio">No existen mediciones.</p>}<Paginacion IntPagina={ObjLista.IntPagina} IntTotalPaginas={Math.max(1, Math.ceil(ObjLista.IntTotal / 20))} Usuarios_cambiarPagina={ObjLista.establecerPagina} /></section>
  </div>;
}
