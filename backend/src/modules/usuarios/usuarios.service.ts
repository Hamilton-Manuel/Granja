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
import { Usuarios_resolverCodigos, Usuarios_resolverPermiso } from "./usuarios-accesos.js";
import type { OperacionAdministrativaUsuario } from "./usuarios.politicas.js";

function Usuarios_obtenerPermisosActivos(ObjCuenta: Awaited<ReturnType<typeof ObjRepositorio.Usuarios_buscarCuentaPorIdentificador>>): string[] {
  if (ObjCuenta === null) {
    return [];
  }
  return Usuarios_resolverCodigos(ObjCuenta);
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

async function Usuarios_validarRolAsignable(
  IntRolId: number,
  IntUsuarioActorId: number,
  StrDireccionIp: string | undefined,
  IntUsuarioObjetivoId?: number,
) {
  const ObjRol = await ObjRepositorio.Usuarios_obtenerRol(IntRolId);
  if (ObjRol === null) {
    throw new ErrorAplicacion(404, "ROL_NO_ENCONTRADO", "El rol no existe.");
  }
  if (ObjRol.esReservado) {
    await ObjRepositorio.Usuarios_registrarRechazoAdministrativo({
      IntUsuarioActorId,
      IntUsuarioObjetivoId,
      StrAccion: "ROL_RESERVADO_RECHAZADO",
      StrDireccionIp,
    });
    throw new ErrorAplicacion(409, "ROL_RESERVADO", "El rol solicitado está reservado.");
  }
  if (!ObjRol.activo) {
    throw new ErrorAplicacion(409, "ROL_INACTIVO", "No puede asignarse un rol inactivo.");
  }
  return ObjRol;
}

async function Usuarios_validarOperacionSobreCuenta(
  IntUsuarioActorId: number,
  IntUsuarioObjetivoId: number,
  StrOperacion: OperacionAdministrativaUsuario,
  StrDireccionIp: string | undefined,
) {
  const [ObjActor, ObjObjetivo] = await Promise.all([
    ObjRepositorio.Usuarios_obtenerCuentaParaPolitica(IntUsuarioActorId),
    ObjRepositorio.Usuarios_obtenerCuentaParaPolitica(IntUsuarioObjetivoId),
  ]);
  if (ObjActor === null) {
    throw new ErrorAplicacion(401, "SESION_INVALIDA", "La sesión no es válida.");
  }
  if (ObjObjetivo === null) {
    throw new ErrorAplicacion(404, "USUARIO_NO_ENCONTRADO", "El usuario no existe.");
  }
  if (ObjObjetivo.esProtegida && !(ObjActor.usuarioId === ObjObjetivo.usuarioId && (StrOperacion === "EDITAR" || StrOperacion === "REVOCAR_SESIONES"))) {
    await ObjRepositorio.Usuarios_registrarRechazoAdministrativo({
      IntUsuarioActorId,
      IntUsuarioObjetivoId,
      StrAccion: "WEBMASTER_MUTACION_RECHAZADA",
      StrDireccionIp,
    });
    throw new ErrorAplicacion(403, "USUARIO_PROTEGIDO", "El usuario solicitado está protegido.");
  }
  return ObjObjetivo;
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
  await Usuarios_validarRolAsignable(
    ObjDatos.IntRolId,
    ObjDatos.IntUsuarioActorId,
    ObjDatos.StrDireccionIp,
  );
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

export async function Usuarios_editar(ObjDatos: Omit<Parameters<typeof ObjRepositorio.Usuarios_editarCuenta>[0], "StrContrasenaHash"> & { StrContrasenaNueva?: string | undefined }) {
  await Usuarios_validarOperacionSobreCuenta(ObjDatos.IntUsuarioActorId, ObjDatos.IntUsuarioId, "EDITAR", ObjDatos.StrDireccionIp);
  try {
    return Usuarios_formatearCuentaPublica(
      await ObjRepositorio.Usuarios_editarCuenta({
        ...ObjDatos,
        StrContrasenaHash: ObjDatos.StrContrasenaNueva === undefined
          ? undefined
          : await Autenticacion_hashearContrasena(ObjDatos.StrContrasenaNueva),
      }),
    );
  } catch (ObjError) {
    Usuarios_convertirErrorUnicidad(ObjError);
  }
}

export async function Usuarios_cambiarEstado(ObjDatos: Parameters<typeof ObjRepositorio.Usuarios_cambiarEstadoCuenta>[0]) {
  await Usuarios_validarOperacionSobreCuenta(ObjDatos.IntUsuarioActorId, ObjDatos.IntUsuarioId, "CAMBIAR_ESTADO", ObjDatos.StrDireccionIp);
  if (ObjDatos.IntUsuarioId === ObjDatos.IntUsuarioActorId) {
    throw new ErrorAplicacion(409, "OPERACION_NO_PERMITIDA", "No puede cambiar su propio estado.");
  }
  return Usuarios_formatearCuentaPublica(
    await ObjRepositorio.Usuarios_cambiarEstadoCuenta(ObjDatos),
  );
}

export async function Usuarios_cambiarRol(ObjDatos: Parameters<typeof ObjRepositorio.Usuarios_cambiarRolCuenta>[0]) {
  await Usuarios_validarOperacionSobreCuenta(ObjDatos.IntUsuarioActorId, ObjDatos.IntUsuarioId, "CAMBIAR_ROL", ObjDatos.StrDireccionIp);
  await Usuarios_validarRolAsignable(ObjDatos.IntRolId, ObjDatos.IntUsuarioActorId, ObjDatos.StrDireccionIp, ObjDatos.IntUsuarioId);
  const ObjDetalle = await ObjRepositorio.Usuarios_obtenerDetalleAccesos(ObjDatos.IntUsuarioId);
  if (!ObjDetalle) throw new ErrorAplicacion(404, "USUARIO_NO_ENCONTRADO", "El usuario no existe.");
  await Usuarios_actualizarAccesos({ IntUsuarioId: ObjDatos.IntUsuarioId, IntVersionAccesos: ObjDetalle.versionAccesos, IntRolId: ObjDatos.IntRolId, ArrCambios: [], IntUsuarioActorId: ObjDatos.IntUsuarioActorId, StrDireccionIp: ObjDatos.StrDireccionIp });
  return Usuarios_obtenerPorId(ObjDatos.IntUsuarioId);
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
  await Usuarios_validarOperacionSobreCuenta(ObjDatos.IntUsuarioActorId, ObjDatos.IntUsuarioId, "REVOCAR_SESIONES", ObjDatos.StrDireccionIp);
  await ObjRepositorio.Usuarios_revocarSesionesCuenta(ObjDatos);
}

export const Usuarios_obtenerRoles = ObjRepositorio.Usuarios_listarRoles;
export const Usuarios_obtenerPermisos = ObjRepositorio.Usuarios_listarPermisos;

export const Usuarios_listarAccesos = ObjRepositorio.Usuarios_listarCuentasAccesos;

export async function Usuarios_obtenerAccesos(IntUsuarioId: number) {
  const [ObjCuenta, ArrCatalogo] = await Promise.all([ObjRepositorio.Usuarios_obtenerDetalleAccesos(IntUsuarioId), ObjRepositorio.Usuarios_obtenerCatalogoAccesos()]);
  if (!ObjCuenta) throw new ErrorAplicacion(404, "USUARIO_NO_ENCONTRADO", "El usuario no existe.");
  const ObjHeredados = new Set(ObjCuenta.rol.rolesPermisos.map((Obj) => Obj.permisoId));
  const ObjDirectos = new Map(ObjCuenta.permisosDirectos.map((Obj) => [Obj.permisoId, Obj.efecto]));
  return { usuario: { usuarioId: ObjCuenta.usuarioId, nombreCompleto: ObjCuenta.nombreCompleto, nombreUsuario: ObjCuenta.nombreUsuario, estado: ObjCuenta.estado, esProtegida: ObjCuenta.esProtegida }, versionAccesos: ObjCuenta.versionAccesos, rol: { rolId: ObjCuenta.rol.rolId, nombre: ObjCuenta.rol.nombre }, permisos: ArrCatalogo.map((Obj) => ({ permisoId: Obj.permisoId, codigo: Obj.codigo, nombre: Obj.nombre, modulo: Obj.modulo, activo: Obj.activo, estado: ObjDirectos.get(Obj.permisoId) === "ALLOW" ? "PERMITIR" : ObjDirectos.get(Obj.permisoId) === "DENY" ? "DENEGAR" : "HEREDAR", ...Usuarios_resolverPermiso({ activo: Obj.activo, heredado: ObjHeredados.has(Obj.permisoId), efecto: ObjDirectos.get(Obj.permisoId) }) })) };
}

export async function Usuarios_actualizarAccesos(ObjDatos: { IntUsuarioId: number; IntVersionAccesos: number; IntRolId: number; ArrCambios: Array<{ IntPermisoId: number; StrEstado: "HEREDAR" | "PERMITIR" | "DENEGAR" }>; IntUsuarioActorId: number; StrDireccionIp?: string | undefined }) {
  const [ObjCuenta, ObjRol, ArrPermisos] = await Promise.all([ObjRepositorio.Usuarios_obtenerCuentaParaPolitica(ObjDatos.IntUsuarioId), ObjRepositorio.Usuarios_obtenerRol(ObjDatos.IntRolId), ObjRepositorio.Usuarios_obtenerCatalogoAccesos()]);
  if (!ObjCuenta) throw new ErrorAplicacion(404, "USUARIO_NO_ENCONTRADO", "El usuario no existe.");
  if (ObjCuenta.esProtegida) throw new ErrorAplicacion(403, "USUARIO_PROTEGIDO", "El usuario solicitado está protegido.");
  if (!ObjRol || !ObjRol.activo || ObjRol.esReservado) throw new ErrorAplicacion(409, "ROL_NO_ASIGNABLE", "El rol no puede asignarse.");
  const ObjCatalogo = new Map(ArrPermisos.map((Obj) => [Obj.permisoId, Obj]));
  for (const ObjCambio of ObjDatos.ArrCambios) { const ObjPermiso = ObjCatalogo.get(ObjCambio.IntPermisoId); if (!ObjPermiso) throw new ErrorAplicacion(400, "PERMISO_INVALIDO", "Un permiso no existe."); if (!ObjPermiso.activo && ObjCambio.StrEstado !== "HEREDAR") throw new ErrorAplicacion(409, "PERMISO_INACTIVO", "No puede asignarse un permiso inactivo."); }
  try { await ObjRepositorio.Usuarios_actualizarAccesos(ObjDatos); } catch (ObjError) { if (ObjError instanceof Error && ObjError.message === "VERSION_ACCESOS_CONFLICTO") throw new ErrorAplicacion(409, "VERSION_ACCESOS_CONFLICTO", "Los accesos fueron modificados por otro usuario."); throw ObjError; }
  return Usuarios_obtenerAccesos(ObjDatos.IntUsuarioId);
}
