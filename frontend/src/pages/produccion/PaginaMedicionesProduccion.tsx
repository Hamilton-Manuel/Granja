import { useState } from "react";
import { Autocomplete } from "../../components/ui/Autocomplete";
import { Paginacion } from "../../components/ui/Paginacion";
import { useSesion } from "../../hooks/useSesion";
import { Produccion_mensajeError, useProduccionLista } from "../../hooks/useProduccionLista";
import * as S from "../../services/produccion.service";
import type { AnimalProduccion, MedicionProduccion } from "../../types/produccion.types";
import { Fecha_formatearTimestampGuatemala } from "../../utils/fecha";
import { Produccion_decimalValido } from "../../utils/produccion";

const Produccion_solicitarMediciones = (ObjConsulta: { pagina: number; limite: number; animalId?: number }) => S.Produccion_listarMediciones(ObjConsulta);

export function PaginaMedicionesProduccion() {
  const { Autenticacion_tienePermiso } = useSesion();
  const ObjLista = useProduccionLista<MedicionProduccion, { animalId?: number }>(Produccion_solicitarMediciones, {});
  const [ObjAnimal, establecerAnimal] = useState<AnimalProduccion | null>(null);
  const [StrPeso, establecerPeso] = useState("");
  const [StrObservaciones, establecerObservaciones] = useState("");
  const [StrError, establecerError] = useState<string | null>(null);
  const [BoolProcesando, establecerProcesando] = useState(false);
  async function Produccion_buscarAnimales(StrBusqueda: string) { return (await S.Produccion_listarAnimales({ pagina: 1, limite: 10, busqueda: StrBusqueda, estado: "ACTIVO" })).datos; }
  async function Produccion_guardar() {
    if (!ObjAnimal) return;
    establecerProcesando(true); establecerError(null);
    try { await S.Produccion_registrarMedicion({ animalId: ObjAnimal.animalId, valor: StrPeso, observaciones: StrObservaciones || null }); establecerPeso(""); establecerObservaciones(""); await ObjLista.Produccion_recargar(); }
    catch (ObjError) { establecerError(Produccion_mensajeError(ObjError)); }
    finally { establecerProcesando(false); }
  }
  return <div className="produccion-contenido"><h2>Mediciones de peso</h2><p>Primera versión: PESO individual y unidad fija KG.</p>
    {Autenticacion_tienePermiso("PRODUCCION_MEDICIONES_CREAR") && <form className="produccion-panel produccion-formulario" onSubmit={(ObjEvento) => { ObjEvento.preventDefault(); void Produccion_guardar(); }}>
      <Autocomplete StrEtiqueta="Animal" StrPlaceholder="Buscar por código o identificación..." ObjSeleccion={ObjAnimal} Autocomplete_buscar={Produccion_buscarAnimales} Autocomplete_clave={(ObjActual) => ObjActual.animalId} Autocomplete_etiqueta={(ObjActual) => `${ObjActual.identificacion} — ${ObjActual.tipoAnimal.nombre}${ObjActual.raza ? ` / ${ObjActual.raza.nombre}` : ""}`} Autocomplete_seleccionar={establecerAnimal} />
      <label>Peso (KG)<input required inputMode="decimal" aria-invalid={!!StrPeso && !Produccion_decimalValido(StrPeso, false)} value={StrPeso} onChange={(ObjEvento) => establecerPeso(ObjEvento.target.value)} /></label>
      <label>Observaciones<textarea value={StrObservaciones} onChange={(ObjEvento) => establecerObservaciones(ObjEvento.target.value)} /></label>
      <button disabled={BoolProcesando || !ObjAnimal || !Produccion_decimalValido(StrPeso, false)}>Registrar peso</button>
    </form>}
    {(StrError || ObjLista.StrError) && <p role="alert">{StrError || ObjLista.StrError}</p>}
    <div className="produccion-tabla"><table><thead><tr><th>Animal</th><th>Peso</th><th>Unidad</th><th>Fecha</th></tr></thead><tbody>{ObjLista.ArrDatos.map((ObjMedicion) => <tr key={ObjMedicion.medicionId}><td>{ObjMedicion.animal?.identificacion ?? "—"}</td><td>{ObjMedicion.valor}</td><td>KG</td><td>{Fecha_formatearTimestampGuatemala(ObjMedicion.fechaMedicion)}</td></tr>)}</tbody></table></div>
    {!ObjLista.ArrDatos.length && <p className="produccion-vacio">No existen mediciones.</p>}<Paginacion IntPagina={ObjLista.IntPagina} IntTotalPaginas={Math.max(1, Math.ceil(ObjLista.IntTotal / 20))} Usuarios_cambiarPagina={ObjLista.establecerPagina} />
  </div>;
}
