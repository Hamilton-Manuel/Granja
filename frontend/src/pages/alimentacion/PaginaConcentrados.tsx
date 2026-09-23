import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useSesion } from "../../hooks/useSesion";
import { Alimentacion_mensajeError } from "../../hooks/useAlimentacion";
import { Autocomplete } from "../../components/ui/Autocomplete";
import { Modal } from "../../components/ui/Modal";
import { DialogoConfirmacion } from "../../components/ui/DialogoConfirmacion";
import { MensajeError } from "../../components/ui/MensajeError";
import { Paginacion } from "../../components/ui/Paginacion";
import { IndicadorCarga } from "../../components/ui/IndicadorCarga";
import { InsigniaEstado } from "../../components/ui/InsigniaEstado";
import { useConcentradosLista } from "../../components/alimentacion/ConcentradosCompartidos";
import * as S from "../../services/concentrados.service";
import type { Concentrado, ProductoConcentrado } from "../../types/concentrados.types";

export function PaginaEntradaConcentrados() {
  const { Autenticacion_tienePermiso: P } = useSesion();
  if (P("ALIMENTACION_CONCENTRADOS_CONSULTAR")) return <PaginaConcentrados />;
  if (P("ALIMENTACION_ELABORACIONES_CONSULTAR")) return <Navigate replace to="historial" />;
  return <p className="alimentacion-aviso">Para acceder al listado y a las recetas necesita ALIMENTACION_CONCENTRADOS_CONSULTAR.</p>;
}
export function PaginaConcentrados() {
  const H = useConcentradosLista(S.Alimentacion_concentrados);
  const { Autenticacion_tienePermiso: P } = useSesion();
  const [BoolNuevo, establecerNuevo] = useState(false);
  const [ObjProducto, establecerProducto] = useState<ProductoConcentrado | null>(null);
  const [ObjEstado, establecerEstado] = useState<Concentrado | null>(null);
  const [BoolProcesando, establecerProcesando] = useState(false);
  const [StrError, establecerError] = useState<string | null>(null);
  const [StrBusqueda, establecerBusqueda] = useState("");
  async function Alimentacion_mutar(BoolClasificar: boolean) {
    if (BoolProcesando) return;
    establecerProcesando(true); establecerError(null);
    try {
      if (BoolClasificar && ObjProducto) await S.Alimentacion_clasificar(ObjProducto.productoId);
      else if (ObjEstado) await S.Alimentacion_estadoConcentrado(ObjEstado.concentradoId, !ObjEstado.activo);
      establecerNuevo(false); establecerProducto(null); establecerEstado(null); H.Alimentacion_recargar();
    } catch (E) { establecerError(Alimentacion_mensajeError(E)); establecerEstado(null); }
    finally { establecerProcesando(false); }
  }
  return <section className="alimentacion-contenido">
    <header className="alimentacion-seccion-encabezado"><h2>Concentrados</h2>{P("ALIMENTACION_RECETAS_GESTIONAR") && <button className="boton-primario" onClick={() => { establecerError(null); establecerNuevo(true); }}>Clasificar producto existente</button>}</header>
    <form className="alimentacion-filtros" onSubmit={E => { E.preventDefault(); H.establecerConsulta({ ...H.ObjConsulta, pagina: 1, busqueda: StrBusqueda }); }}><label>Buscar producto o código<input value={StrBusqueda} onChange={E => establecerBusqueda(E.target.value)} maxLength={100} /></label><button className="boton-primario">Buscar</button></form>
    {(StrError || H.StrError) && <MensajeError StrMensaje={StrError ?? H.StrError!} />}
    {H.BoolCargando ? <IndicadorCarga StrMensaje="Cargando concentrados…" /> : <div className="alimentacion-tabla"><table><thead><tr><th>Producto</th><th>Código</th><th>Unidad</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      {H.ArrDatos.map(Obj => <tr key={Obj.concentradoId}><td>{Obj.producto.nombre}</td><td>{Obj.producto.codigo}</td><td>{Obj.producto.unidadMedida}</td><td><InsigniaEstado StrEstado={Obj.activo ? "ACTIVO" : "INACTIVO"} />{!Obj.producto.activo && <small>Producto inactivo en Inventario</small>}</td><td className="acciones-tabla">
        <Link className="enlace-boton boton-secundario" to={`recetas?concentradoId=${Obj.concentradoId}`}>Recetas</Link>
        {P("ALIMENTACION_ELABORACIONES_REGISTRAR") && Obj.activo && Obj.producto.activo && <Link className="enlace-boton boton-primario" to={`elaborar?concentradoId=${Obj.concentradoId}`}>Elaborar</Link>}
        {P("ALIMENTACION_ELABORACIONES_CONSULTAR") && <Link className="enlace-boton boton-secundario" to={`historial?concentradoId=${Obj.concentradoId}`}>Historial</Link>}
        {P("ALIMENTACION_RECETAS_GESTIONAR") && <button className={Obj.activo ? "boton-peligro" : "boton-secundario"} onClick={() => establecerEstado(Obj)}>{Obj.activo ? "Inactivar" : "Activar"}</button>}
      </td></tr>)}
    </tbody></table>{!H.ArrDatos.length && <p className="alimentacion-vacio">No hay concentrados para esta búsqueda.</p>}</div>}
    <Paginacion IntPagina={H.ObjConsulta.pagina} IntTotalPaginas={Math.ceil(H.IntTotal / H.ObjConsulta.limite)} Usuarios_cambiarPagina={pagina => H.establecerConsulta({ ...H.ObjConsulta, pagina })} />
    <Modal BoolAbierto={BoolNuevo} StrTitulo="Clasificar producto como concentrado" Autenticacion_cerrar={() => { if (!BoolProcesando) establecerNuevo(false); }}>
      <form className="alimentacion-formulario" onSubmit={E => { E.preventDefault(); if (ObjProducto) void Alimentacion_mutar(true); }}>
        <p className="alimentacion-observaciones">Seleccione un producto de Inventario. Su historial se conserva; los nuevos ingresos por compra o inventario inicial quedarán restringidos.</p>
        <Autocomplete StrEtiqueta="Producto existente" StrPlaceholder="Buscar por nombre o código" ObjSeleccion={ObjProducto} Autocomplete_buscar={S.Alimentacion_productosConcentrados} Autocomplete_etiqueta={Obj => `${Obj.codigo} · ${Obj.nombre} (${Obj.unidadMedida})`} Autocomplete_clave={Obj => Obj.productoId} Autocomplete_seleccionar={establecerProducto} />
        {P("INVENTARIO_PRODUCTOS_CREAR") && <Link to="/inventario/productos">Administrar productos en Inventario</Link>}
        {StrError && <MensajeError StrMensaje={StrError} />}<button disabled={BoolProcesando || !ObjProducto} className="boton-primario">Clasificar concentrado</button>
      </form>
    </Modal>
    <DialogoConfirmacion BoolAbierto={ObjEstado !== null} StrTitulo={ObjEstado?.activo ? "Inactivar concentrado" : "Activar concentrado"} StrMensaje="La clasificación y su historial se conservarán." StrConfirmar="Confirmar estado" BoolProcesando={BoolProcesando} Autenticacion_cancelar={() => { if (!BoolProcesando) establecerEstado(null); }} Autenticacion_confirmar={() => void Alimentacion_mutar(false)} />
  </section>;
}
