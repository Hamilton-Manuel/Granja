import { Prisma } from "../../../generated/prisma/client.js";
import { BaseDatos_obtenerCliente } from "../../database/prisma.js";
import { Fecha_obtenerAhoraGuatemala } from "../../datetime/fecha.js";

const ObjSeleccionUsuarioPublico = {
  usuarioId: true,
  nombreCompleto: true,
  nombreUsuario: true,
  correo: true,
  estado: true,
  fechaCreacion: true,
  fechaActualizacion: true,
  rol: {
    select: {
      rolId: true,
      nombre: true,
      activo: true,
    },
  },
} satisfies Prisma.UsuarioCuentaSelect;

const ObjIncluirAutenticacion = {
  permisosDirectos: { include: { permiso: true } },
  rol: {
    include: {
      rolesPermisos: {
        include: { permiso: true },
      },
    },
  },
} satisfies Prisma.UsuarioCuentaInclude;

export function Usuarios_buscarCuentaPorIdentificador(StrIdentificador: string) {
  return BaseDatos_obtenerCliente().usuarioCuenta.findFirst({
    where: {
      OR: [
        { nombreUsuario: StrIdentificador },
        { correo: StrIdentificador },
      ],
    },
    include: ObjIncluirAutenticacion,
  });
}

export function Usuarios_buscarCuentaAutenticacionPorId(IntUsuarioId: number) {
  return BaseDatos_obtenerCliente().usuarioCuenta.findUnique({
    where: { usuarioId: IntUsuarioId },
    include: ObjIncluirAutenticacion,
  });
}

export function Usuarios_obtenerSesionParaAutenticacion(StrTokenHash: string) {
  return BaseDatos_obtenerCliente().usuarioSesion.findUnique({
    where: { token: StrTokenHash },
    include: {
      usuario: { include: ObjIncluirAutenticacion },
    },
  });
}

export function Usuarios_marcarSesionExpirada(IntSesionId: number) {
  const DtFechaCierre = Fecha_obtenerAhoraGuatemala();
  return BaseDatos_obtenerCliente().usuarioSesion.updateMany({
    where: { sesionId: IntSesionId, estado: "ACTIVA" },
    data: { estado: "EXPIRADA", fechaCierre: DtFechaCierre },
  });
}

export async function Usuarios_crearSesion(
  IntUsuarioId: number,
  StrTokenHash: string,
  DtFechaInicio: Date,
  DtFechaExpiracion: Date,
  StrDireccionIp: string | undefined,
): Promise<void> {
  const ObjPrisma = BaseDatos_obtenerCliente();
  await ObjPrisma.$transaction(async (ObjTx) => {
    await ObjTx.usuarioSesion.create({
      data: {
        usuarioId: IntUsuarioId,
        token: StrTokenHash,
        fechaInicio: DtFechaInicio,
        fechaExpiracion: DtFechaExpiracion,
        direccionIp: StrDireccionIp ?? null,
      },
    });
    await ObjTx.usuarioBitacora.create({
      data: {
        usuarioId: IntUsuarioId,
        modulo: "USUARIOS",
        accion: "LOGIN_EXITOSO",
        descripcion: "Inicio de sesión correcto.",
        resultado: "EXITO",
        direccionIp: StrDireccionIp ?? null,
      },
    });
  });
}

export function Usuarios_registrarLoginFallido(
  IntUsuarioId: number | undefined,
  StrResultadoInterno: string,
  StrDireccionIp: string | undefined,
) {
  return BaseDatos_obtenerCliente().usuarioBitacora.create({
    data: {
      usuarioId: IntUsuarioId ?? null,
      modulo: "USUARIOS",
      accion: "LOGIN_FALLIDO",
      descripcion: "Intento de inicio de sesión rechazado.",
      resultado: StrResultadoInterno,
      direccionIp: StrDireccionIp ?? null,
    },
  });
}

export async function Usuarios_cerrarSesion(
  IntSesionId: number,
  IntUsuarioId: number,
  StrDireccionIp: string | undefined,
): Promise<void> {
  await BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    const DtFechaCierre = Fecha_obtenerAhoraGuatemala();
    await ObjTx.usuarioSesion.updateMany({
      where: { sesionId: IntSesionId, usuarioId: IntUsuarioId, estado: "ACTIVA" },
      data: { estado: "CERRADA", fechaCierre: DtFechaCierre },
    });
    await ObjTx.usuarioBitacora.create({
      data: {
        usuarioId: IntUsuarioId,
        modulo: "USUARIOS",
        accion: "LOGOUT",
        descripcion: "Cierre de sesión.",
        resultado: "EXITO",
        direccionIp: StrDireccionIp ?? null,
      },
    });
  });
}

export async function Usuarios_listarCuentas(ObjConsulta: {
  IntPagina: number;
  IntLimite: number;
  StrBusqueda?: string | undefined;
  StrEstado?: string | undefined;
  IntRolId?: number | undefined;
}) {
  const ObjWhere: Prisma.UsuarioCuentaWhereInput = {
    ...(ObjConsulta.StrEstado === undefined ? {} : { estado: ObjConsulta.StrEstado }),
    ...(ObjConsulta.IntRolId === undefined ? {} : { rolId: ObjConsulta.IntRolId }),
    ...(ObjConsulta.StrBusqueda === undefined
      ? {}
      : {
          OR: [
            { nombreCompleto: { contains: ObjConsulta.StrBusqueda } },
            { nombreUsuario: { contains: ObjConsulta.StrBusqueda } },
            { correo: { contains: ObjConsulta.StrBusqueda } },
          ],
        }),
  };
  const ObjPrisma = BaseDatos_obtenerCliente();
  const [ArrUsuarios, IntTotal] = await ObjPrisma.$transaction([
    ObjPrisma.usuarioCuenta.findMany({
      where: ObjWhere,
      select: ObjSeleccionUsuarioPublico,
      orderBy: { usuarioId: "asc" },
      skip: (ObjConsulta.IntPagina - 1) * ObjConsulta.IntLimite,
      take: ObjConsulta.IntLimite,
    }),
    ObjPrisma.usuarioCuenta.count({ where: ObjWhere }),
  ]);
  return { ArrUsuarios, IntTotal };
}

export function Usuarios_obtenerCuentaPublica(IntUsuarioId: number) {
  return BaseDatos_obtenerCliente().usuarioCuenta.findUnique({
    where: { usuarioId: IntUsuarioId },
    select: ObjSeleccionUsuarioPublico,
  });
}

export function Usuarios_obtenerCuentaParaPolitica(IntUsuarioId: number) {
  return BaseDatos_obtenerCliente().usuarioCuenta.findUnique({
    where: { usuarioId: IntUsuarioId },
    select: {
      usuarioId: true,
      estado: true,
      esProtegida: true,
      rol: { select: { rolId: true, nombre: true, activo: true, esReservado: true } },
    },
  });
}

export function Usuarios_obtenerRol(IntRolId: number) {
  return BaseDatos_obtenerCliente().usuarioRol.findUnique({
    where: { rolId: IntRolId },
  });
}

export function Usuarios_registrarRechazoAdministrativo(ObjDatos: {
  IntUsuarioActorId: number;
  IntUsuarioObjetivoId?: number | undefined;
  StrAccion: "ROL_RESERVADO_RECHAZADO" | "WEBMASTER_MUTACION_RECHAZADA";
  StrDireccionIp?: string | undefined;
}) {
  return BaseDatos_obtenerCliente().usuarioBitacora.create({
    data: {
      usuarioId: ObjDatos.IntUsuarioActorId,
      modulo: "USUARIOS",
      accion: ObjDatos.StrAccion,
      descripcion: ObjDatos.IntUsuarioObjetivoId === undefined
        ? "Operación administrativa rechazada."
        : `Operación administrativa rechazada sobre usuario: ${ObjDatos.IntUsuarioObjetivoId}.`,
      resultado: "RECHAZADO",
      direccionIp: ObjDatos.StrDireccionIp ?? null,
    },
  });
}

export async function Usuarios_crearCuenta(ObjDatos: {
  IntRolId: number;
  StrNombreCompleto: string;
  StrNombreUsuario: string;
  StrCorreo: string;
  StrContrasenaHash: string;
  IntUsuarioActorId: number;
  StrDireccionIp?: string | undefined;
}) {
  return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    const ObjUsuario = await ObjTx.usuarioCuenta.create({
      data: {
        rolId: ObjDatos.IntRolId,
        nombreCompleto: ObjDatos.StrNombreCompleto,
        nombreUsuario: ObjDatos.StrNombreUsuario,
        correo: ObjDatos.StrCorreo,
        contrasenaHash: ObjDatos.StrContrasenaHash,
      },
      select: ObjSeleccionUsuarioPublico,
    });
    await ObjTx.usuarioBitacora.create({
      data: {
        usuarioId: ObjDatos.IntUsuarioActorId,
        modulo: "USUARIOS",
        accion: "USUARIO_CREADO",
        descripcion: `Usuario creado: ${ObjUsuario.usuarioId}.`,
        resultado: "EXITO",
        direccionIp: ObjDatos.StrDireccionIp ?? null,
      },
    });
    return ObjUsuario;
  });
}

export async function Usuarios_editarCuenta(ObjDatos: {
  IntUsuarioId: number;
  StrNombreCompleto?: string | undefined;
  StrNombreUsuario?: string | undefined;
  StrCorreo?: string | undefined;
  StrContrasenaHash?: string | undefined;
  IntUsuarioActorId: number;
  StrDireccionIp?: string | undefined;
}) {
  return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    const DtFechaActualizacion = Fecha_obtenerAhoraGuatemala();
    const ObjUsuario = await ObjTx.usuarioCuenta.update({
      where: { usuarioId: ObjDatos.IntUsuarioId },
      data: {
        ...(ObjDatos.StrNombreCompleto === undefined ? {} : { nombreCompleto: ObjDatos.StrNombreCompleto }),
        ...(ObjDatos.StrNombreUsuario === undefined ? {} : { nombreUsuario: ObjDatos.StrNombreUsuario }),
        ...(ObjDatos.StrCorreo === undefined ? {} : { correo: ObjDatos.StrCorreo }),
        ...(ObjDatos.StrContrasenaHash === undefined ? {} : { contrasenaHash: ObjDatos.StrContrasenaHash }),
        fechaActualizacion: DtFechaActualizacion,
      },
      select: ObjSeleccionUsuarioPublico,
    });
    await Usuarios_registrarAccionTx(ObjTx, ObjDatos.IntUsuarioActorId, "USUARIO_ACTUALIZADO", ObjDatos.IntUsuarioId, ObjDatos.StrDireccionIp);
    if (ObjDatos.StrContrasenaHash !== undefined) {
      await Usuarios_registrarAccionTx(ObjTx, ObjDatos.IntUsuarioActorId, "CONTRASENA_ACTUALIZADA", ObjDatos.IntUsuarioId, ObjDatos.StrDireccionIp);
    }
    return ObjUsuario;
  });
}

async function Usuarios_registrarAccionTx(
  ObjTx: Prisma.TransactionClient,
  IntUsuarioActorId: number,
  StrAccion: string,
  IntUsuarioObjetivoId: number,
  StrDireccionIp?: string | undefined,
): Promise<void> {
  await ObjTx.usuarioBitacora.create({
    data: {
      usuarioId: IntUsuarioActorId,
      modulo: "USUARIOS",
      accion: StrAccion,
      descripcion: `Operación sobre usuario: ${IntUsuarioObjetivoId}.`,
      resultado: "EXITO",
      direccionIp: StrDireccionIp ?? null,
    },
  });
}

export async function Usuarios_cambiarEstadoCuenta(ObjDatos: {
  IntUsuarioId: number;
  StrEstado: "ACTIVO" | "INACTIVO";
  IntUsuarioActorId: number;
  StrDireccionIp?: string | undefined;
}) {
  return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    const DtFechaActualizacion = Fecha_obtenerAhoraGuatemala();
    const ObjUsuario = await ObjTx.usuarioCuenta.update({
      where: { usuarioId: ObjDatos.IntUsuarioId },
      data: {
        estado: ObjDatos.StrEstado,
        fechaActualizacion: DtFechaActualizacion,
      },
      select: ObjSeleccionUsuarioPublico,
    });
    if (ObjDatos.StrEstado === "INACTIVO") {
      await Usuarios_revocarSesionesTx(ObjTx, ObjDatos.IntUsuarioId);
    }
    await Usuarios_registrarAccionTx(ObjTx, ObjDatos.IntUsuarioActorId, "USUARIO_ESTADO_CAMBIADO", ObjDatos.IntUsuarioId, ObjDatos.StrDireccionIp);
    return ObjUsuario;
  });
}

export async function Usuarios_cambiarRolCuenta(ObjDatos: {
  IntUsuarioId: number;
  IntRolId: number;
  IntUsuarioActorId: number;
  StrDireccionIp?: string | undefined;
}) {
  return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    const DtFechaActualizacion = Fecha_obtenerAhoraGuatemala();
    const ObjUsuario = await ObjTx.usuarioCuenta.update({
      where: { usuarioId: ObjDatos.IntUsuarioId },
      data: {
        rolId: ObjDatos.IntRolId,
        fechaActualizacion: DtFechaActualizacion,
      },
      select: ObjSeleccionUsuarioPublico,
    });
    await Usuarios_revocarSesionesTx(ObjTx, ObjDatos.IntUsuarioId);
    await Usuarios_registrarAccionTx(ObjTx, ObjDatos.IntUsuarioActorId, "USUARIO_ROL_CAMBIADO", ObjDatos.IntUsuarioId, ObjDatos.StrDireccionIp);
    return ObjUsuario;
  });
}

async function Usuarios_revocarSesionesTx(
  ObjTx: Prisma.TransactionClient,
  IntUsuarioId: number,
): Promise<void> {
  const DtFechaCierre = Fecha_obtenerAhoraGuatemala();
  await ObjTx.usuarioSesion.updateMany({
    where: { usuarioId: IntUsuarioId, estado: "ACTIVA" },
    data: { estado: "REVOCADA", fechaCierre: DtFechaCierre },
  });
}

export async function Usuarios_cambiarContrasenaCuenta(ObjDatos: {
  IntUsuarioId: number;
  StrContrasenaHash: string;
  StrDireccionIp?: string | undefined;
}): Promise<void> {
  await BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    const DtFechaActualizacion = Fecha_obtenerAhoraGuatemala();
    await ObjTx.usuarioCuenta.update({
      where: { usuarioId: ObjDatos.IntUsuarioId },
      data: {
        contrasenaHash: ObjDatos.StrContrasenaHash,
        fechaActualizacion: DtFechaActualizacion,
      },
    });
    await Usuarios_revocarSesionesTx(ObjTx, ObjDatos.IntUsuarioId);
    await Usuarios_registrarAccionTx(ObjTx, ObjDatos.IntUsuarioId, "CONTRASENA_CAMBIADA", ObjDatos.IntUsuarioId, ObjDatos.StrDireccionIp);
  });
}

export async function Usuarios_revocarSesionesCuenta(ObjDatos: {
  IntUsuarioId: number;
  IntUsuarioActorId: number;
  StrDireccionIp?: string | undefined;
}): Promise<void> {
  await BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    await Usuarios_revocarSesionesTx(ObjTx, ObjDatos.IntUsuarioId);
    await Usuarios_registrarAccionTx(ObjTx, ObjDatos.IntUsuarioActorId, "SESIONES_REVOCADAS", ObjDatos.IntUsuarioId, ObjDatos.StrDireccionIp);
  });
}

export function Usuarios_listarRoles() {
  return BaseDatos_obtenerCliente().usuarioRol.findMany({
    select: {
      rolId: true,
      nombre: true,
      descripcion: true,
      activo: true,
      esReservado: true,
      _count: { select: { rolesPermisos: true, usuarios: true } },
    },
    orderBy: { nombre: "asc" },
  });
}

export function Usuarios_listarPermisos() {
  return BaseDatos_obtenerCliente().usuarioPermiso.findMany({
    select: { permisoId: true, codigo: true, nombre: true, modulo: true, accion: true, activo: true },
    orderBy: [{ modulo: "asc" }, { codigo: "asc" }],
  });
}

export async function Usuarios_listarCuentasAccesos(ObjConsulta: { IntPagina: number; IntLimite: number; StrBusqueda?: string | undefined }) {
  const ObjWhere: Prisma.UsuarioCuentaWhereInput = ObjConsulta.StrBusqueda ? { OR: [{ nombreCompleto: { contains: ObjConsulta.StrBusqueda } }, { nombreUsuario: { contains: ObjConsulta.StrBusqueda } }] } : {};
  const ObjPrisma = BaseDatos_obtenerCliente();
  const [ArrUsuarios, IntTotal] = await ObjPrisma.$transaction([
    ObjPrisma.usuarioCuenta.findMany({ where: ObjWhere, select: { usuarioId: true, nombreCompleto: true, nombreUsuario: true, estado: true, esProtegida: true, rol: { select: { rolId: true, nombre: true } } }, orderBy: { nombreCompleto: "asc" }, skip: (ObjConsulta.IntPagina - 1) * ObjConsulta.IntLimite, take: ObjConsulta.IntLimite }),
    ObjPrisma.usuarioCuenta.count({ where: ObjWhere }),
  ]);
  return { ArrUsuarios, IntTotal };
}

export function Usuarios_obtenerDetalleAccesos(IntUsuarioId: number) {
  return BaseDatos_obtenerCliente().usuarioCuenta.findUnique({ where: { usuarioId: IntUsuarioId }, include: { rol: { include: { rolesPermisos: { include: { permiso: true } } } }, permisosDirectos: { include: { permiso: true } } } });
}

export function Usuarios_obtenerCatalogoAccesos() {
  return BaseDatos_obtenerCliente().usuarioPermiso.findMany({ orderBy: [{ modulo: "asc" }, { codigo: "asc" }] });
}

export async function Usuarios_actualizarAccesos(ObjDatos: { IntUsuarioId: number; IntVersionAccesos: number; IntRolId: number; ArrCambios: Array<{ IntPermisoId: number; StrEstado: "HEREDAR" | "PERMITIR" | "DENEGAR" }>; IntUsuarioActorId: number; StrDireccionIp?: string | undefined }) {
  return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    const ObjCuenta = await ObjTx.usuarioCuenta.findUnique({ where: { usuarioId: ObjDatos.IntUsuarioId }, include: { permisosDirectos: true } });
    if (ObjCuenta === null) throw new Error("USUARIO_NO_ENCONTRADO");
    if (ObjCuenta.versionAccesos !== ObjDatos.IntVersionAccesos) throw new Error("VERSION_ACCESOS_CONFLICTO");
    const ObjActuales = new Map(ObjCuenta.permisosDirectos.map((Obj) => [Obj.permisoId, Obj]));
    let BoolCambio = ObjCuenta.rolId !== ObjDatos.IntRolId;
    if (BoolCambio) await ObjTx.usuarioAccesoEvento.create({ data: { usuarioId: ObjDatos.IntUsuarioId, actorUsuarioId: ObjDatos.IntUsuarioActorId, tipo: "CAMBIO_ROL", rolAnteriorId: ObjCuenta.rolId, rolNuevoId: ObjDatos.IntRolId, direccionIp: ObjDatos.StrDireccionIp ?? null } });
    for (const ObjCambio of ObjDatos.ArrCambios) {
      const ObjActual = ObjActuales.get(ObjCambio.IntPermisoId);
      const StrAnterior = ObjActual?.efecto === "ALLOW" ? "PERMITIR" : ObjActual?.efecto === "DENY" ? "DENEGAR" : "HEREDAR";
      if (StrAnterior === ObjCambio.StrEstado) continue;
      BoolCambio = true;
      if (ObjCambio.StrEstado === "HEREDAR") await ObjTx.usuarioPermisoDirecto.deleteMany({ where: { usuarioId: ObjDatos.IntUsuarioId, permisoId: ObjCambio.IntPermisoId } });
      else await ObjTx.usuarioPermisoDirecto.upsert({ where: { usuarioId_permisoId: { usuarioId: ObjDatos.IntUsuarioId, permisoId: ObjCambio.IntPermisoId } }, create: { usuarioId: ObjDatos.IntUsuarioId, permisoId: ObjCambio.IntPermisoId, efecto: ObjCambio.StrEstado === "PERMITIR" ? "ALLOW" : "DENY", asignadoPorUsuarioId: ObjDatos.IntUsuarioActorId }, update: { efecto: ObjCambio.StrEstado === "PERMITIR" ? "ALLOW" : "DENY", asignadoPorUsuarioId: ObjDatos.IntUsuarioActorId, fechaActualizacion: Fecha_obtenerAhoraGuatemala() } });
      await ObjTx.usuarioAccesoEvento.create({ data: { usuarioId: ObjDatos.IntUsuarioId, actorUsuarioId: ObjDatos.IntUsuarioActorId, tipo: "CAMBIO_OVERRIDE", permisoId: ObjCambio.IntPermisoId, estadoAnterior: StrAnterior, estadoNuevo: ObjCambio.StrEstado, direccionIp: ObjDatos.StrDireccionIp ?? null } });
    }
    if (BoolCambio) {
      const ObjActualizacion = await ObjTx.usuarioCuenta.updateMany({ where: { usuarioId: ObjDatos.IntUsuarioId, versionAccesos: ObjDatos.IntVersionAccesos }, data: { rolId: ObjDatos.IntRolId, versionAccesos: { increment: 1 }, fechaActualizacion: Fecha_obtenerAhoraGuatemala() } });
      if (ObjActualizacion.count !== 1) throw new Error("VERSION_ACCESOS_CONFLICTO");
      await Usuarios_registrarAccionTx(ObjTx, ObjDatos.IntUsuarioActorId, "ACCESOS_USUARIO_ACTUALIZADOS", ObjDatos.IntUsuarioId, ObjDatos.StrDireccionIp);
    }
    return BoolCambio;
  });
}

export function Usuarios_expirarSesionesVencidas() {
  const DtAhoraGuatemala = Fecha_obtenerAhoraGuatemala();
  return BaseDatos_obtenerCliente().usuarioSesion.updateMany({
    where: { estado: "ACTIVA", fechaExpiracion: { lte: DtAhoraGuatemala } },
    data: { estado: "EXPIRADA", fechaCierre: DtAhoraGuatemala },
  });
}
