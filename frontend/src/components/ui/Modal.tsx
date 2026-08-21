import { useEffect, useId, useRef, type ReactNode } from "react";

interface PropiedadesModal {
  BoolAbierto: boolean;
  StrTitulo: string;
  Autenticacion_cerrar: () => void;
  children: ReactNode;
}

export function Modal({ BoolAbierto, StrTitulo, Autenticacion_cerrar, children: ObjContenido }: PropiedadesModal) {
  const ObjDialogo = useRef<HTMLDialogElement>(null);
  const ObjFocoAnterior = useRef<HTMLElement | null>(null);
  const StrTituloId = useId();

  useEffect(() => {
    const ObjElemento = ObjDialogo.current;
    if (ObjElemento === null) return;
    if (BoolAbierto && !ObjElemento.open) {
      ObjFocoAnterior.current = document.activeElement as HTMLElement | null;
      ObjElemento.showModal();
    } else if (!BoolAbierto && ObjElemento.open) {
      ObjElemento.close();
      ObjFocoAnterior.current?.focus();
    }
  }, [BoolAbierto]);

  return (
    <dialog
      ref={ObjDialogo}
      className="modal"
      aria-labelledby={StrTituloId}
      onCancel={(ObjEvento) => { ObjEvento.preventDefault(); Autenticacion_cerrar(); }}
      onClose={() => ObjFocoAnterior.current?.focus()}
    >
      <div className="modal-encabezado">
        <h2 id={StrTituloId}>{StrTitulo}</h2>
        <button type="button" className="boton-icono" aria-label={`Cerrar ${StrTitulo}`} onClick={Autenticacion_cerrar}>×</button>
      </div>
      {ObjContenido}
    </dialog>
  );
}
