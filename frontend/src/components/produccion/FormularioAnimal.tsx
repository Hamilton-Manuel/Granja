import { useState } from "react";
import { Autocomplete } from "../ui/Autocomplete";
import * as S from "../../services/produccion.service";
import type { AnimalIngreso, AnimalProduccion, LoteProduccion, RazaAnimal, SexoAnimal } from "../../types/produccion.types";

export function FormularioAnimal({ ObjLote, ArrRazas, BoolCosto = false, BoolProcesando, Produccion_guardar }: { ObjLote: LoteProduccion; ArrRazas: RazaAnimal[]; BoolCosto?: boolean; BoolProcesando: boolean; Produccion_guardar: (Obj: AnimalIngreso & { costoAdquisicion?: string }) => Promise<void> }) {
  const [StrIdentificacion, establecerIdentificacion] = useState("");
  const [StrSexo, establecerSexo] = useState<SexoAnimal>("NO_DETERMINADO");
  const [StrRaza, establecerRaza] = useState("");
  const [StrNacimiento, establecerNacimiento] = useState("");
  const [ObjMadre, establecerMadre] = useState<AnimalProduccion | null>(null);
  const [StrObservaciones, establecerObservaciones] = useState("");
  const [StrCosto, establecerCosto] = useState("");
  async function Produccion_buscarMadres(StrBusqueda: string) { return (await S.Produccion_listarAnimales({ pagina: 1, limite: 10, busqueda: StrBusqueda, sexo: "HEMBRA", tipoAnimalId: ObjLote.tipoAnimalId, estado: "ACTIVO" })).datos; }
  return <form className="produccion-formulario produccion-formulario-animal" onSubmit={(E) => { E.preventDefault(); void Produccion_guardar({ identificacion: StrIdentificacion, tipoAnimalId: ObjLote.tipoAnimalId, sexo: StrSexo, ...(StrRaza ? { razaId: Number(StrRaza) } : {}), ...(StrNacimiento ? { fechaNacimiento: StrNacimiento } : {}), ...(ObjMadre ? { madreAnimalId: ObjMadre.animalId } : {}), ...(StrObservaciones ? { observaciones: StrObservaciones } : {}), ...(BoolCosto ? { costoAdquisicion: StrCosto } : {}) }); }}>
    <label>Código / identificación del animal<input required maxLength={100} placeholder="Ej. número de arete o código interno" value={StrIdentificacion} onChange={(E) => establecerIdentificacion(E.target.value)} /><small className="ayuda-campo">Dato manual, único e inmutable.</small></label>
    <label>Tipo<input readOnly value={ObjLote.tipoAnimal.nombre} /></label>
    <label>Raza<select value={StrRaza} onChange={(E) => establecerRaza(E.target.value)}><option value="">Sin especificar</option>{ArrRazas.filter(ObjRaza => ObjRaza.activo && ObjRaza.tipoAnimalId === ObjLote.tipoAnimalId).map(ObjRaza => <option key={ObjRaza.razaId} value={ObjRaza.razaId}>{ObjRaza.nombre}</option>)}</select></label>
    <label>Sexo<select value={StrSexo} onChange={(E) => establecerSexo(E.target.value as SexoAnimal)}><option value="MACHO">Macho</option><option value="HEMBRA">Hembra</option><option value="NO_DETERMINADO">No determinado</option></select></label>
    <label>Fecha de nacimiento<input type="date" value={StrNacimiento} onChange={(E) => establecerNacimiento(E.target.value)} /></label>
    <Autocomplete StrEtiqueta="Madre (opcional)" StrPlaceholder="Buscar por código o identificación..." ObjSeleccion={ObjMadre} Autocomplete_buscar={Produccion_buscarMadres} Autocomplete_clave={(ObjAnimal) => ObjAnimal.animalId} Autocomplete_etiqueta={(ObjAnimal) => `${ObjAnimal.identificacion} — ${ObjAnimal.sexo} — ${ObjAnimal.tipoAnimal.nombre}`} Autocomplete_seleccionar={establecerMadre} />
    {BoolCosto && <label>Costo de adquisición<input required inputMode="decimal" pattern="\d+(\.\d{1,2})?" value={StrCosto} onChange={(E) => establecerCosto(E.target.value)} /></label>}
    <label className="campo-ancho">Observaciones<textarea value={StrObservaciones} onChange={(E) => establecerObservaciones(E.target.value)} /></label>
    <div className="campo-ancho produccion-formulario-acciones"><button className="boton-primario" disabled={BoolProcesando}>{BoolProcesando ? "Guardando…" : "Agregar animal"}</button></div>
  </form>;
}
