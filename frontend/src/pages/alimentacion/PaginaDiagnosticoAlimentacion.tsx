import { useState } from "react";
import { DialogoConfirmacion } from "../../components/ui/DialogoConfirmacion";
import { Alimentacion_mensajeError } from "../../hooks/useAlimentacion";
import { Alimentacion_ejecutarDiagnostico } from "../../services/alimentacion.service";
import type { DiagnosticoAlimentacion } from "../../types/alimentacion.types";
import { Fecha_formatearTimestampGuatemala } from "../../utils/fecha";
export function PaginaDiagnosticoAlimentacion() {
  const [BoolConfirmar, establecerConfirmar] = useState(false);
  const [BoolProcesando, establecerProcesando] = useState(false);
  const [Obj, establecerObj] = useState<DiagnosticoAlimentacion | null>(null);
  const [StrError, establecerError] = useState<string | null>(null);
  async function Alimentacion_ejecutar() {
    establecerProcesando(true);
    try {
      establecerObj((await Alimentacion_ejecutarDiagnostico()).datos);
      establecerConfirmar(false);
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
          <h2>Diagnóstico de consistencia</h2>
          <p>
            Comprueba Alimentación, Inventario y Producción sin corregir datos.
          </p>
        </div>
        <button
          className="boton-primario"
          onClick={() => establecerConfirmar(true)}
        >
          Ejecutar diagnóstico
        </button>
      </header>
      <p className="alimentacion-aviso">
        El diagnóstico no autocorrige ni modifica saldos.
      </p>
      {StrError && <p role="alert">{StrError}</p>}
      {Obj && (
        <section
          className={
            Obj.consistente ? "alimentacion-correcto" : "alimentacion-alerta"
          }
          role="status"
        >
          <h3>Consistente: {Obj.consistente ? "Sí" : "No"}</h3>
          <p>{Fecha_formatearTimestampGuatemala(Obj.fechaDiagnostico)}</p>
          <div className="alimentacion-metricas">
            <article>
              <span>Detalles sin movimiento</span>
              <strong>{Obj.diferencias.detallesSinMovimiento}</strong>
            </article>
            <article>
              <span>Movimientos huérfanos</span>
              <strong>{Obj.diferencias.movimientosHuerfanos}</strong>
            </article>
            <article>
              <span>Registros sin evento</span>
              <strong>{Obj.diferencias.registrosSinEvento}</strong>
            </article>
          </div>
        </section>
      )}
      <DialogoConfirmacion
        BoolAbierto={BoolConfirmar}
        StrTitulo="Ejecutar diagnóstico"
        StrMensaje="Se comprobarán referencias y consistencia. No se corregirá información automáticamente."
        StrConfirmar="Ejecutar"
        BoolProcesando={BoolProcesando}
        Autenticacion_cancelar={() => establecerConfirmar(false)}
        Autenticacion_confirmar={() => void Alimentacion_ejecutar()}
      />
    </div>
  );
}
