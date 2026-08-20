import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { MensajeError } from "../components/ui/MensajeError";
import { useSesion } from "../hooks/useSesion";
import { ErrorApi } from "../types/api.types";
import { Autenticacion_validarLogin, type ErroresLogin } from "../utils/validacion-login";

export function PaginaLogin() {
  const [StrIdentificador, establecerIdentificador] = useState("");
  const [StrContrasena, establecerContrasena] = useState("");
  const [ObjErrores, establecerErrores] = useState<ErroresLogin>({});
  const [StrErrorSolicitud, establecerErrorSolicitud] = useState<string | null>(null);
  const [BoolEnviando, establecerEnviando] = useState(false);
  const { Autenticacion_iniciarSesion } = useSesion();
  const ObjNavegar = useNavigate();

  async function Autenticacion_procesarLogin(ObjEvento: FormEvent<HTMLFormElement>): Promise<void> {
    ObjEvento.preventDefault();
    const ObjErroresValidacion = Autenticacion_validarLogin(StrIdentificador, StrContrasena);
    establecerErrores(ObjErroresValidacion);
    establecerErrorSolicitud(null);
    if (Object.keys(ObjErroresValidacion).length > 0) return;

    establecerEnviando(true);
    try {
      await Autenticacion_iniciarSesion(StrIdentificador.trim(), StrContrasena);
      ObjNavegar("/inicio", { replace: true });
    } catch (ObjError) {
      if (ObjError instanceof ErrorApi) {
        if (ObjError.IntEstadoHttp === 401) {
          establecerErrorSolicitud("Las credenciales proporcionadas no son válidas.");
        } else if (ObjError.IntEstadoHttp === 429) {
          establecerErrorSolicitud("Se realizaron demasiados intentos. Intente nuevamente más tarde.");
        } else {
          establecerErrorSolicitud(ObjError.message);
        }
      } else {
        establecerErrorSolicitud("No fue posible iniciar sesión. Intente nuevamente.");
      }
    } finally {
      establecerEnviando(false);
    }
  }

  return (
    <main className="pagina-login">
      <section className="login-presentacion" aria-label="Granja El Chiflón">
        <div className="login-marca">
          <span className="login-sello" aria-hidden="true">EC</span>
          <span>Granja El Chiflón</span>
        </div>
        <div className="login-mensaje">
          <p className="etiqueta">Administración y trazabilidad</p>
          <h1>Información clara para cuidar cada etapa de la granja.</h1>
          <p>Gestione registros operativos y administrativos desde un espacio seguro y ordenado.</p>
        </div>
        <p className="login-ubicacion">Rabinal · Baja Verapaz</p>
      </section>

      <section className="login-acceso">
        <div className="login-formulario-contenedor">
          <div className="login-titulo">
            <p className="etiqueta">Bienvenido</p>
            <h2>Iniciar sesión</h2>
            <p>Ingrese con su nombre de usuario o correo electrónico.</p>
          </div>
          {StrErrorSolicitud !== null && <MensajeError StrMensaje={StrErrorSolicitud} />}
          <form className="login-formulario" noValidate onSubmit={(ObjEvento) => void Autenticacion_procesarLogin(ObjEvento)}>
            <label htmlFor="identificador">Usuario o correo</label>
            <input
              id="identificador"
              name="identificador"
              type="text"
              autoComplete="username"
              autoFocus
              value={StrIdentificador}
              aria-invalid={ObjErrores.StrIdentificador !== undefined}
              aria-describedby={ObjErrores.StrIdentificador === undefined ? undefined : "error-identificador"}
              onChange={(ObjEvento) => establecerIdentificador(ObjEvento.target.value)}
            />
            {ObjErrores.StrIdentificador !== undefined && <span id="error-identificador" className="campo-error">{ObjErrores.StrIdentificador}</span>}

            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              name="contrasena"
              type="password"
              autoComplete="current-password"
              maxLength={128}
              value={StrContrasena}
              aria-invalid={ObjErrores.StrContrasena !== undefined}
              aria-describedby={ObjErrores.StrContrasena === undefined ? undefined : "error-contrasena"}
              onChange={(ObjEvento) => establecerContrasena(ObjEvento.target.value)}
            />
            {ObjErrores.StrContrasena !== undefined && <span id="error-contrasena" className="campo-error">{ObjErrores.StrContrasena}</span>}

            <button className="boton-primario" type="submit" disabled={BoolEnviando}>
              {BoolEnviando ? "Verificando…" : "Ingresar"}
            </button>
          </form>
          <p className="login-seguridad">Su sesión se protege mediante una cookie segura que no es accesible desde esta aplicación.</p>
        </div>
      </section>
    </main>
  );
}
