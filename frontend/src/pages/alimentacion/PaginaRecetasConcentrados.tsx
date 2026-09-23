import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSesion } from "../../hooks/useSesion";
import { Alimentacion_mensajeError } from "../../hooks/useAlimentacion";
import { Autocomplete } from "../../components/ui/Autocomplete";
import { Modal } from "../../components/ui/Modal";
import { DialogoConfirmacion } from "../../components/ui/DialogoConfirmacion";
import { MensajeError } from "../../components/ui/MensajeError";
import { Paginacion } from "../../components/ui/Paginacion";
import { IndicadorCarga } from "../../components/ui/IndicadorCarga";
import { UnidadConcentrado, Alimentacion_cantidadValida, Alimentacion_decimal, useConcentradosLista } from "../../components/alimentacion/ConcentradosCompartidos";
import * as S from "../../services/concentrados.service";
import { Alimentacion_totalReceta } from "../../utils/concentrados";
import type { CatalogosConcentrados, Concentrado, ProductoConcentrado, RecetaConcentrado } from "../../types/concentrados.types";
type LineaReceta = { IntClave: number; ObjProducto: ProductoConcentrado | null; StrCantidad: string; StrUnidad: string };

export function PaginaRecetasConcentrados() {
  const [ObjParametros] = useSearchParams();
  const IntConcentrado = Number(ObjParametros.get("concentradoId")) || undefined;
  const H = useConcentradosLista(S.Alimentacion_recetasConcentrado, IntConcentrado);
  const { Autenticacion_tienePermiso: P } = useSesion();
  const [ObjEdicion, establecerEdicion] = useState<RecetaConcentrado | null | undefined>(undefined);
  const [ObjConcentrado, establecerConcentrado] = useState<Concentrado | null>(null);
  const [ObjCatalogos, establecerCatalogos] = useState<CatalogosConcentrados>({ unidades: [], almacenes: [] });
  const [StrNombre, establecerNombre] = useState("");
  const [StrDescripcion, establecerDescripcion] = useState("");
  const [StrUnidad, establecerUnidad] = useState("");
  const [ArrLineas, establecerLineas] = useState<LineaReceta[]>([]);
  const [StrBusqueda, establecerBusqueda] = useState("");
  const [StrError, establecerError] = useState<string | null>(null);
  const [BoolProcesando, establecerProcesando] = useState(false);
  const [ObjEstado, establecerEstado] = useState<RecetaConcentrado | null>(null);
  const RefClave = useRef(0);
  const StrCantidad = Alimentacion_totalReceta(ArrLineas.map(Obj => ({ productoId: Obj.ObjProducto?.productoId ?? 0, cantidad: Obj.StrCantidad, unidadMedida: Obj.StrUnidad })), StrUnidad, ObjCatalogos.unidades);
  useEffect(() => { let BoolVigente = true; void S.Alimentacion_catalogosConcentrados().then(Obj => { if (BoolVigente) establecerCatalogos(Obj); }).catch(E => { if (BoolVigente) establecerError(Alimentacion_mensajeError(E)); }); return () => { BoolVigente = false; }; }, []);
  async function Alimentacion_abrir(Obj: RecetaConcentrado | null) {
    establecerError(null); establecerProcesando(true);
    try {
      const ObjActual = Obj ? await S.Alimentacion_recetaConcentrado(Obj.recetaId) : null;
      const IntId = ObjActual?.concentradoId ?? IntConcentrado;
      const ObjDestino = IntId ? await S.Alimentacion_concentrado(IntId) : null;
      establecerConcentrado(ObjDestino);
      establecerNombre(ObjActual?.nombre ?? ""); establecerDescripcion(ObjActual?.descripcion ?? "");
      establecerUnidad(ObjActual?.unidadBase ?? ObjDestino?.producto.unidadMedida ?? "");
      establecerLineas(ObjActual?.detalles.map(D => ({ IntClave: ++RefClave.current, ObjProducto: { ...D.producto, productoId: D.productoId }, StrCantidad: D.cantidad, StrUnidad: D.unidadMedida })) ?? []);
      establecerEdicion(ObjActual);
    } catch (E) { establecerError(Alimentacion_mensajeError(E)); } finally { establecerProcesando(false); }
  }
  function Alimentacion_linea(IntClave: number, ObjCambio: Partial<LineaReceta>) { establecerLineas(Arr => Arr.map(Obj => Obj.IntClave === IntClave ? { ...Obj, ...ObjCambio } : Obj)); }
  async function Alimentacion_guardar(E: FormEvent) {
    E.preventDefault(); if (BoolProcesando) return;
    if (!ObjConcentrado || !ArrLineas.length || ArrLineas.some(Obj => !Obj.ObjProducto || !Alimentacion_cantidadValida(Obj.StrCantidad) || !Obj.StrUnidad)) { establecerError("Seleccione el concentrado y al menos un ingrediente. Use cantidades positivas con hasta seis decimales."); return; }
    if (!StrCantidad) { establecerError("No se puede calcular el total: revise las unidades y que la suma sea positiva y esté dentro del rango permitido."); return; }
    if (new Set(ArrLineas.map(Obj => Obj.ObjProducto!.productoId)).size !== ArrLineas.length) { establecerError("No repita ingredientes en la receta."); return; }
    establecerProcesando(true); establecerError(null);
    try {
      await S.Alimentacion_guardarRecetaConcentrado({ concentradoId: ObjConcentrado.concentradoId, nombre: StrNombre.trim(), descripcion: StrDescripcion.trim(), cantidadBase: StrCantidad, unidadBase: StrUnidad,
        detalles: ArrLineas.map(Obj => ({ productoId: Obj.ObjProducto!.productoId, cantidad: Obj.StrCantidad, unidadMedida: Obj.StrUnidad })) }, ObjEdicion ?? undefined);
      establecerEdicion(undefined); H.Alimentacion_recargar();
    } catch (X) { establecerError(Alimentacion_mensajeError(X)); } finally { establecerProcesando(false); }
  }
  async function Alimentacion_estado() {
    if (!ObjEstado || BoolProcesando) return;
    establecerProcesando(true); establecerError(null);
    try { await S.Alimentacion_estadoRecetaConcentrado(ObjEstado); establecerEstado(null); H.Alimentacion_recargar(); }
    catch (E) { establecerError(Alimentacion_mensajeError(E)); establecerEstado(null); }
    finally { establecerProcesando(false); }
  }
  return <section className="alimentacion-contenido">
    <header className="alimentacion-seccion-encabezado"><h2>Recetas de concentrados</h2>{P("ALIMENTACION_RECETAS_GESTIONAR") && <button disabled={BoolProcesando} className="boton-primario" onClick={() => void Alimentacion_abrir(null)}>Nueva receta</button>}</header>
    <p className="alimentacion-aviso">Guardar o editar una receta NO modifica inventario. Las existencias solo cambian al confirmar una elaboración.</p>
    {IntConcentrado && <Link to="/alimentacion/concentrados/recetas">Ver todas las recetas</Link>}
    <form className="alimentacion-filtros" onSubmit={E => { E.preventDefault(); H.establecerConsulta({ ...H.ObjConsulta, pagina: 1, busqueda: StrBusqueda }); }}><label>Buscar receta<input value={StrBusqueda} maxLength={100} onChange={E => establecerBusqueda(E.target.value)} /></label><button className="boton-primario">Buscar</button></form>
    {(StrError || H.StrError) && <MensajeError StrMensaje={StrError ?? H.StrError!} />}
    {H.BoolCargando ? <IndicadorCarga StrMensaje="Cargando recetas…" /> : <div className="alimentacion-tabla"><table><thead><tr><th>Receta</th><th>Total de la receta</th><th>Ingredientes</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      {H.ArrDatos.map(Obj => <tr key={Obj.recetaId}><td>{Obj.nombre}<small>Versión {Obj.version}</small>{Obj.descripcion}</td><td>{Alimentacion_decimal(Obj.cantidadBase)} {Obj.unidadBase}</td><td><ul className="alimentacion-detalles">{Obj.detalles.map(D => <li key={D.recetaDetalleId}>{D.producto.nombre}: {Alimentacion_decimal(D.cantidad)} {D.unidadMedida}</li>)}</ul></td><td>{Obj.activo ? "ACTIVA" : "INACTIVA"}</td><td className="acciones-tabla">
        {P("ALIMENTACION_RECETAS_GESTIONAR") && <><button className="boton-secundario" disabled={BoolProcesando} onClick={() => void Alimentacion_abrir(Obj)}>Editar</button><button className={Obj.activo ? "boton-peligro" : "boton-secundario"} disabled={BoolProcesando} onClick={() => establecerEstado(Obj)}>{Obj.activo ? "Inactivar" : "Activar"}</button></>}
        {Obj.activo && P("ALIMENTACION_ELABORACIONES_REGISTRAR") && <Link className="enlace-boton boton-primario" to={`/alimentacion/concentrados/elaborar?recetaId=${Obj.recetaId}`}>Elaborar</Link>}
      </td></tr>)}
    </tbody></table>{!H.ArrDatos.length && <p className="alimentacion-vacio">No hay recetas para esta búsqueda.</p>}</div>}
    <Paginacion IntPagina={H.ObjConsulta.pagina} IntTotalPaginas={Math.ceil(H.IntTotal / H.ObjConsulta.limite)} Usuarios_cambiarPagina={pagina => H.establecerConsulta({ ...H.ObjConsulta, pagina })} />
    <Modal BoolAbierto={ObjEdicion !== undefined} StrTitulo={ObjEdicion ? "Editar receta" : "Nueva receta"} Autenticacion_cerrar={() => { if (!BoolProcesando) establecerEdicion(undefined); }}>
      <form className="alimentacion-formulario" onSubmit={E => void Alimentacion_guardar(E)}>
        <p className="alimentacion-observaciones">Guardar esta receta NO modifica inventario.{ObjEdicion && ` Se editará la versión ${ObjEdicion.version}. Si cambió en otro lugar, cierre y vuelva a abrir la receta.`}</p>
        {ObjEdicion ? <p>Producto terminado: {ObjConcentrado?.producto.nombre}</p> : <Autocomplete StrEtiqueta="Concentrado terminado" StrPlaceholder="Buscar concentrado" ObjSeleccion={ObjConcentrado}
          Autocomplete_buscar={async Str => (await S.Alimentacion_concentrados({ pagina: 1, limite: 20, busqueda: Str })).datos.filter(Obj => Obj.activo && Obj.producto.activo)}
          Autocomplete_etiqueta={Obj => `${Obj.producto.codigo} · ${Obj.producto.nombre}`} Autocomplete_clave={Obj => Obj.concentradoId} Autocomplete_seleccionar={Obj => { establecerConcentrado(Obj); if (Obj) establecerUnidad(Obj.producto.unidadMedida); }} />}
        <label>Nombre de receta<input required maxLength={150} value={StrNombre} onChange={E => establecerNombre(E.target.value)} /></label>
        <label>Descripción<textarea maxLength={500} value={StrDescripcion} onChange={E => establecerDescripcion(E.target.value)} /></label>
        <fieldset><legend>Ingredientes</legend>{ArrLineas.map((Obj, IntIndice) => <div className="concentrados-ingrediente" key={Obj.IntClave}>
          <Autocomplete StrEtiqueta={`Producto ingrediente ${IntIndice + 1}`} StrPlaceholder="Buscar materia prima" ObjSeleccion={Obj.ObjProducto} Autocomplete_buscar={S.Alimentacion_productosConcentrados} Autocomplete_etiqueta={Pr => `${Pr.codigo} · ${Pr.nombre} (${Pr.unidadMedida})`} Autocomplete_clave={Pr => Pr.productoId} Autocomplete_seleccionar={Pr => Alimentacion_linea(Obj.IntClave, { ObjProducto: Pr, StrUnidad: Pr?.unidadMedida ?? "" })} />
          <label>Cantidad ingrediente {IntIndice + 1}<input required inputMode="decimal" value={Obj.StrCantidad} onChange={E => Alimentacion_linea(Obj.IntClave, { StrCantidad: E.target.value })} /></label>
          <UnidadConcentrado StrEtiqueta={`Unidad ingrediente ${IntIndice + 1}`} StrValor={Obj.StrUnidad} ArrUnidades={ObjCatalogos.unidades} Alimentacion_cambiar={Str => Alimentacion_linea(Obj.IntClave, { StrUnidad: Str })} />
          <button type="button" onClick={() => establecerLineas(Arr => Arr.filter(X => X.IntClave !== Obj.IntClave))}>Quitar ingrediente {IntIndice + 1}</button>
        </div>)}<button type="button" disabled={ArrLineas.length >= 100} onClick={() => establecerLineas(Arr => [...Arr, { IntClave: ++RefClave.current, ObjProducto: null, StrCantidad: "", StrUnidad: "" }])}>Agregar ingrediente</button>
          <UnidadConcentrado StrEtiqueta="Unidad del total" StrValor={StrUnidad} ArrUnidades={ObjCatalogos.unidades} Alimentacion_cambiar={establecerUnidad} />
          <output aria-live="polite">Total de la receta: {StrCantidad ? `${Alimentacion_decimal(StrCantidad)} ${StrUnidad}` : "— (complete los ingredientes y la unidad)"}</output>
        </fieldset>
        {StrError && <MensajeError StrMensaje={StrError} />}<button className="boton-primario" disabled={BoolProcesando}>Guardar receta</button>
      </form>
    </Modal>
    <DialogoConfirmacion BoolAbierto={ObjEstado !== null} StrTitulo={ObjEstado?.activo ? "Inactivar receta" : "Activar receta"} StrMensaje="La composición histórica de las elaboraciones se conservará." StrConfirmar="Confirmar estado" BoolProcesando={BoolProcesando} Autenticacion_cancelar={() => { if (!BoolProcesando) establecerEstado(null); }} Autenticacion_confirmar={() => void Alimentacion_estado()} />
  </section>;
}
