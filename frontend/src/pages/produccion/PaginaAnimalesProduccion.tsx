import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Autocomplete } from "../../components/ui/Autocomplete";
import { Paginacion } from "../../components/ui/Paginacion";
import { Produccion_mensajeError, useProduccionLista } from "../../hooks/useProduccionLista";
import { useSesion } from "../../hooks/useSesion";
import * as S from "../../services/produccion.service";
import type { AnimalProduccion, LoteProduccion, RazaAnimal, SexoAnimal, TipoAnimal } from "../../types/produccion.types";
import { Produccion_fechaCivil } from "../../utils/produccion";

interface FiltrosAnimales { busqueda?: string; estado?: string; tipoAnimalId?: number; razaId?: number; loteProduccionId?: number; sexo?: SexoAnimal }
const Produccion_solicitarAnimales = (Obj: FiltrosAnimales & { pagina: number; limite: number }) => S.Produccion_listarAnimales(Obj);

export function PaginaAnimalesProduccion() {
  const { Autenticacion_tienePermiso } = useSesion();
  const ObjLista = useProduccionLista<AnimalProduccion, FiltrosAnimales>(Produccion_solicitarAnimales, {});
  const [ArrTipos, establecerTipos] = useState<TipoAnimal[]>([]);
  const [ArrRazas, establecerRazas] = useState<RazaAnimal[]>([]);
  const [ArrLotes, establecerLotes] = useState<LoteProduccion[]>([]);
  const [ObjDetalle, establecerDetalle] = useState<AnimalProduccion | null>(null);
  const [ObjEditar, establecerEditar] = useState<AnimalProduccion | null>(null);
  const [ObjTerminal, establecerTerminal] = useState<AnimalProduccion | null>(null);
  const [ObjFiltros, establecerFiltros] = useState({ busqueda: "", estado: "", tipo: "", raza: "", lote: "", sexo: "" });
  const [StrError, establecerError] = useState<string | null>(null);
  useEffect(() => { void Promise.all([S.Produccion_listarTipos({ pagina: 1, limite: 100 }), S.Produccion_listarRazas({ pagina: 1, limite: 100 }), S.Produccion_listarLotes({ pagina: 1, limite: 100 })]).then(([T, R, L]) => { establecerTipos(T.datos); establecerRazas(R.datos); establecerLotes(L.datos); }); }, []);
  async function Produccion_cargarDetalle(IntAnimalId: number) { try { establecerDetalle((await S.Produccion_obtenerAnimal(IntAnimalId)).datos); } catch (ObjError) { establecerError(Produccion_mensajeError(ObjError)); } }
  async function Produccion_refrescar() { await ObjLista.Produccion_recargar(); }
  return <div className="produccion-contenido">
    <header className="produccion-seccion-encabezado"><div><h2>Animales</h2><p>Identidad, asignación vigente e historial individual.</p></div></header>
    <form className="produccion-filtros" onSubmit={(E) => { E.preventDefault(); ObjLista.Produccion_aplicarFiltros({ ...(ObjFiltros.busqueda ? { busqueda: ObjFiltros.busqueda } : {}), ...(ObjFiltros.estado ? { estado: ObjFiltros.estado } : {}), ...(ObjFiltros.tipo ? { tipoAnimalId: Number(ObjFiltros.tipo) } : {}), ...(ObjFiltros.raza ? { razaId: Number(ObjFiltros.raza) } : {}), ...(ObjFiltros.lote ? { loteProduccionId: Number(ObjFiltros.lote) } : {}), ...(ObjFiltros.sexo ? { sexo: ObjFiltros.sexo as SexoAnimal } : {}) }); }}>
      <label>Identificación<input value={ObjFiltros.busqueda} onChange={(E) => establecerFiltros({ ...ObjFiltros, busqueda: E.target.value })} /></label>
      <label>Estado<select value={ObjFiltros.estado} onChange={(E) => establecerFiltros({ ...ObjFiltros, estado: E.target.value })}><option value="">Todos</option>{["ACTIVO", "VENDIDO", "FALLECIDO", "RETIRADO"].map(O => <option key={O}>{O}</option>)}</select></label>
      <label>Tipo<select value={ObjFiltros.tipo} onChange={(E) => establecerFiltros({ ...ObjFiltros, tipo: E.target.value, raza: "" })}><option value="">Todos</option>{ArrTipos.map(O => <option key={O.tipoAnimalId} value={O.tipoAnimalId}>{O.nombre}</option>)}</select></label>
      <label>Raza<select value={ObjFiltros.raza} onChange={(E) => establecerFiltros({ ...ObjFiltros, raza: E.target.value })}><option value="">Todas</option>{ArrRazas.filter(O => !ObjFiltros.tipo || O.tipoAnimalId === Number(ObjFiltros.tipo)).map(O => <option key={O.razaId} value={O.razaId}>{O.nombre}</option>)}</select></label>
      <label>Sexo<select value={ObjFiltros.sexo} onChange={(E) => establecerFiltros({ ...ObjFiltros, sexo: E.target.value })}><option value="">Todos</option><option>MACHO</option><option>HEMBRA</option><option>NO_DETERMINADO</option></select></label>
      <label>Lote vigente<select value={ObjFiltros.lote} onChange={(E) => establecerFiltros({ ...ObjFiltros, lote: E.target.value })}><option value="">Todos</option>{ArrLotes.map(O => <option key={O.loteProduccionId} value={O.loteProduccionId}>{O.codigo}</option>)}</select></label><button>Filtrar</button>
    </form>
    {(StrError || ObjLista.StrError) && <p role="alert">{StrError || ObjLista.StrError}</p>}
    <div className="produccion-tabla"><table><thead><tr><th>Identificación</th><th>Tipo</th><th>Raza</th><th>Sexo</th><th>Estado</th><th>Lote</th><th>Nacimiento</th><th>Acciones</th></tr></thead><tbody>{ObjLista.ArrDatos.map(ObjAnimal => <tr key={ObjAnimal.animalId}><td>{ObjAnimal.identificacion}</td><td>{ObjAnimal.tipoAnimal.nombre}</td><td>{ObjAnimal.raza?.nombre ?? "—"}</td><td>{ObjAnimal.sexo.replaceAll("_", " ")}</td><td>{ObjAnimal.estadoActual}</td><td>{ObjAnimal.asignaciones[0]?.lote?.codigo ?? "—"}</td><td>{Produccion_fechaCivil(ObjAnimal.fechaNacimiento)}</td><td><button onClick={() => void Produccion_cargarDetalle(ObjAnimal.animalId)}>Detalle</button>{Autenticacion_tienePermiso("PRODUCCION_ANIMALES_EDITAR") && <button onClick={() => establecerEditar(ObjAnimal)}>Editar</button>}{ObjAnimal.estadoActual === "ACTIVO" && Autenticacion_tienePermiso("PRODUCCION_ESTADOS_TERMINALES_REGISTRAR") && <button onClick={() => establecerTerminal(ObjAnimal)}>Estado terminal</button>}</td></tr>)}</tbody></table></div>
    <div className="produccion-tarjetas">{ObjLista.ArrDatos.map(ObjAnimal => <article key={ObjAnimal.animalId}><strong>{ObjAnimal.identificacion}</strong><p>{ObjAnimal.tipoAnimal.nombre} · {ObjAnimal.sexo.replaceAll("_", " ")}</p><p>{ObjAnimal.estadoActual} · Lote {ObjAnimal.asignaciones[0]?.lote?.codigo ?? "—"}</p><button onClick={() => void Produccion_cargarDetalle(ObjAnimal.animalId)}>Ver detalle</button></article>)}</div>
    {!ObjLista.BoolCargando && !ObjLista.ArrDatos.length && <p className="produccion-vacio">No existen animales.</p>}
    <Paginacion IntPagina={ObjLista.IntPagina} IntTotalPaginas={Math.max(1, Math.ceil(ObjLista.IntTotal / 20))} Usuarios_cambiarPagina={ObjLista.establecerPagina} />
    <Modal BoolAbierto={ObjDetalle !== null} StrTitulo={`Animal ${ObjDetalle?.identificacion ?? ""}`} Autenticacion_cerrar={() => establecerDetalle(null)}>{ObjDetalle && <div><p><b>Tipo:</b> {ObjDetalle.tipoAnimal.nombre}</p><p><b>Madre:</b> {ObjDetalle.madre?.identificacion ?? "—"}</p><h3>Historial de estados</h3>{ObjDetalle.historialEstados?.map(O => <p key={O.historialEstadoId}>{O.estadoAnterior ?? "Ingreso"} → {O.estadoNuevo}: {O.motivo ?? "Sin motivo"}</p>)}<h3>Pesos</h3>{ObjDetalle.mediciones?.map(O => <p key={O.medicionId}>{O.valor} KG</p>)}</div>}</Modal>
    <Modal BoolAbierto={ObjEditar !== null} StrTitulo="Editar animal" Autenticacion_cerrar={() => establecerEditar(null)}>{ObjEditar && <FormularioEditarAnimal ObjAnimal={ObjEditar} ArrRazas={ArrRazas} Produccion_guardar={async (ObjCambios) => { try { await S.Produccion_editarAnimal(ObjEditar.animalId, ObjCambios); establecerEditar(null); await Produccion_refrescar(); } catch (ObjError) { establecerError(Produccion_mensajeError(ObjError)); } }} />}</Modal>
    <Modal BoolAbierto={ObjTerminal !== null} StrTitulo="Registrar estado terminal" Autenticacion_cerrar={() => establecerTerminal(null)}>{ObjTerminal && <FormularioEstadoTerminal Produccion_guardar={async (ObjDatos) => { try { await S.Produccion_estadoTerminal(ObjTerminal.animalId, ObjDatos); establecerTerminal(null); await Produccion_refrescar(); } catch (ObjError) { establecerError(Produccion_mensajeError(ObjError)); } }} />}</Modal>
  </div>;
}

function FormularioEditarAnimal({ ObjAnimal, ArrRazas, Produccion_guardar }: { ObjAnimal: AnimalProduccion; ArrRazas: RazaAnimal[]; Produccion_guardar: (Obj: { razaId: number | null; sexo: SexoAnimal; fechaNacimiento: string | null; madreAnimalId: number | null; observaciones: string | null }) => Promise<void> }) {
  const [StrRaza, establecerRaza] = useState(ObjAnimal.razaId ? String(ObjAnimal.razaId) : "");
  const [StrSexo, establecerSexo] = useState(ObjAnimal.sexo);
  const [StrFecha, establecerFecha] = useState(ObjAnimal.fechaNacimiento ?? "");
  const [ObjMadre, establecerMadre] = useState<AnimalProduccion | null>(ObjAnimal.madre ? { ...ObjAnimal, animalId: ObjAnimal.madre.animalId, identificacion: ObjAnimal.madre.identificacion } : null);
  const [StrObservaciones, establecerObservaciones] = useState(ObjAnimal.observaciones ?? "");
  async function Produccion_buscarMadres(StrBusqueda: string) { return (await S.Produccion_listarAnimales({ pagina: 1, limite: 10, busqueda: StrBusqueda, sexo: "HEMBRA", tipoAnimalId: ObjAnimal.tipoAnimalId, estado: "ACTIVO" })).datos.filter((ObjOpcion) => ObjOpcion.animalId !== ObjAnimal.animalId); }
  return <form className="produccion-formulario" onSubmit={(ObjEvento) => { ObjEvento.preventDefault(); void Produccion_guardar({ razaId: StrRaza ? Number(StrRaza) : null, sexo: StrSexo, fechaNacimiento: StrFecha || null, madreAnimalId: ObjMadre?.animalId ?? null, observaciones: StrObservaciones || null }); }}>
    <label>Código / identificación del animal<input readOnly value={ObjAnimal.identificacion} /></label><label>Tipo<input readOnly value={ObjAnimal.tipoAnimal.nombre} /></label>
    <label>Raza<select value={StrRaza} onChange={(ObjEvento) => establecerRaza(ObjEvento.target.value)}><option value="">Sin raza</option>{ArrRazas.filter((ObjRaza) => ObjRaza.activo && ObjRaza.tipoAnimalId === ObjAnimal.tipoAnimalId).map((ObjRaza) => <option key={ObjRaza.razaId} value={ObjRaza.razaId}>{ObjRaza.nombre}</option>)}</select></label>
    <label>Sexo<select value={StrSexo} onChange={(ObjEvento) => establecerSexo(ObjEvento.target.value as SexoAnimal)}><option>MACHO</option><option>HEMBRA</option><option>NO_DETERMINADO</option></select></label>
    <label>Fecha nacimiento<input type="date" value={StrFecha} onChange={(ObjEvento) => establecerFecha(ObjEvento.target.value)} /></label>
    <Autocomplete StrEtiqueta="Madre (opcional)" StrPlaceholder="Buscar por código o identificación..." ObjSeleccion={ObjMadre} Autocomplete_buscar={Produccion_buscarMadres} Autocomplete_clave={(ObjOpcion) => ObjOpcion.animalId} Autocomplete_etiqueta={(ObjOpcion) => `${ObjOpcion.identificacion} — ${ObjOpcion.sexo} — ${ObjOpcion.tipoAnimal.nombre}`} Autocomplete_seleccionar={establecerMadre} />
    <label>Observaciones<textarea value={StrObservaciones} onChange={(ObjEvento) => establecerObservaciones(ObjEvento.target.value)} /></label><button>Guardar</button>
  </form>;
}
function FormularioEstadoTerminal({ Produccion_guardar }: { Produccion_guardar: (Obj: { estado: "FALLECIDO" | "RETIRADO"; motivo: string; observaciones?: string | null }) => Promise<void> }) { const [StrEstado, setEstado] = useState<"FALLECIDO" | "RETIRADO">("FALLECIDO"), [StrMotivo, setMotivo] = useState(""), [StrObservaciones, setObservaciones] = useState(""); return <form className="produccion-formulario" onSubmit={(E) => { E.preventDefault(); void Produccion_guardar({ estado: StrEstado, motivo: StrMotivo, observaciones: StrObservaciones || null }); }}><p className="produccion-aviso">VENDIDO no puede registrarse manualmente; será responsabilidad de Ventas.</p><label>Estado<select value={StrEstado} onChange={(E) => setEstado(E.target.value as "FALLECIDO" | "RETIRADO")}><option>FALLECIDO</option><option>RETIRADO</option></select></label><label>Motivo<input required value={StrMotivo} onChange={(E) => setMotivo(E.target.value)} /></label><label>Observaciones<textarea value={StrObservaciones} onChange={(E) => setObservaciones(E.target.value)} /></label><button className="boton-peligro">Confirmar estado terminal</button></form>; }
