import { z } from "zod";
import { pathToFileURL } from "node:url";

import { Autenticacion_hashearContrasena } from "../auth/autenticacion.js";
import { Configuracion_obtenerEntorno } from "../config/configuracion-entorno.js";
import {
  BaseDatos_desconectar,
  BaseDatos_exigirBaseActual,
  BaseDatos_obtenerCliente,
} from "../database/prisma.js";

const ArrCatalogoPermisos = [
  ["USUARIOS_CONSULTAR", "Consultar usuarios", "CONSULTAR"],
  ["USUARIOS_CREAR", "Crear usuarios", "CREAR"],
  ["USUARIOS_EDITAR", "Editar usuarios", "EDITAR"],
  ["USUARIOS_CAMBIAR_ESTADO", "Cambiar estado de usuarios", "CAMBIAR_ESTADO"],
  ["USUARIOS_ASIGNAR_ROL", "Asignar rol a usuarios", "ASIGNAR_ROL"],
  ["USUARIOS_CONSULTAR_CATALOGOS", "Consultar roles y permisos", "CONSULTAR_CATALOGOS"],
  ["USUARIOS_REVOCAR_SESIONES", "Revocar sesiones de usuarios", "REVOCAR_SESIONES"],
] as const;

const ObjIdentidadAdministrador = z.object({
  BOOTSTRAP_ADMIN_NOMBRE_COMPLETO: z.string().trim().min(1).max(200),
  BOOTSTRAP_ADMIN_USUARIO: z.string().trim().min(1).max(100),
  BOOTSTRAP_ADMIN_CORREO: z.string().trim().email().max(200),
});

const ObjContrasenaAdministrador = z.string().min(8).max(128);

export async function Usuarios_ejecutarBootstrap(): Promise<void> {
  Configuracion_obtenerEntorno();
  const StrBaseEsperada = process.env.BASE_DATOS_ESPERADA;
  if (StrBaseEsperada === undefined || StrBaseEsperada.length === 0) {
    throw new Error("Debe indicar BASE_DATOS_ESPERADA para ejecutar el bootstrap.");
  }
  await BaseDatos_exigirBaseActual(StrBaseEsperada);
  const ObjIdentidad = ObjIdentidadAdministrador.safeParse(process.env);
  if (!ObjIdentidad.success) {
    throw new Error("Debe proporcionar la identidad completa del administrador inicial.");
  }

  const ObjPrisma = BaseDatos_obtenerCliente();
  const ObjResultado = await ObjPrisma.$transaction(async (ObjTx) => {
    let IntCambios = 0;
    const ArrPermisos = [];

    for (const [StrCodigo, StrNombre, StrAccion] of ArrCatalogoPermisos) {
      let ObjPermiso = await ObjTx.usuarioPermiso.findUnique({ where: { codigo: StrCodigo } });
      if (ObjPermiso === null) {
        ObjPermiso = await ObjTx.usuarioPermiso.create({
          data: { codigo: StrCodigo, nombre: StrNombre, modulo: "USUARIOS", accion: StrAccion },
        });
        IntCambios += 1;
      } else if (!ObjPermiso.activo) {
        throw new Error(`El permiso ${StrCodigo} existe pero está inactivo.`);
      }
      ArrPermisos.push(ObjPermiso);
    }

    let ObjRol = await ObjTx.usuarioRol.findUnique({ where: { nombre: "ADMINISTRADOR" } });
    if (ObjRol === null) {
      ObjRol = await ObjTx.usuarioRol.create({
        data: { nombre: "ADMINISTRADOR", descripcion: "Administración general del sistema." },
      });
      IntCambios += 1;
    } else if (!ObjRol.activo) {
      throw new Error("El rol ADMINISTRADOR existe pero está inactivo.");
    }

    const ObjPorUsuario = await ObjTx.usuarioCuenta.findUnique({ where: { nombreUsuario: ObjIdentidad.data.BOOTSTRAP_ADMIN_USUARIO } });
    const ObjPorCorreo = await ObjTx.usuarioCuenta.findUnique({ where: { correo: ObjIdentidad.data.BOOTSTRAP_ADMIN_CORREO } });
    let ObjAdministrador;

    if (ObjPorUsuario === null && ObjPorCorreo === null) {
      const ObjContrasena = ObjContrasenaAdministrador.safeParse(process.env.BOOTSTRAP_ADMIN_CONTRASENA);
      if (!ObjContrasena.success) {
        throw new Error("La contraseña inicial debe tener entre 8 y 128 caracteres.");
      }
      ObjAdministrador = await ObjTx.usuarioCuenta.create({
        data: {
          rolId: ObjRol.rolId,
          nombreCompleto: ObjIdentidad.data.BOOTSTRAP_ADMIN_NOMBRE_COMPLETO,
          nombreUsuario: ObjIdentidad.data.BOOTSTRAP_ADMIN_USUARIO,
          correo: ObjIdentidad.data.BOOTSTRAP_ADMIN_CORREO,
          contrasenaHash: await Autenticacion_hashearContrasena(ObjContrasena.data),
        },
      });
      IntCambios += 1;
    } else {
      if (ObjPorUsuario === null || ObjPorCorreo === null || ObjPorUsuario.usuarioId !== ObjPorCorreo.usuarioId) {
        throw new Error("La identidad indicada entra en conflicto con una cuenta existente.");
      }
      ObjAdministrador = ObjPorUsuario;
      if (
        ObjAdministrador.nombreCompleto !== ObjIdentidad.data.BOOTSTRAP_ADMIN_NOMBRE_COMPLETO ||
        ObjAdministrador.nombreUsuario !== ObjIdentidad.data.BOOTSTRAP_ADMIN_USUARIO ||
        ObjAdministrador.correo !== ObjIdentidad.data.BOOTSTRAP_ADMIN_CORREO ||
        ObjAdministrador.rolId !== ObjRol.rolId ||
        ObjAdministrador.estado !== "ACTIVO"
      ) {
        throw new Error("El administrador existente no coincide con la identidad o estado esperado.");
      }
    }

    for (const ObjPermiso of ArrPermisos) {
      const ObjVinculo = await ObjTx.usuarioRolPermiso.findUnique({
        where: { rolId_permisoId: { rolId: ObjRol.rolId, permisoId: ObjPermiso.permisoId } },
      });
      if (ObjVinculo === null) {
        await ObjTx.usuarioRolPermiso.create({
          data: { rolId: ObjRol.rolId, permisoId: ObjPermiso.permisoId, usuarioAsignadorId: ObjAdministrador.usuarioId },
        });
        IntCambios += 1;
      }
    }

    if (IntCambios > 0) {
      await ObjTx.usuarioBitacora.create({
        data: {
          usuarioId: ObjAdministrador.usuarioId,
          modulo: "USUARIOS",
          accion: "BOOTSTRAP_INICIAL",
          descripcion: "Inicialización idempotente del módulo Usuarios.",
          resultado: "EXITO",
        },
      });
    }
    return IntCambios;
  });

  console.info(ObjResultado === 0 ? "Bootstrap ya estaba completo; no se realizaron cambios." : "Bootstrap de Usuarios completado correctamente.");
}

async function Usuarios_ejecutarBootstrapDesdeCli(): Promise<void> {
  try {
    await Usuarios_ejecutarBootstrap();
  } catch (ObjError) {
    console.error(ObjError instanceof Error ? ObjError.message : "No fue posible completar el bootstrap.");
    process.exitCode = 1;
  } finally {
    await BaseDatos_desconectar();
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await Usuarios_ejecutarBootstrapDesdeCli();
}
