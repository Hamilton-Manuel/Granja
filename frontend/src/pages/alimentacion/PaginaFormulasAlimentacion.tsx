import { useEffect, useState, type FormEvent } from "react";
import { DialogoConfirmacion } from "../../components/ui/DialogoConfirmacion";
import { InsigniaEstado } from "../../components/ui/InsigniaEstado";
import { Modal } from "../../components/ui/Modal";
import { useSesion } from "../../hooks/useSesion";
import { Alimentacion_mensajeError } from "../../hooks/useAlimentacion";
import {
  Alimentacion_crearFormula,
  Alimentacion_editarFormula,
  Alimentacion_estadoFormula,
  Alimentacion_listarFormulas,
  Alimentacion_listarProductos,
} from "../../services/alimentacion.service";
import type {
  FormulaAlimentacion,
  ProductoAlimentacion,
} from "../../types/alimentacion.types";
type Linea = { productoId: number; cantidad: string };
export function PaginaFormulasAlimentacion() {
  const { Autenticacion_tienePermiso: P } = useSesion();
  const [Arr, establecerArr] = useState<FormulaAlimentacion[]>([]);
  const [ArrProductos, establecerProductos] = useState<ProductoAlimentacion[]>(
    [],
  );
  const [ObjEditar, establecerEditar] = useState<
    FormulaAlimentacion | null | undefined
  >(undefined);
  const [ObjEstado, establecerEstado] = useState<FormulaAlimentacion | null>(
    null,
  );
  const [StrNombre, establecerNombre] = useState("");
  const [StrDescripcion, establecerDescripcion] = useState("");
  const [ArrLineas, establecerLineas] = useState<Linea[]>([]);
  const [StrError, establecerError] = useState<string | null>(null);
  const [BoolProcesando, establecerProcesando] = useState(false);
  async function Alimentacion_cargar() {
    try {
      const [F, Pr] = await Promise.all([
        Alimentacion_listarFormulas(),
        Alimentacion_listarProductos(),
      ]);
      establecerArr(F.datos);
      establecerProductos(
        Pr.datos.filter((x) => x.activo && x.habilitacionAlimentacion?.activo),
      );
    } catch (E) {
      establecerError(Alimentacion_mensajeError(E));
    }
  }
  useEffect(() => {
    void Alimentacion_cargar();
  }, []);
  function Alimentacion_abrir(Obj: FormulaAlimentacion | null) {
    establecerEditar(Obj);
    establecerNombre(Obj?.nombre ?? "");
    establecerDescripcion(Obj?.descripcion ?? "");
    establecerLineas(
      Obj?.detalles
        .filter((x) => x.activo)
        .map((x) => ({ productoId: x.productoId, cantidad: x.cantidad })) ?? [],
    );
  }
  async function Alimentacion_guardar(E: FormEvent) {
    E.preventDefault();
    const ObjPrimer = ArrProductos.find(
      (x) => x.productoId === ArrLineas[0]?.productoId,
    );
    if (!ObjPrimer || ArrLineas.length === 0) {
      establecerError("Agregue al menos un ingrediente habilitado.");
      return;
    }
    establecerProcesando(true);
    try {
      const D = {
        nombre: StrNombre.trim(),
        descripcion: StrDescripcion.trim() || null,
        cantidadBase: "1.0000",
        unidadBase: ObjPrimer.unidadMedida,
        detalles: ArrLineas,
      };
      if (ObjEditar) await Alimentacion_editarFormula(ObjEditar.formulaId, D);
      else await Alimentacion_crearFormula(D);
      establecerEditar(undefined);
      await Alimentacion_cargar();
    } catch (X) {
      establecerError(Alimentacion_mensajeError(X));
    } finally {
      establecerProcesando(false);
    }
  }
  async function Alimentacion_cambiarEstado() {
    if (!ObjEstado) return;
    establecerProcesando(true);
    try {
      await Alimentacion_estadoFormula(ObjEstado.formulaId, !ObjEstado.activo);
      establecerEstado(null);
      await Alimentacion_cargar();
    } catch (E) {
      establecerError(Alimentacion_mensajeError(E));
    } finally {
      establecerProcesando(false);
    }
  }
  return (
    <div className="alimentacion-contenido">
      <header className="alimentacion-seccion-encabezado">
        <div>
          <h2>Fórmulas</h2>
          <p>
            Plantillas opcionales; sus ingredientes pueden editarse antes de
            confirmar cada alimentación.
          </p>
        </div>
        {P("ALIMENTACION_FORMULAS_CREAR") && (
          <button
            className="boton-primario"
            onClick={() => Alimentacion_abrir(null)}
          >
            Nueva fórmula
          </button>
        )}
      </header>
      {StrError && (
        <p role="alert" className="mensaje-error">
          {StrError}
        </p>
      )}{" "}
      {Arr.length === 0 ? (
        <p className="alimentacion-vacio">No existen fórmulas.</p>
      ) : (
        <>
          <div className="alimentacion-tabla">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Ingredientes</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {Arr.map((F) => (
                  <tr key={F.formulaId}>
                    <td>{F.nombre}</td>
                    <td>{F.descripcion ?? "—"}</td>
                    <td>
                      {F.detalles
                        .filter((x) => x.activo)
                        .map((x) => (
                          <div key={x.detalleFormulaId}>
                            {x.producto.nombre}: {x.cantidad} {x.unidadMedida}
                          </div>
                        ))}
                    </td>
                    <td>
                      <InsigniaEstado
                        StrEstado={F.activo ? "ACTIVO" : "INACTIVO"}
                      />
                    </td>
                    <td>
                      {P("ALIMENTACION_FORMULAS_EDITAR") && (
                        <button onClick={() => Alimentacion_abrir(F)}>
                          Editar
                        </button>
                      )}
                      {P("ALIMENTACION_FORMULAS_CAMBIAR_ESTADO") && (
                        <button onClick={() => establecerEstado(F)}>
                          {F.activo ? "Inactivar" : "Activar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="alimentacion-tarjetas">
            {Arr.map((F) => (
              <article key={F.formulaId}>
                <h3>{F.nombre}</h3>
                <p>{F.descripcion ?? "Sin descripción"}</p>
                {F.detalles
                  .filter((x) => x.activo)
                  .map((x) => (
                    <p key={x.detalleFormulaId}>
                      {x.producto.nombre}: {x.cantidad} {x.unidadMedida}
                    </p>
                  ))}
                <InsigniaEstado StrEstado={F.activo ? "ACTIVO" : "INACTIVO"} />
                <div>
                  {P("ALIMENTACION_FORMULAS_EDITAR") && (
                    <button onClick={() => Alimentacion_abrir(F)}>
                      Editar
                    </button>
                  )}
                  {P("ALIMENTACION_FORMULAS_CAMBIAR_ESTADO") && (
                    <button onClick={() => establecerEstado(F)}>
                      {F.activo ? "Inactivar" : "Activar"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <Modal
        BoolAbierto={ObjEditar !== undefined}
        StrTitulo={ObjEditar ? "Editar fórmula" : "Nueva fórmula"}
        Autenticacion_cerrar={() => establecerEditar(undefined)}
      >
        <form
          className="alimentacion-formulario"
          onSubmit={(E) => void Alimentacion_guardar(E)}
        >
          <label>
            Nombre
            <input
              required
              maxLength={150}
              value={StrNombre}
              onChange={(E) => establecerNombre(E.target.value)}
            />
          </label>
          <label>
            Descripción
            <textarea
              maxLength={500}
              value={StrDescripcion}
              onChange={(E) => establecerDescripcion(E.target.value)}
            />
          </label>
          <fieldset>
            <legend>Ingredientes</legend>
            {ArrLineas.map((L, I) => (
              <div className="alimentacion-linea-formula" key={I}>
                <label>
                  Producto
                  <select
                    required
                    value={L.productoId}
                    onChange={(E) =>
                      establecerLineas((A) =>
                        A.map((X, J) =>
                          J === I
                            ? { ...X, productoId: Number(E.target.value) }
                            : X,
                        ),
                      )
                    }
                  >
                    <option value="">Seleccione</option>
                    {ArrProductos.map((X) => (
                      <option key={X.productoId} value={X.productoId}>
                        {X.codigo} — {X.nombre} — {X.unidadMedida}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cantidad
                  <input
                    required
                    inputMode="decimal"
                    value={L.cantidad}
                    onChange={(E) =>
                      establecerLineas((A) =>
                        A.map((X, J) =>
                          J === I ? { ...X, cantidad: E.target.value } : X,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    establecerLineas((A) => A.filter((_X, J) => J !== I))
                  }
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                establecerLineas((A) => [...A, { productoId: 0, cantidad: "" }])
              }
            >
              Agregar ingrediente
            </button>
          </fieldset>
          <button className="boton-primario" disabled={BoolProcesando}>
            {BoolProcesando ? "Guardando…" : "Guardar fórmula"}
          </button>
        </form>
      </Modal>
      <DialogoConfirmacion
        BoolAbierto={ObjEstado !== null}
        StrTitulo={ObjEstado?.activo ? "Inactivar fórmula" : "Activar fórmula"}
        StrMensaje="La fórmula y su historial se conservarán."
        StrConfirmar="Confirmar"
        BoolProcesando={BoolProcesando}
        Autenticacion_cancelar={() => establecerEstado(null)}
        Autenticacion_confirmar={() => void Alimentacion_cambiarEstado()}
      />
    </div>
  );
}
