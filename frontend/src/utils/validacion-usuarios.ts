import type { DatosCrearUsuario, DatosEditarUsuario } from "../types/usuarios.types";

export type ErroresFormularioUsuario = Partial<Record<keyof DatosCrearUsuario, string>>;

function Usuarios_validarCorreo(StrCorreo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(StrCorreo);
}

export function Usuarios_validarCreacion(ObjDatos: DatosCrearUsuario): ErroresFormularioUsuario {
  const ObjErrores: ErroresFormularioUsuario = {};
  const StrNombre = ObjDatos.nombreCompleto.trim();
  const StrUsuario = ObjDatos.nombreUsuario.trim();
  const StrCorreo = ObjDatos.correo.trim();
  if (StrNombre.length < 1 || StrNombre.length > 200) ObjErrores.nombreCompleto = "Ingrese entre 1 y 200 caracteres.";
  if (StrUsuario.length < 1 || StrUsuario.length > 100) ObjErrores.nombreUsuario = "Ingrese entre 1 y 100 caracteres.";
  if (StrCorreo.length > 200 || !Usuarios_validarCorreo(StrCorreo)) ObjErrores.correo = "Ingrese un correo válido de hasta 200 caracteres.";
  if (ObjDatos.contrasena.length < 8 || ObjDatos.contrasena.length > 128) ObjErrores.contrasena = "La contraseña debe tener entre 8 y 128 caracteres.";
  if (!Number.isInteger(ObjDatos.rolId) || ObjDatos.rolId <= 0) ObjErrores.rolId = "Seleccione un rol válido.";
  return ObjErrores;
}

export function Usuarios_obtenerCambiosEdicion(ObjOriginal: DatosEditarUsuario, ObjActual: DatosEditarUsuario): { ObjCambios: DatosEditarUsuario; ObjErrores: ErroresFormularioUsuario } {
  const ObjErrores: ErroresFormularioUsuario = {};
  const ObjCambios: DatosEditarUsuario = {};
  const StrNombre = ObjActual.nombreCompleto?.trim() ?? "";
  const StrUsuario = ObjActual.nombreUsuario?.trim() ?? "";
  const StrCorreo = ObjActual.correo?.trim() ?? "";
  if (StrNombre.length < 1 || StrNombre.length > 200) ObjErrores.nombreCompleto = "Ingrese entre 1 y 200 caracteres.";
  if (StrUsuario.length < 1 || StrUsuario.length > 100) ObjErrores.nombreUsuario = "Ingrese entre 1 y 100 caracteres.";
  if (StrCorreo.length > 200 || !Usuarios_validarCorreo(StrCorreo)) ObjErrores.correo = "Ingrese un correo válido de hasta 200 caracteres.";
  if (StrNombre !== ObjOriginal.nombreCompleto) ObjCambios.nombreCompleto = StrNombre;
  if (StrUsuario !== ObjOriginal.nombreUsuario) ObjCambios.nombreUsuario = StrUsuario;
  if (StrCorreo !== ObjOriginal.correo) ObjCambios.correo = StrCorreo;
  return { ObjCambios, ObjErrores };
}
