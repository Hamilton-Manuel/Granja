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

export function Usuarios_obtenerRol(IntRolId: number) {
  return BaseDatos_obtenerCliente().usuarioRol.findUnique({
    where: { rolId: IntRolId },
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
        fechaActualizacion: DtFechaActualizacion,
      },
      select: ObjSeleccionUsuarioPublico,
    });
    await Usuarios_registrarAccionTx(ObjTx, ObjDatos.IntUsuarioActorId, "USUARIO_ACTUALIZADO", ObjDatos.IntUsuarioId, ObjDatos.StrDireccionIp);
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

export function Usuarios_expirarSesionesVencidas() {
  const DtAhoraGuatemala = Fecha_obtenerAhoraGuatemala();
  return BaseDatos_obtenerCliente().usuarioSesion.updateMany({
    where: { estado: "ACTIVA", fechaExpiracion: { lte: DtAhoraGuatemala } },
    data: { estado: "EXPIRADA", fechaCierre: DtAhoraGuatemala },
  });
}
