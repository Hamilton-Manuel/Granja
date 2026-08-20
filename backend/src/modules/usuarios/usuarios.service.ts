import { Prisma } from "../../../generated/prisma/client.js";
import {
  Autenticacion_generarTokenSesion,
  Autenticacion_hashearContrasena,
  Autenticacion_hashearTokenSesion,
  Autenticacion_verificarContrasena,
  Autenticacion_verificarContrasenaFicticia,
} from "../../auth/autenticacion.js";
import { Configuracion_obtenerEntorno } from "../../config/configuracion-entorno.js";
import {
  Fecha_calcularExpiracionGuatemala,
  Fecha_convertirAlmacenamientoGuatemalaAInstante,
  Fecha_convertirInstanteAAlmacenamientoGuatemala,
  Fecha_formatearInstanteGuatemala,
  Fecha_obtenerInstanteActual,
} from "../../datetime/fecha.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import * as ObjRepositorio from "./usuarios.repository.js";

function Usuarios_obtenerPermisosActivos(ObjCuenta: Awaited<ReturnType<typeof ObjRepositorio.Usuarios_buscarCuentaPorIdentificador>>): string[] {
  if (ObjCuenta === null) {
    return [];
  }
  return ObjCuenta.rol.rolesPermisos
    .filter((ObjAsignacion) => ObjAsignacion.permiso.activo)
    .map((ObjAsignacion) => ObjAsignacion.permiso.codigo);
}

function Usuarios_sanitizarCuentaAutenticacion(ObjCuenta: NonNullable<Awaited<ReturnType<typeof ObjRepositorio.Usuarios_buscarCuentaPorIdentificador>>>) {
  return {
    usuarioId: ObjCuenta.usuarioId,
    nombreCompleto: ObjCuenta.nombreCompleto,
    nombreUsuario: ObjCuenta.nombreUsuario,
    correo: ObjCuenta.correo,
    estado: ObjCuenta.estado,
    rol: {
      rolId: ObjCuenta.rol.rolId,
      nombre: ObjCuenta.rol.nombre,
    },
    permisos: Usuarios_obtenerPermisosActivos(ObjCuenta),
  };
}

function Usuarios_formatearCuentaPublica<
  T extends { fechaCreacion: Date; fechaActualizacion: Date },
>(ObjCuenta: T) {
  return {
    ...ObjCuenta,
    fechaCreacion: Fecha_formatearInstanteGuatemala(
      Usuarios_convertirFechaRepositorioAInstante(ObjCuenta.fechaCreacion),
    ),
    fechaActualizacion: Fecha_formatearInstanteGuatemala(
      Usuarios_convertirFechaRepositorioAInstante(ObjCuenta.fechaActualizacion),
    ),
  };
}

function Usuarios_convertirFechaRepositorioAInstante(DtFecha: Date): Date {
  return Fecha_convertirAlmacenamientoGuatemalaAInstante(DtFecha);
}

function Usuarios_lanzarErrorCredenciales(): never {
  throw new ErrorAplicacion(
    401,
    "CREDENCIALES_INVALIDAS",
    "Las credenciales proporcionadas no son válidas.",
  );
}

export async function Usuarios_iniciarSesion(
  StrIdentificador: string,
  StrContrasena: string,
  StrDireccionIp: string | undefined,
) {
  const ObjCuenta = await ObjRepositorio.Usuarios_buscarCuentaPorIdentificador(
    StrIdentificador,
  );

  if (ObjCuenta === null) {
    await Autenticacion_verificarContrasenaFicticia(StrContrasena);
    await ObjRepositorio.Usuarios_registrarLoginFallido(undefined, "NO_IDENTIFICADO", StrDireccionIp);
    Usuarios_lanzarErrorCredenciales();
  }

  const BoolContrasenaValida = await Autenticacion_verificarContrasena(
    ObjCuenta.contrasenaHash,
    StrContrasena,
  );
  let StrResultadoFallo: string | undefined;
  if (!BoolContrasenaValida) StrResultadoFallo = "CREDENCIAL_INVALIDA";
  else if (ObjCuenta.estado !== "ACTIVO") StrResultadoFallo = "USUARIO_INACTIVO";
  else if (!ObjCuenta.rol.activo) StrResultadoFallo = "ROL_INACTIVO";

  if (StrResultadoFallo !== undefined) {
    await ObjRepositorio.Usuarios_registrarLoginFallido(ObjCuenta.usuarioId, StrResultadoFallo, StrDireccionIp);
    Usuarios_lanzarErrorCredenciales();
  }

  const StrToken = Autenticacion_generarTokenSesion();
  const StrTokenHash = Autenticacion_hashearTokenSesion(StrToken);
  const ObjEntorno = Configuracion_obtenerEntorno();
  const DtInstanteInicio = Fecha_obtenerInstanteActual();
  const ObjExpiracion = Fecha_calcularExpiracionGuatemala(
    DtInstanteInicio,
    ObjEntorno.SESSION_DURATION_HOURS,
  );
  await ObjRepositorio.Usuarios_crearSesion(
    ObjCuenta.usuarioId,
    StrTokenHash,
    Fecha_convertirInstanteAAlmacenamientoGuatemala(DtInstanteInicio),
    ObjExpiracion.DtExpiracionAlmacenamiento,
    StrDireccionIp,
  );

  return {
    StrToken,
    DtFechaExpiracion: ObjExpiracion.DtExpiracionInstante,
    StrFechaExpiracion: Fecha_formatearInstanteGuatemala(
      ObjExpiracion.DtExpiracionInstante,
    ),
    ObjUsuario: Usuarios_sanitizarCuentaAutenticacion(ObjCuenta),
  };
}

export async function Usuarios_cerrarSesion(
  IntSesionId: number,
  IntUsuarioId: number,
  StrDireccionIp: string | undefined,
): Promise<void> {
  await ObjRepositorio.Usuarios_cerrarSesion(IntSesionId, IntUsuarioId, StrDireccionIp);
}

export async function Usuarios_obtenerSesionActual(IntUsuarioId: number) {
  const ObjCuenta = await ObjRepositorio.Usuarios_buscarCuentaAutenticacionPorId(IntUsuarioId);
  if (ObjCuenta === null) {
    throw new ErrorAplicacion(401, "SESION_INVALIDA", "La sesión no es válida.");
  }
  return Usuarios_sanitizarCuentaAutenticacion(ObjCuenta);
}

export async function Usuarios_listar(ObjDatos: {
  IntPagina: number;
  IntLimite: number;
  StrBusqueda?: string | undefined;
  StrEstado?: string | undefined;
  IntRolId?: number | undefined;
}) {
  const ObjResultado = await ObjRepositorio.Usuarios_listarCuentas(ObjDatos);
  return {
    ...ObjResultado,
    ArrUsuarios: ObjResultado.ArrUsuarios.map(Usuarios_formatearCuentaPublica),
  };
}

export async function Usuarios_obtenerPorId(IntUsuarioId: number) {
  const ObjUsuario = await ObjRepositorio.Usuarios_obtenerCuentaPublica(IntUsuarioId);
  if (ObjUsuario === null) {
    throw new ErrorAplicacion(404, "USUARIO_NO_ENCONTRADO", "El usuario no existe.");
  }
  return Usuarios_formatearCuentaPublica(ObjUsuario);
}

async function Usuarios_validarRolActivo(IntRolId: number): Promise<void> {
  const ObjRol = await ObjRepositorio.Usuarios_obtenerRol(IntRolId);
  if (ObjRol === null) {
    throw new ErrorAplicacion(404, "ROL_NO_ENCONTRADO", "El rol no existe.");
  }
  if (!ObjRol.activo) {
    throw new ErrorAplicacion(409, "ROL_INACTIVO", "No puede asignarse un rol inactivo.");
  }
}

function Usuarios_convertirErrorUnicidad(ObjError: unknown): never {
  if (ObjError instanceof Prisma.PrismaClientKnownRequestError && ObjError.code === "P2002") {
    const StrObjetivo = JSON.stringify(ObjError.meta?.target ?? "");
    if (StrObjetivo.includes("correo")) {
      throw new ErrorAplicacion(409, "CORREO_DUPLICADO", "El correo ya está registrado.");
    }
    throw new ErrorAplicacion(409, "NOMBRE_USUARIO_DUPLICADO", "El nombre de usuario ya está registrado.");
  }
  throw ObjError;
}

export async function Usuarios_crear(ObjDatos: Parameters<typeof ObjRepositorio.Usuarios_crearCuenta>[0]) {
  await Usuarios_validarRolActivo(ObjDatos.IntRolId);
  try {
    const ObjUsuario = await ObjRepositorio.Usuarios_crearCuenta({
      ...ObjDatos,
      StrContrasenaHash: await Autenticacion_hashearContrasena(ObjDatos.StrContrasenaHash),
    });
    return Usuarios_formatearCuentaPublica(ObjUsuario);
  } catch (ObjError) {
    Usuarios_convertirErrorUnicidad(ObjError);
  }
}

export async function Usuarios_editar(ObjDatos: Parameters<typeof ObjRepositorio.Usuarios_editarCuenta>[0]) {
  await Usuarios_obtenerPorId(ObjDatos.IntUsuarioId);
  try {
    return Usuarios_formatearCuentaPublica(
      await ObjRepositorio.Usuarios_editarCuenta(ObjDatos),
    );
  } catch (ObjError) {
    Usuarios_convertirErrorUnicidad(ObjError);
  }
}

export async function Usuarios_cambiarEstado(ObjDatos: Parameters<typeof ObjRepositorio.Usuarios_cambiarEstadoCuenta>[0]) {
  if (ObjDatos.IntUsuarioId === ObjDatos.IntUsuarioActorId) {
    throw new ErrorAplicacion(409, "OPERACION_NO_PERMITIDA", "No puede cambiar su propio estado.");
  }
  await Usuarios_obtenerPorId(ObjDatos.IntUsuarioId);
  return Usuarios_formatearCuentaPublica(
    await ObjRepositorio.Usuarios_cambiarEstadoCuenta(ObjDatos),
  );
}

export async function Usuarios_cambiarRol(ObjDatos: Parameters<typeof ObjRepositorio.Usuarios_cambiarRolCuenta>[0]) {
  if (ObjDatos.IntUsuarioId === ObjDatos.IntUsuarioActorId) {
    throw new ErrorAplicacion(409, "OPERACION_NO_PERMITIDA", "No puede cambiar su propio rol.");
  }
  await Usuarios_obtenerPorId(ObjDatos.IntUsuarioId);
  await Usuarios_validarRolActivo(ObjDatos.IntRolId);
  return Usuarios_formatearCuentaPublica(
    await ObjRepositorio.Usuarios_cambiarRolCuenta(ObjDatos),
  );
}

export async function Usuarios_cambiarContrasena(ObjDatos: {
  IntUsuarioId: number;
  StrContrasenaActual: string;
  StrContrasenaNueva: string;
  StrDireccionIp?: string | undefined;
}): Promise<void> {
  const ObjCuenta = await ObjRepositorio.Usuarios_buscarCuentaAutenticacionPorId(ObjDatos.IntUsuarioId);
  if (ObjCuenta === null || !(await Autenticacion_verificarContrasena(ObjCuenta.contrasenaHash, ObjDatos.StrContrasenaActual))) {
    throw new ErrorAplicacion(401, "CONTRASENA_ACTUAL_INVALIDA", "La contraseña actual no es válida.");
  }
  const StrContrasenaHash = await Autenticacion_hashearContrasena(ObjDatos.StrContrasenaNueva);
  await ObjRepositorio.Usuarios_cambiarContrasenaCuenta({
    IntUsuarioId: ObjDatos.IntUsuarioId,
    StrContrasenaHash,
    StrDireccionIp: ObjDatos.StrDireccionIp,
  });
}

export async function Usuarios_revocarSesiones(ObjDatos: Parameters<typeof ObjRepositorio.Usuarios_revocarSesionesCuenta>[0]): Promise<void> {
  await Usuarios_obtenerPorId(ObjDatos.IntUsuarioId);
  await ObjRepositorio.Usuarios_revocarSesionesCuenta(ObjDatos);
}

export const Usuarios_obtenerRoles = ObjRepositorio.Usuarios_listarRoles;
export const Usuarios_obtenerPermisos = ObjRepositorio.Usuarios_listarPermisos;
