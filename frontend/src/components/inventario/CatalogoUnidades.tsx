import { useState, type FormEvent } from "react";
import { DialogoConfirmacion } from "../ui/DialogoConfirmacion";
import { InsigniaEstado } from "../ui/InsigniaEstado";
import { MensajeError } from "../ui/MensajeError";
import { Modal } from "../ui/Modal";
import { Paginacion } from "../ui/Paginacion";
import { Inventario_mensajeError, useInventarioLista } from "../../hooks/useInventarioLista";
import { useSesion } from "../../hooks/useSesion";
import * as S from "../../services/inventario.service";
import type { DatosUnidadInventario, DimensionUnidadInventario, EstadoFiltro, UnidadInventario } from "../../types/inventario.types";
import { Inventario_formatearDecimal } from "../../utils/inventario";
import { ObjDimensionesUnidades } from "../../utils/unidadesInventario";

export function CatalogoUnidades() {
  const { Autenticacion_tienePermiso } = useSesion();
  const ObjLista = useInventarioLista(S.Inventario_listarUnidades, {} as { dimension?: DimensionUnidadInventario; estado?: EstadoFiltro });
  const [StrDimension, establecerDimension] = useState<DimensionUnidadInventario | "">("");
  const [StrEstado, establecerEstado] = useState<EstadoFiltro | "">("");
  const [BoolNuevo, establecerNuevo] = useState(false);
  const [ObjEstado, establecerEstadoUnidad] = useState<UnidadInventario | null>(null);
  const [BoolProcesando, establecerProcesando] = useState(false);
  const [StrError, establecerError] = useState<string | null>(null);
  const [StrExito, establecerExito] = useState<string | null>(null);
  const BoolCrear = Autenticacion_tienePermiso("INVENTARIO_PRODUCTOS_CREAR");
  const BoolEstado = Autenticacion_tienePermiso("INVENTARIO_PRODUCTOS_CAMBIAR_ESTADO");
  function Inventario_filtrar(StrNuevaDimension: typeof StrDimension, StrNuevoEstado: typeof StrEstado) {
    establecerDimension(StrNuevaDimension); establecerEstado(StrNuevoEstado);
    ObjLista.Inventario_aplicarFiltros({ ...(StrNuevaDimension ? { dimension: StrNuevaDimension } : {}), ...(StrNuevoEstado ? { estado: StrNuevoEstado } : {}) });
  }
  async function Inventario_operar(Inventario_accion: () => Promise<unknown>) {
    establecerProcesando(true); establecerError(null); establecerExito(null);
    try { await Inventario_accion(); establecerNuevo(false); establecerEstadoUnidad(null); establecerExito("Unidad actualizada."); await ObjLista.Inventario_recargar(); }
    catch (ObjError) { establecerError(Inventario_mensajeError(ObjError)); }
    finally { establecerProcesando(false); }
  }
  function Inventario_accionEstado(ObjUnidad: UnidadInventario) {
    return BoolEstado && <button onClick={() => { establecerError(null); establecerEstadoUnidad(ObjUnidad); }}>{ObjUnidad.activo ? "Inactivar" : "Activar"}</button>;
  }
  return <section>
    <header className="inventario-seccion-encabezado"><div><h3>Unidades de medida</h3><p>Factores respecto a gramos (g), mililitros (mL) o unidad.</p></div>{BoolCrear && <button className="boton-primario" onClick={() => { establecerError(null); establecerNuevo(true); }}>Nueva unidad</button>}</header>
    <div className="formulario-dos-columnas">
      <label className="campo-formulario">Dimensión<select value={StrDimension} onChange={(ObjEvento) => Inventario_filtrar(ObjEvento.target.value as typeof StrDimension, StrEstado)}><option value="">Todas</option>{Object.entries(ObjDimensionesUnidades).map(([StrClave, Obj]) => <option key={StrClave} value={StrClave}>{Obj.StrNombre}</option>)}</select></label>
      <label className="campo-formulario">Estado<select value={StrEstado} onChange={(ObjEvento) => Inventario_filtrar(StrDimension, ObjEvento.target.value as typeof StrEstado)}><option value="">Todos</option><option value="ACTIVO">Activas</option><option value="INACTIVO">Inactivas</option></select></label>
    </div>
    {(StrError || ObjLista.StrError) && <MensajeError StrMensaje={StrError || ObjLista.StrError!} />}
    {StrExito && <p role="status" className="mensaje-exito">{StrExito}</p>}
    {ObjLista.BoolCargando ? <p role="status">Cargando unidades…</p> : !ObjLista.ArrDatos.length ? <p>No hay unidades para estos filtros.</p> : <>
      <div className="inventario-tabla-contenedor"><table><thead><tr><th>Nombre</th><th>Símbolo</th><th>Dimensión</th><th>Factor respecto a la base</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{ObjLista.ArrDatos.map((Obj) => <tr key={Obj.unidadMedidaId}><td>{Obj.nombre}</td><td>{Obj.codigo}</td><td>{ObjDimensionesUnidades[Obj.dimension].StrNombre}</td><td>{Inventario_formatearDecimal(Obj.factorReferencia)} {ObjDimensionesUnidades[Obj.dimension].StrBase}</td><td><InsigniaEstado StrEstado={Obj.activo ? "ACTIVO" : "INACTIVO"} /></td><td>{Inventario_accionEstado(Obj)}</td></tr>)}</tbody></table></div>
      <div className="inventario-tarjetas">{ObjLista.ArrDatos.map((Obj) => <article key={Obj.unidadMedidaId}><strong>{Obj.nombre} ({Obj.codigo})</strong><InsigniaEstado StrEstado={Obj.activo ? "ACTIVO" : "INACTIVO"} /><p>{ObjDimensionesUnidades[Obj.dimension].StrNombre}: {Inventario_formatearDecimal(Obj.factorReferencia)} {ObjDimensionesUnidades[Obj.dimension].StrBase}</p>{Inventario_accionEstado(Obj)}</article>)}</div>
    </>}
    <Paginacion IntPagina={ObjLista.IntPagina} IntTotalPaginas={Math.ceil(ObjLista.IntTotal / ObjLista.IntLimite)} BoolDeshabilitada={ObjLista.BoolActualizando} Usuarios_cambiarPagina={ObjLista.establecerPagina} />
    <p className="ayuda-campo">El símbolo, la dimensión y el factor no se modifican después de crear la unidad. Si cambia la equivalencia, cree otra unidad e inactive la anterior para conservar su historial.</p>
    <Modal BoolAbierto={BoolNuevo} StrTitulo="Nueva unidad" Autenticacion_cerrar={() => establecerNuevo(false)}>{BoolNuevo && <>{StrError && <MensajeError StrMensaje={StrError} />}<FormularioUnidad BoolProcesando={BoolProcesando} Inventario_cancelar={() => establecerNuevo(false)} Inventario_guardar={(Obj) => Inventario_operar(() => S.Inventario_crearUnidad(Obj))} /></>}</Modal>
    <DialogoConfirmacion BoolAbierto={!!ObjEstado} StrTitulo={`${ObjEstado?.activo ? "Inactivar" : "Activar"} unidad`} StrMensaje="Los registros históricos se conservarán. Una unidad inactiva no estará disponible para nuevos productos ni ingresos; los productos que la usan como base no podrán registrar ingresos mientras esté inactiva." StrConfirmar={ObjEstado?.activo ? "Inactivar" : "Activar"} BoolProcesando={BoolProcesando} Autenticacion_cancelar={() => establecerEstadoUnidad(null)} Autenticacion_confirmar={() => { if (ObjEstado) void Inventario_operar(() => S.Inventario_estadoUnidad(ObjEstado.unidadMedidaId, !ObjEstado.activo)); }} />
  </section>;
}

function FormularioUnidad({ BoolProcesando, Inventario_cancelar, Inventario_guardar }: { BoolProcesando: boolean; Inventario_cancelar: () => void; Inventario_guardar: (Obj: DatosUnidadInventario) => Promise<void> }) {
  const [StrNombre, establecerNombre] = useState("");
  const [StrCodigo, establecerCodigo] = useState("");
  const [StrDimension, establecerDimension] = useState<DimensionUnidadInventario>("PESO");
  const [StrFactor, establecerFactor] = useState("");
  const [StrError, establecerError] = useState<string | null>(null);
  function Inventario_enviar(ObjEvento: FormEvent) {
    ObjEvento.preventDefault(); establecerError(null);
    if (!/^\d{1,15}(\.\d{1,15})?$/.test(StrFactor.trim()) || !/[1-9]/.test(StrFactor)) { establecerError("Indique un factor positivo, con hasta 15 enteros y 15 decimales."); return; }
    void Inventario_guardar({ nombre: StrNombre.trim(), codigo: StrCodigo.trim(), dimension: StrDimension, factorReferencia: StrFactor.trim() });
  }
  return <form onSubmit={Inventario_enviar}>
    <div className="formulario-dos-columnas">
      <label className="campo-formulario">Nombre<input value={StrNombre} onChange={(Obj) => establecerNombre(Obj.target.value)} maxLength={100} required /></label>
      <label className="campo-formulario">Símbolo<input value={StrCodigo} onChange={(Obj) => establecerCodigo(Obj.target.value)} maxLength={20} pattern="[A-Za-z][A-Za-z0-9_\-]*" required /></label>
      <label className="campo-formulario">Dimensión de la unidad<select value={StrDimension} onChange={(Obj) => establecerDimension(Obj.target.value as DimensionUnidadInventario)}>{Object.entries(ObjDimensionesUnidades).map(([StrClave, Obj]) => <option key={StrClave} value={StrClave}>{Obj.StrNombre}</option>)}</select></label>
      <label className="campo-formulario">Factor de conversión<input value={StrFactor} onChange={(Obj) => establecerFactor(Obj.target.value)} inputMode="decimal" maxLength={31} required /></label>
    </div>
    <p>1 {StrCodigo || "unidad nueva"} equivale a {StrFactor || "…"} {ObjDimensionesUnidades[StrDimension].StrBase}. Use punto decimal.</p>
    {StrError && <MensajeError StrMensaje={StrError} />}
    <div className="modal-acciones"><button type="button" onClick={Inventario_cancelar} disabled={BoolProcesando}>Cancelar</button><button className="boton-primario" disabled={BoolProcesando}>Guardar</button></div>
  </form>;
}
