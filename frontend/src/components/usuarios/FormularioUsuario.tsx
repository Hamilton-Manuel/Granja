import { useEffect, useState, type FormEvent } from "react";

import { ErrorApi } from "../../types/api.types";
import type { DatosCrearUsuario, DatosEditarUsuario, RolAdministrativo, UsuarioAdministrativo } from "../../types/usuarios.types";
import { Usuarios_obtenerCambiosEdicion, Usuarios_validarCreacion, type ErroresFormularioUsuario } from "../../utils/validacion-usuarios";

interface PropiedadesFormularioUsuario {
  StrModo: "crear" | "editar";
  ObjUsuario?: UsuarioAdministrativo | undefined;
  ArrRoles?: RolAdministrativo[] | undefined;
  BoolProcesando: boolean;
  Usuarios_cancelar: () => void;
  Usuarios_guardar: (ObjDatos: DatosCrearUsuario | DatosEditarUsuario) => Promise<void>;
}

const ObjDatosVacios: DatosCrearUsuario = { nombreCompleto: "", nombreUsuario: "", correo: "", contrasena: "", rolId: 0 };

export function FormularioUsuario({ StrModo, ObjUsuario, ArrRoles = [], BoolProcesando, Usuarios_cancelar, Usuarios_guardar }: PropiedadesFormularioUsuario) {
  const [ObjDatos, establecerDatos] = useState<DatosCrearUsuario>(ObjDatosVacios);
  const [ObjErrores, establecerErrores] = useState<ErroresFormularioUsuario>({});

  useEffect(() => {
    establecerDatos(ObjUsuario === undefined ? ObjDatosVacios : {
      nombreCompleto: ObjUsuario.nombreCompleto,
      nombreUsuario: ObjUsuario.nombreUsuario,
      correo: ObjUsuario.correo,
      contrasena: "",
      rolId: ObjUsuario.rol.rolId,
    });
    establecerErrores({});
  }, [ObjUsuario, StrModo]);

  function Usuarios_actualizarCampo(StrCampo: keyof DatosCrearUsuario, StrValor: string): void {
    establecerDatos((ObjActual) => ({ ...ObjActual, [StrCampo]: StrCampo === "rolId" ? Number(StrValor) : StrValor }));
    establecerErrores((ObjActual) => ({ ...ObjActual, [StrCampo]: undefined }));
  }

  async function Usuarios_enviar(ObjEvento: FormEvent): Promise<void> {
    ObjEvento.preventDefault();
    if (BoolProcesando) return;
    let ObjDatosEnviar: DatosCrearUsuario | DatosEditarUsuario;
    let ObjErroresNuevos: ErroresFormularioUsuario;
    if (StrModo === "crear") {
      ObjErroresNuevos = Usuarios_validarCreacion(ObjDatos);
      ObjDatosEnviar = { ...ObjDatos, nombreCompleto: ObjDatos.nombreCompleto.trim(), nombreUsuario: ObjDatos.nombreUsuario.trim(), correo: ObjDatos.correo.trim() };
    } else {
      const ObjResultado = Usuarios_obtenerCambiosEdicion(
        { nombreCompleto: ObjUsuario?.nombreCompleto, nombreUsuario: ObjUsuario?.nombreUsuario, correo: ObjUsuario?.correo },
        ObjDatos,
      );
      ObjErroresNuevos = ObjResultado.ObjErrores;
      ObjDatosEnviar = ObjResultado.ObjCambios;
      if (Object.keys(ObjDatosEnviar).length === 0) ObjErroresNuevos.nombreCompleto = "No hay cambios para guardar.";
    }
    establecerErrores(ObjErroresNuevos);
    if (Object.keys(ObjErroresNuevos).length > 0) return;
    try {
      await Usuarios_guardar(ObjDatosEnviar);
      establecerDatos(ObjDatosVacios);
    } catch (ObjError) {
      if (ObjError instanceof ErrorApi && ObjError.StrCodigo === "CORREO_DUPLICADO") establecerErrores({ correo: "Este correo ya está registrado." });
      if (ObjError instanceof ErrorApi && ObjError.StrCodigo === "NOMBRE_USUARIO_DUPLICADO") establecerErrores({ nombreUsuario: "Este nombre de usuario ya está registrado." });
    }
  }

  function Usuarios_campo(StrCampo: "nombreCompleto" | "nombreUsuario" | "correo", StrEtiqueta: string, StrTipo = "text") {
    const StrError = ObjErrores[StrCampo];
    return (
      <div className="campo-formulario">
        <label htmlFor={`usuario-${StrModo}-${StrCampo}`}>{StrEtiqueta}</label>
        <input id={`usuario-${StrModo}-${StrCampo}`} type={StrTipo} value={ObjDatos[StrCampo]} maxLength={StrCampo === "nombreCompleto" || StrCampo === "correo" ? 200 : 100} aria-invalid={StrError !== undefined} aria-describedby={StrError ? `error-${StrModo}-${StrCampo}` : undefined} onChange={(ObjEvento) => Usuarios_actualizarCampo(StrCampo, ObjEvento.target.value)} />
        {StrError && <span id={`error-${StrModo}-${StrCampo}`} className="campo-error">{StrError}</span>}
      </div>
    );
  }

  return (
    <form onSubmit={(ObjEvento) => void Usuarios_enviar(ObjEvento)} noValidate>
      {Usuarios_campo("nombreCompleto", "Nombre completo")}
      {Usuarios_campo("nombreUsuario", "Nombre de usuario")}
      {Usuarios_campo("correo", "Correo", "email")}
      {StrModo === "crear" && (
        <>
          <div className="campo-formulario">
            <label htmlFor="usuario-crear-contrasena">Contraseña inicial</label>
            <input id="usuario-crear-contrasena" type="password" value={ObjDatos.contrasena} minLength={8} maxLength={128} autoComplete="new-password" aria-invalid={ObjErrores.contrasena !== undefined} aria-describedby={ObjErrores.contrasena ? "error-crear-contrasena" : undefined} onChange={(ObjEvento) => Usuarios_actualizarCampo("contrasena", ObjEvento.target.value)} />
            {ObjErrores.contrasena && <span id="error-crear-contrasena" className="campo-error">{ObjErrores.contrasena}</span>}
          </div>
          <div className="campo-formulario">
            <label htmlFor="usuario-crear-rol">Rol</label>
            <select id="usuario-crear-rol" value={ObjDatos.rolId} aria-invalid={ObjErrores.rolId !== undefined} aria-describedby={ObjErrores.rolId ? "error-crear-rol" : undefined} onChange={(ObjEvento) => Usuarios_actualizarCampo("rolId", ObjEvento.target.value)}>
              <option value={0}>Seleccione un rol</option>
              {ArrRoles.map((ObjRol) => <option key={ObjRol.rolId} value={ObjRol.rolId}>{ObjRol.nombre}</option>)}
            </select>
            {ObjErrores.rolId && <span id="error-crear-rol" className="campo-error">{ObjErrores.rolId}</span>}
          </div>
        </>
      )}
      <div className="modal-acciones">
        <button type="button" className="boton-secundario" disabled={BoolProcesando} onClick={Usuarios_cancelar}>Cancelar</button>
        <button type="submit" className="boton-primario" disabled={BoolProcesando}>{BoolProcesando ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}
