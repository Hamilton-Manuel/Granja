import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MensajeError } from "../../components/ui/MensajeError";
import { Paginacion } from "../../components/ui/Paginacion";
import { IndicadorCarga } from "../../components/ui/IndicadorCarga";
import { InsigniaEstado } from "../../components/ui/InsigniaEstado";
import { useConcentradosLista, Alimentacion_decimal as D } from "../../components/alimentacion/ConcentradosCompartidos";
import { Alimentacion_historialConcentrados } from "../../services/concentrados.service";
import { Fecha_formatearTimestampGuatemala } from "../../utils/fecha";

export function PaginaHistorialConcentrados() {
  const [ObjParametros] = useSearchParams();
  const IntConcentrado = Number(ObjParametros.get("concentradoId")) || undefined;
  const H = useConcentradosLista(Alimentacion_historialConcentrados, IntConcentrado);
  const [StrBusqueda, establecerBusqueda] = useState("");
  return <section className="alimentacion-contenido"><h2>Historial de elaboraciones</h2>
    {IntConcentrado && <Link to="/alimentacion/concentrados/historial">Ver todo el historial</Link>}
    <form className="alimentacion-filtros" onSubmit={E => { E.preventDefault(); H.establecerConsulta({ ...H.ObjConsulta, pagina: 1, busqueda: StrBusqueda }); }}><label>Buscar producto o receta<input maxLength={100} value={StrBusqueda} onChange={E => establecerBusqueda(E.target.value)} /></label><button>Buscar</button></form>
    {H.StrError && <MensajeError StrMensaje={H.StrError} />}
    {H.BoolCargando ? <IndicadorCarga StrMensaje="Cargando historial…" /> : <div className="alimentacion-tabla"><table><thead><tr><th>Fecha</th><th>Producto</th><th>Receta</th><th>Cantidad real</th><th>Costo</th><th>Estado</th><th>Usuario</th><th>Acciones</th></tr></thead><tbody>
      {H.ArrDatos.map(Obj => <tr key={Obj.elaboracionId}><td>{Fecha_formatearTimestampGuatemala(Obj.fechaEfectiva)}</td><td>{Obj.codigoProductoSnapshot} · {Obj.nombreProductoSnapshot}</td><td>{Obj.nombreRecetaSnapshot} · v{Obj.versionReceta}</td><td>{D(Obj.cantidadRealBase)} {Obj.unidadBaseSnapshot}</td><td>Q{D(Obj.costoTotal)}</td><td><InsigniaEstado StrEstado={Obj.estado} /></td><td>{Obj.usuario?.nombreCompleto ?? "—"}</td><td><Link to={`/alimentacion/concentrados/historial/${Obj.elaboracionId}`}>Ver detalle #{Obj.elaboracionId}</Link></td></tr>)}
    </tbody></table>{!H.ArrDatos.length && <p className="alimentacion-vacio">No hay elaboraciones para esta búsqueda.</p>}</div>}
    <Paginacion IntPagina={H.ObjConsulta.pagina} IntTotalPaginas={Math.ceil(H.IntTotal / H.ObjConsulta.limite)} Usuarios_cambiarPagina={pagina => H.establecerConsulta({ ...H.ObjConsulta, pagina })} />
  </section>;
}
