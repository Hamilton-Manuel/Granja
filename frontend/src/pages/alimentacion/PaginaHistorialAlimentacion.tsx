import { useState } from "react";
import { DialogoConfirmacion } from "../../components/ui/DialogoConfirmacion";
import { IndicadorCarga } from "../../components/ui/IndicadorCarga";
import { InsigniaEstado } from "../../components/ui/InsigniaEstado";
import { MensajeError } from "../../components/ui/MensajeError";
import { Paginacion } from "../../components/ui/Paginacion";
import {
  useAlimentacion,
  Alimentacion_mensajeError,
} from "../../hooks/useAlimentacion";
import { useSesion } from "../../hooks/useSesion";
import { Alimentacion_revertir } from "../../services/alimentacion.service";
import type { RegistroAlimentacion } from "../../types/alimentacion.types";
import { Fecha_formatearTimestampGuatemala } from "../../utils/fecha";
function Alimentacion_destino(Obj: RegistroAlimentacion) {
  return Obj.animal
    ? `Alimentación individual · ${Obj.animal.identificacion}`
    : `Alimentación del lote ${Obj.lote?.codigo ?? "—"}`;
}
function Alimentacion_detalles(Obj: RegistroAlimentacion) {
  return (
    <ul className="alimentacion-detalles">
      {Obj.detalles.map((D) => (
        <li key={D.detalleAlimentacionId}>
          <strong>
            {D.producto.codigo} · {D.producto.nombre}
          </strong>
          <span>
            {D.cantidadConsumida} {D.unidadMedida}
          </span>
          <small>
            {D.existencia?.almacen.nombre ??
              D.existenciaLote?.existencia.almacen.nombre ??
              "—"}
            {D.existenciaLote
              ? ` · Lote ${D.existenciaLote.lote.codigoLote}`
              : ""}
          </small>
        </li>
      ))}
    </ul>
  );
}
export function PaginaHistorialAlimentacion() {
  const H = useAlimentacion();
  const { Autenticacion_tienePermiso: P } = useSesion();
  const [ObjRevertir, establecerRevertir] =
    useState<RegistroAlimentacion | null>(null);
  const [StrMotivo, establecerMotivo] = useState("");
  const [BoolProcesando, establecerProcesando] = useState(false);
  const [StrMutacion, establecerMutacion] = useState<string | null>(null);
  const [StrBusqueda, establecerBusqueda] = useState("");
  async function Alimentacion_confirmarReversion() {
    if (!ObjRevertir || !StrMotivo.trim()) return;
    establecerProcesando(true);
    establecerMutacion(null);
    try {
      await Alimentacion_revertir(ObjRevertir.alimentacionId, StrMotivo.trim());
      establecerRevertir(null);
      establecerMotivo("");
      await H.Alimentacion_cargar();
    } catch (E) {
      establecerMutacion(Alimentacion_mensajeError(E));
    } finally {
      establecerProcesando(false);
    }
  }
  return (
    <div className="alimentacion-contenido">
      <header className="alimentacion-seccion-encabezado">
        <div>
          <h2>Historial operativo</h2>
          <p>
            Consumos individuales y globales por lote, sin repartir cantidades
            entre animales.
          </p>
        </div>
      </header>
      <form
        className="alimentacion-filtros"
        onSubmit={(E) => {
          E.preventDefault();
          H.establecerConsulta({
            ...H.ObjConsulta,
            pagina: 1,
            busqueda: StrBusqueda || undefined,
          });
        }}
      >
        <label>
          Identificación animal o lote
          <input
            value={StrBusqueda}
            onChange={(E) => establecerBusqueda(E.target.value)}
            placeholder="Ej. ARETE-025 o ENG-01"
          />
        </label>
        <label>
          Estado
          <select
            value={H.ObjConsulta.estado ?? ""}
            onChange={(E) =>
              H.establecerConsulta({
                ...H.ObjConsulta,
                pagina: 1,
                estado: (E.target.value || undefined) as never,
              })
            }
          >
            <option value="">Todos</option>
            <option>CONFIRMADA</option>
            <option>REVERTIDA</option>
          </select>
        </label>
        <label>
          Destino
          <select
            value={H.ObjConsulta.destino ?? ""}
            onChange={(E) =>
              H.establecerConsulta({
                ...H.ObjConsulta,
                pagina: 1,
                destino: (E.target.value || undefined) as never,
              })
            }
          >
            <option value="">Todos</option>
            <option value="ANIMAL">Animal</option>
            <option value="LOTE">Lote</option>
          </select>
        </label>
        <label>
          Desde
          <input
            type="date"
            value={H.ObjConsulta.fechaDesde ?? ""}
            onChange={(E) =>
              H.establecerConsulta({
                ...H.ObjConsulta,
                pagina: 1,
                fechaDesde: E.target.value || undefined,
              })
            }
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={H.ObjConsulta.fechaHasta ?? ""}
            onChange={(E) =>
              H.establecerConsulta({
                ...H.ObjConsulta,
                pagina: 1,
                fechaHasta: E.target.value || undefined,
              })
            }
          />
        </label>
        <button className="boton-primario">Buscar</button>
      </form>
      {H.StrError && <MensajeError StrMensaje={H.StrError} />}{" "}
      {StrMutacion && <MensajeError StrMensaje={StrMutacion} />}{" "}
      {H.BoolCargando ? (
        <IndicadorCarga StrMensaje="Cargando alimentaciones…" />
      ) : H.ArrDatos.length === 0 ? (
        <p className="alimentacion-vacio">
          No existen alimentaciones para los filtros seleccionados.
        </p>
      ) : (
        <>
          <div className="alimentacion-tabla">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Destino</th>
                  <th>Detalle</th>
                  <th>Responsable</th>
                  <th>Fórmula</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {H.ArrDatos.map((A) => (
                  <tr key={A.alimentacionId}>
                    <td>
                      {Fecha_formatearTimestampGuatemala(A.fechaAlimentacion)}
                    </td>
                    <td>
                      <strong>{Alimentacion_destino(A)}</strong>
                      {A.lote && <small>Consumo global del lote</small>}
                    </td>
                    <td>{Alimentacion_detalles(A)}</td>
                    <td>{A.usuario.nombreCompleto}</td>
                    <td>{A.formula?.nombre ?? "—"}</td>
                    <td>
                      <InsigniaEstado StrEstado={A.estado} />
                    </td>
                    <td>
                      {P("ALIMENTACION_REVERTIR") &&
                        A.estado === "CONFIRMADA" && (
                          <button onClick={() => establecerRevertir(A)}>
                            Revertir
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="alimentacion-tarjetas">
            {H.ArrDatos.map((A) => (
              <article key={A.alimentacionId}>
                <time>
                  {Fecha_formatearTimestampGuatemala(A.fechaAlimentacion)}
                </time>
                <h3>{Alimentacion_destino(A)}</h3>
                {A.lote && (
                  <p className="alimentacion-global">
                    Consumo global del lote; no asignado individualmente.
                  </p>
                )}
                {Alimentacion_detalles(A)}
                <p>Responsable: {A.usuario.nombreCompleto}</p>
                <InsigniaEstado StrEstado={A.estado} />
                {P("ALIMENTACION_REVERTIR") && A.estado === "CONFIRMADA" && (
                  <button onClick={() => establecerRevertir(A)}>
                    Revertir alimentación
                  </button>
                )}
              </article>
            ))}
          </div>
        <Paginacion
          IntPagina={H.ObjConsulta.pagina}
          IntTotalPaginas={Math.ceil(H.IntTotal / H.ObjConsulta.limite)}
          Usuarios_cambiarPagina={(pagina) =>
            H.establecerConsulta({ ...H.ObjConsulta, pagina })
          }
        />
        </>
      )}{" "}
      {ObjRevertir && (
        <div className="alimentacion-motivo">
          <label>
            Motivo de reversión
            <input
              value={StrMotivo}
              onChange={(E) => establecerMotivo(E.target.value)}
              maxLength={500}
            />
          </label>
        </div>
      )}
      <DialogoConfirmacion
        BoolAbierto={ObjRevertir !== null}
        StrTitulo="Revertir alimentación completa"
        StrMensaje="Se restaurarán todos sus movimientos de Inventario. El registro original permanecerá para conservar trazabilidad."
        StrConfirmar="Revertir alimentación"
        BoolProcesando={BoolProcesando || !StrMotivo.trim()}
        Autenticacion_cancelar={() => {
          establecerRevertir(null);
          establecerMotivo("");
        }}
        Autenticacion_confirmar={() => void Alimentacion_confirmarReversion()}
      />
    </div>
  );
}
