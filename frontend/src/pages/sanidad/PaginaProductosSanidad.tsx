import { useEffect, useState } from "react";
import { DialogoConfirmacion } from "../../components/ui/DialogoConfirmacion";
import { IndicadorCarga } from "../../components/ui/IndicadorCarga";
import { InsigniaEstado } from "../../components/ui/InsigniaEstado";
import { Sanidad_mensajeError } from "../../hooks/useSanidad";
import { Sanidad_habilitarProducto, Sanidad_productos } from "../../services/sanidad.service";
import type { ProductoSanidad } from "../../types/sanidad.types";

export function PaginaProductosSanidad() {
  const [ArrProductos, establecerProductos] = useState<ProductoSanidad[]>([]);
  const [BoolCargando, establecerCargando] = useState(true);
  const [BoolProcesando, establecerProcesando] = useState(false);
  const [ObjCambio, establecerCambio] = useState<ProductoSanidad | null>(null);
  const [StrError, establecerError] = useState<string | null>(null);
  async function Sanidad_cargarProductos() {
    establecerCargando(true);
    try { establecerProductos((await Sanidad_productos()).datos); }
    catch (ObjError) { establecerError(Sanidad_mensajeError(ObjError)); }
    finally { establecerCargando(false); }
  }
  useEffect(() => { void Sanidad_cargarProductos(); }, []);
  async function Sanidad_confirmarEstado() {
    if (!ObjCambio) return;
    establecerProcesando(true);
    try {
      await Sanidad_habilitarProducto(ObjCambio.productoId, !ObjCambio.habilitacionSanidad?.activo);
      establecerCambio(null); await Sanidad_cargarProductos();
    } catch (ObjError) { establecerError(Sanidad_mensajeError(ObjError)); }
    finally { establecerProcesando(false); }
  }
  return <div className="alimentacion-contenido">
    <header className="alimentacion-seccion-encabezado"><div><h2>Productos sanitarios</h2><p>Define explícitamente qué insumos pueden utilizarse en aplicaciones sanitarias.</p></div></header>
    {StrError && <p role="alert" className="mensaje-error">{StrError}</p>}
    {BoolCargando ? <IndicadorCarga /> : ArrProductos.length === 0 ? <p className="alimentacion-vacio">No existen productos de Inventario.</p> : <>
      <div className="alimentacion-tabla"><table><thead><tr><th>Código</th><th>Nombre</th><th>Unidad base</th><th>Producto</th><th>Sanidad</th><th>Acciones</th></tr></thead><tbody>{ArrProductos.map(ObjProducto => <tr key={ObjProducto.productoId}><td>{ObjProducto.codigo}</td><td>{ObjProducto.nombre}</td><td>{ObjProducto.unidadMedida}</td><td><InsigniaEstado StrEstado={ObjProducto.activo ? "ACTIVO" : "INACTIVO"} /></td><td>{ObjProducto.habilitacionSanidad?.activo ? "Habilitado" : "No habilitado"}</td><td><button type="button" onClick={() => establecerCambio(ObjProducto)}>{ObjProducto.habilitacionSanidad?.activo ? "Deshabilitar" : "Habilitar"}</button></td></tr>)}</tbody></table></div>
      <div className="alimentacion-tarjetas">{ArrProductos.map(ObjProducto => <article key={ObjProducto.productoId}><h3>{ObjProducto.codigo} · {ObjProducto.nombre}</h3><p>Unidad base: {ObjProducto.unidadMedida}</p><p>Sanidad: {ObjProducto.habilitacionSanidad?.activo ? "Habilitado" : "No habilitado"}</p><InsigniaEstado StrEstado={ObjProducto.activo ? "ACTIVO" : "INACTIVO"} /><button type="button" onClick={() => establecerCambio(ObjProducto)}>{ObjProducto.habilitacionSanidad?.activo ? "Deshabilitar" : "Habilitar"}</button></article>)}</div>
    </>}
    <DialogoConfirmacion BoolAbierto={ObjCambio !== null} StrTitulo={ObjCambio?.habilitacionSanidad?.activo ? "Deshabilitar producto" : "Habilitar producto"} StrMensaje="El historial existente se conservará; el cambio solo afecta aplicaciones nuevas." StrConfirmar="Confirmar" BoolProcesando={BoolProcesando} Autenticacion_cancelar={() => establecerCambio(null)} Autenticacion_confirmar={() => void Sanidad_confirmarEstado()} />
  </div>;
}
