export interface ErroresLogin {
  StrIdentificador?: string;
  StrContrasena?: string;
}

export function Autenticacion_validarLogin(
  StrIdentificador: string,
  StrContrasena: string,
): ErroresLogin {
  const ObjErrores: ErroresLogin = {};
  const StrIdentificadorLimpio = StrIdentificador.trim();
  if (StrIdentificadorLimpio.length === 0) {
    ObjErrores.StrIdentificador = "Ingrese su usuario o correo.";
  } else if (StrIdentificadorLimpio.length > 200) {
    ObjErrores.StrIdentificador = "El identificador no puede superar 200 caracteres.";
  }
  if (StrContrasena.length === 0) {
    ObjErrores.StrContrasena = "Ingrese su contraseña.";
  } else if (StrContrasena.length > 128) {
    ObjErrores.StrContrasena = "La contraseña no puede superar 128 caracteres.";
  }
  return ObjErrores;
}
