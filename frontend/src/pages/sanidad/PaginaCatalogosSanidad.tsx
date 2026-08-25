import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { useSesion } from "../../hooks/useSesion";
import { Sanidad_mensajeError } from "../../hooks/useSanidad";
import * as S from "../../services/sanidad.service";
import type { CatalogoSanidad } from "../../types/sanidad.types";

type PestanaSanidad = "TIPOS" | "VIAS" | "UNIDADES";
const ObjConfiguracion = {
  TIPOS: { StrTitulo: "Tipos de aplicación", StrRuta: "tipos-aplicacion", StrPrefijo: "SANIDAD_TIPOS" },
  VIAS: { StrTitulo: "Vías de administración", StrRuta: "vias-administracion", StrPrefijo: "SANIDAD_VIAS" },
  UNIDADES: { StrTitulo: "Unidades clínicas", StrRuta: "unidades-dosis", StrPrefijo: "SANIDAD_UNIDADES" },
} as const;
function Sanidad_idCatalogo(ObjCatalogo: CatalogoSanidad) { return ObjCatalogo.tipoAplicacionId ?? ObjCatalogo.viaAdministracionId ?? ObjCatalogo.unidadDosisId ?? 0; }

export function PaginaCatalogosSanidad() {
  const { Autenticacion_tienePermiso } = useSesion();
  const [StrPestana, establecerPestana] = useState<PestanaSanidad>("TIPOS");
  const [ArrCatalogos, establecerCatalogos] = useState<CatalogoSanidad[]>([]);
  const [ObjEditar, establecerEditar] = useState<CatalogoSanidad | null>(null);
  const [BoolCrear, establecerCrear] = useState(false);
  const [StrError, establecerError] = useState<string | null>(null);
  const ObjActual = ObjConfiguracion[StrPestana];
  async function Sanidad_cargarCatalogo() {
    try { establecerCatalogos((await S.Sanidad_catalogo(ObjActual.StrRuta)).datos); }
    catch (ObjError) { establecerError(Sanidad_mensajeError(ObjError)); }
  }
  useEffect(() => { void Sanidad_cargarCatalogo(); }, [StrPestana]);
  const BoolCrearPermitido = Autenticacion_tienePermiso(`${ObjActual.StrPrefijo}_CREAR`);
  const BoolEditarPermitido = Autenticacion_tienePermiso(`${ObjActual.StrPrefijo}_EDITAR`);
  const BoolEstadoPermitido = Autenticacion_tienePermiso(`${ObjActual.StrPrefijo}_CAMBIAR_ESTADO`);
  async function Sanidad_cambiarEstado(ObjCatalogo: CatalogoSanidad) {
    try { await S.Sanidad_estadoCatalogo(ObjActual.StrRuta, Sanidad_idCatalogo(ObjCatalogo), !ObjCatalogo.activo); await Sanidad_cargarCatalogo(); }
    catch (ObjError) { establecerError(Sanidad_mensajeError(ObjError)); }
  }
  return <div className="alimentacion-contenido sanidad-catalogos"><header className="alimentacion-seccion-encabezado"><div><h2>Catálogos sanitarios</h2><p>Los códigos estables permanecen inmutables y los registros inactivos conservan su historial.</p></div>{BoolCrearPermitido && <button className="boton-primario" type="button" onClick={() => establecerCrear(true)}>Nuevo registro</button>}</header>
    <div className="sanidad-pestanas" role="tablist">{(Object.keys(ObjConfiguracion) as PestanaSanidad[]).map(StrClave => <button key={StrClave} role="tab" aria-selected={StrPestana === StrClave} onClick={() => establecerPestana(StrClave)}>{ObjConfiguracion[StrClave].StrTitulo}</button>)}</div>
    {StrError && <p role="alert">{StrError}</p>}
    {ArrCatalogos.length === 0 ? <p className="alimentacion-vacio">No existen registros.</p> : <><div className="alimentacion-tabla"><table><thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{ArrCatalogos.map(ObjCatalogo => <tr key={Sanidad_idCatalogo(ObjCatalogo)}><td>{ObjCatalogo.codigo}</td><td>{ObjCatalogo.nombre}</td><td>{ObjCatalogo.descripcion ?? "—"}</td><td>{ObjCatalogo.activo ? "Activo" : "Inactivo"}</td><td>{BoolEditarPermitido && <button type="button" onClick={() => establecerEditar(ObjCatalogo)}>Editar</button>} {BoolEstadoPermitido && <button type="button" onClick={() => void Sanidad_cambiarEstado(ObjCatalogo)}>{ObjCatalogo.activo ? "Inactivar" : "Activar"}</button>}</td></tr>)}</tbody></table></div>
      <div className="alimentacion-tarjetas">{ArrCatalogos.map(ObjCatalogo => <article key={Sanidad_idCatalogo(ObjCatalogo)}><h3>{ObjCatalogo.nombre}</h3><p>Código: {ObjCatalogo.codigo}</p><p>Descripción: {ObjCatalogo.descripcion ?? "—"}</p><p>Estado: {ObjCatalogo.activo ? "Activo" : "Inactivo"}</p><div className="sanidad-acciones">{BoolEditarPermitido && <button type="button" onClick={() => establecerEditar(ObjCatalogo)}>Editar</button>}{BoolEstadoPermitido && <button type="button" onClick={() => void Sanidad_cambiarEstado(ObjCatalogo)}>{ObjCatalogo.activo ? "Inactivar" : "Activar"}</button>}</div></article>)}</div></>}
    <Modal BoolAbierto={BoolCrear || ObjEditar !== null} StrTitulo={ObjEditar ? `Editar ${ObjActual.StrTitulo.toLowerCase()}` : `Nuevo registro: ${ObjActual.StrTitulo.toLowerCase()}`} Autenticacion_cerrar={() => { establecerCrear(false); establecerEditar(null); }}><FormularioCatalogoSanidad ObjCatalogo={ObjEditar} Sanidad_guardar={async ObjDatos => { try { if (ObjEditar) await S.Sanidad_editarCatalogo(ObjActual.StrRuta, Sanidad_idCatalogo(ObjEditar), { nombre: ObjDatos.nombre, descripcion: ObjDatos.descripcion }); else await S.Sanidad_crearCatalogo(ObjActual.StrRuta, ObjDatos); establecerCrear(false); establecerEditar(null); await Sanidad_cargarCatalogo(); } catch (ObjError) { establecerError(Sanidad_mensajeError(ObjError)); } }} /></Modal>
  </div>;
}

function FormularioCatalogoSanidad({ ObjCatalogo, Sanidad_guardar }: { ObjCatalogo: CatalogoSanidad | null; Sanidad_guardar: (ObjDatos: { codigo: string; nombre: string; descripcion: string | null }) => Promise<void> }) {
  const [StrCodigo, establecerCodigo] = useState(ObjCatalogo?.codigo ?? "");
  const [StrNombre, establecerNombre] = useState(ObjCatalogo?.nombre ?? "");
  const [StrDescripcion, establecerDescripcion] = useState(ObjCatalogo?.descripcion ?? "");
  return <form className="alimentacion-formulario" onSubmit={ObjEvento => { ObjEvento.preventDefault(); void Sanidad_guardar({ codigo: StrCodigo, nombre: StrNombre, descripcion: StrDescripcion.trim() || null }); }}><label>Código<input required readOnly={ObjCatalogo !== null} value={StrCodigo} onChange={ObjEvento => establecerCodigo(ObjEvento.target.value.toUpperCase())} /></label><label>Nombre<input required value={StrNombre} onChange={ObjEvento => establecerNombre(ObjEvento.target.value)} /></label><label>Descripción<textarea value={StrDescripcion} onChange={ObjEvento => establecerDescripcion(ObjEvento.target.value)} /></label><button className="boton-primario" type="submit">Guardar</button></form>;
}
