import { Modal } from "./Modal";

interface PropiedadesDialogoConfirmacion {
  BoolAbierto: boolean;
  StrTitulo: string;
  StrMensaje: string;
  StrConfirmar: string;
  BoolProcesando: boolean;
  Autenticacion_cancelar: () => void;
  Autenticacion_confirmar: () => void;
}

export function DialogoConfirmacion(ObjPropiedades: PropiedadesDialogoConfirmacion) {
  return (
    <Modal BoolAbierto={ObjPropiedades.BoolAbierto} StrTitulo={ObjPropiedades.StrTitulo} Autenticacion_cerrar={ObjPropiedades.Autenticacion_cancelar}>
      <p className="dialogo-mensaje">{ObjPropiedades.StrMensaje}</p>
      <div className="modal-acciones">
        <button type="button" className="boton-secundario" disabled={ObjPropiedades.BoolProcesando} onClick={ObjPropiedades.Autenticacion_cancelar}>Cancelar</button>
        <button type="button" className="boton-peligro" disabled={ObjPropiedades.BoolProcesando} onClick={ObjPropiedades.Autenticacion_confirmar}>
          {ObjPropiedades.BoolProcesando ? "Procesando…" : ObjPropiedades.StrConfirmar}
        </button>
      </div>
    </Modal>
  );
}
