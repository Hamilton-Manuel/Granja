import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useSesion } from "../hooks/useSesion";
import { ErrorApi } from "../types/api.types";

interface PropiedadesEncabezado {
  Autenticacion_abrirMenu: () => void;
}

export function Encabezado({ Autenticacion_abrirMenu }: PropiedadesEncabezado) {
  const { ObjUsuario, Autenticacion_cerrarSesion } = useSesion();
  const [BoolCerrando, establecerCerrando] = useState(false);
  const [StrError, establecerError] = useState<string | null>(null);
  const ObjNavegar = useNavigate();

  async function Autenticacion_procesarCierre(): Promise<void> {
    establecerCerrando(true);
    establecerError(null);
    try {
      await Autenticacion_cerrarSesion();
      ObjNavegar("/login", { replace: true });
    } catch (ObjError) {
      establecerError(ObjError instanceof ErrorApi ? ObjError.message : "No fue posible cerrar la sesión.");
    } finally {
      establecerCerrando(false);
    }
  }

  return (
    <header className="encabezado">
      <button className="boton-menu" type="button" aria-label="Abrir menú" onClick={Autenticacion_abrirMenu}>☰</button>
      <div className="encabezado-identidad">
        <span className="encabezado-avatar" aria-hidden="true">
          {ObjUsuario?.nombreCompleto.charAt(0).toUpperCase()}
        </span>
        <div>
          <strong>{ObjUsuario?.nombreCompleto}</strong>
          <span>{ObjUsuario?.rol.nombre}</span>
        </div>
      </div>
      <button className="boton-secundario" type="button" disabled={BoolCerrando} onClick={() => void Autenticacion_procesarCierre()}>
        {BoolCerrando ? "Cerrando…" : "Cerrar sesión"}
      </button>
      {StrError !== null && <p className="encabezado-error" role="alert">{StrError}</p>}
    </header>
  );
}
