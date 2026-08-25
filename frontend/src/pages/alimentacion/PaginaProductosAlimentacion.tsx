import { useEffect, useState } from "react";
import { DialogoConfirmacion } from "../../components/ui/DialogoConfirmacion";
import { IndicadorCarga } from "../../components/ui/IndicadorCarga";
import { InsigniaEstado } from "../../components/ui/InsigniaEstado";
import { MensajeError } from "../../components/ui/MensajeError";
import { Alimentacion_mensajeError } from "../../hooks/useAlimentacion";
import {
  Alimentacion_habilitarProducto,
  Alimentacion_listarProductos,
} from "../../services/alimentacion.service";
import type { ProductoAlimentacion } from "../../types/alimentacion.types";
export function PaginaProductosAlimentacion() {
  const [Arr, establecerArr] = useState<ProductoAlimentacion[]>([]);
  const [BoolCargando, establecerCargando] = useState(true);
  const [StrError, establecerError] = useState<string | null>(null);
  const [BoolProcesando, establecerProcesando] = useState(false);
  const [ObjCambio, establecerCambio] = useState<ProductoAlimentacion | null>(
    null,
  );
  async function Alimentacion_cargar() {
    establecerCargando(true);
    try {
      establecerArr((await Alimentacion_listarProductos()).datos);
    } catch (E) {
      establecerError(Alimentacion_mensajeError(E));
    } finally {
      establecerCargando(false);
    }
  }
  useEffect(() => {
    void Alimentacion_cargar();
  }, []);
  async function Alimentacion_cambiar() {
    if (!ObjCambio) return;
    establecerProcesando(true);
    try {
      await Alimentacion_habilitarProducto(
        ObjCambio.productoId,
        !ObjCambio.habilitacionAlimentacion?.activo,
      );
      establecerCambio(null);
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
          <h2>Productos habilitados</h2>
          <p>
            Define explícitamente qué insumos pueden utilizarse para
            Alimentación.
          </p>
        </div>
      </header>
      {StrError && <MensajeError StrMensaje={StrError} />}{" "}
      {BoolCargando ? (
        <IndicadorCarga />
      ) : Arr.length === 0 ? (
        <p className="alimentacion-vacio">
          No existen productos de Inventario.
        </p>
      ) : (
        <>
          <div className="alimentacion-tabla">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Unidad</th>
                  <th>Maneja lotes</th>
                  <th>Habilitado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {Arr.map((P) => (
                  <tr key={P.productoId}>
                    <td>{P.codigo}</td>
                    <td>{P.nombre}</td>
                    <td>{P.unidadMedida}</td>
                    <td>{P.manejaLotes ? "Sí" : "No"}</td>
                    <td>
                      <InsigniaEstado
                        StrEstado={
                          P.habilitacionAlimentacion?.activo
                            ? "ACTIVO"
                            : "INACTIVO"
                        }
                      />
                    </td>
                    <td>
                      <button onClick={() => establecerCambio(P)}>
                        {P.habilitacionAlimentacion?.activo
                          ? "Deshabilitar"
                          : "Habilitar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="alimentacion-tarjetas">
            {Arr.map((P) => (
              <article key={P.productoId}>
                <h3>
                  {P.codigo} · {P.nombre}
                </h3>
                <p>Unidad: {P.unidadMedida}</p>
                <p>Maneja lotes: {P.manejaLotes ? "Sí" : "No"}</p>
                <InsigniaEstado
                  StrEstado={
                    P.habilitacionAlimentacion?.activo ? "ACTIVO" : "INACTIVO"
                  }
                />
                <button onClick={() => establecerCambio(P)}>
                  {P.habilitacionAlimentacion?.activo
                    ? "Deshabilitar"
                    : "Habilitar"}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      <DialogoConfirmacion
        BoolAbierto={ObjCambio !== null}
        StrTitulo={
          ObjCambio?.habilitacionAlimentacion?.activo
            ? "Deshabilitar producto"
            : "Habilitar producto"
        }
        StrMensaje="El historial y las fórmulas existentes se conservarán. El cambio afectará únicamente confirmaciones nuevas."
        StrConfirmar="Confirmar"
        BoolProcesando={BoolProcesando}
        Autenticacion_cancelar={() => establecerCambio(null)}
        Autenticacion_confirmar={() => void Alimentacion_cambiar()}
      />
    </div>
  );
}
