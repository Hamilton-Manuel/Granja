import { pathToFileURL } from "node:url";
import { z } from "zod";

import { Autenticacion_hashearContrasena } from "../auth/autenticacion.js";
import { Configuracion_obtenerEntorno } from "../config/configuracion-entorno.js";
import {
  BaseDatos_desconectar,
  BaseDatos_exigirBaseActual,
  BaseDatos_obtenerCliente,
} from "../database/prisma.js";
import { Fecha_obtenerAhoraGuatemala } from "../datetime/fecha.js";
import {
  ArrCatalogoPermisosClientes,
  ArrCatalogoTiposClientes,
} from "../modules/clientes/clientes.constants.js";
import {
  ArrCatalogoPermisosProveedores,
  ArrCatalogoTiposProveedores,
} from "../modules/proveedores/proveedores.constants.js";
import {
  ArrCatalogoPermisosInventario,
  ArrPermisosInventarioOperador,
} from "../modules/inventario/inventario.constants.js";
import {
  ArrCatalogoPermisosProduccion,
  ArrPermisosProduccionOperador,
} from "../modules/produccion/produccion.constants.js";
import { ArrCatalogoPermisosAlimentacion, ArrPermisosAlimentacionOperador } from "../modules/alimentacion/alimentacion.constants.js";
import { ArrCatalogoPermisosSanidad, ArrPermisosSanidadOperador, ArrTiposSanidad, ArrViasSanidad, ArrUnidadesSanidad } from "../modules/sanidad/sanidad.constants.js";
import { ArrCatalogoPermisosVentas, ArrPermisosVentasOperador } from "../modules/ventas/ventas.constants.js";
import {
  ArrCatalogoPermisosUsuarios,
  ArrCodigosPermisosUsuarios,
  ArrDefinicionesRolesUsuarios,
  ObjRolesUsuarios,
} from "../modules/usuarios/usuarios.constants.js";
import { Usuarios_obtenerIdsFaltantes } from "../modules/usuarios/usuarios.politicas.js";

const ObjIdentidadWebmaster = z.object({
  BOOTSTRAP_WEBMASTER_NOMBRE_COMPLETO: z.string().trim().min(1).max(200),
  BOOTSTRAP_WEBMASTER_USUARIO: z.string().trim().min(1).max(100),
  BOOTSTRAP_WEBMASTER_CORREO: z.string().trim().email().max(200),
});

const ObjContrasenaWebmaster = z.string().min(8).max(128);

const ArrCatalogoPermisosSistema = [
  ...ArrCatalogoPermisosUsuarios.map((ObjPermiso) => ({ ...ObjPermiso, StrModulo: "USUARIOS" })),
  ...ArrCatalogoPermisosClientes.map((ObjPermiso) => ({ ...ObjPermiso, StrModulo: "CLIENTES" })),
  ...ArrCatalogoPermisosProveedores.map((ObjPermiso) => ({ ...ObjPermiso, StrModulo: "PROVEEDORES" })),
  ...ArrCatalogoPermisosInventario.map((ObjPermiso) => ({ ...ObjPermiso, StrModulo: "INVENTARIO" })),
  ...ArrCatalogoPermisosProduccion.map((ObjPermiso) => ({ ...ObjPermiso, StrModulo: "PRODUCCION" })),
  ...ArrCatalogoPermisosAlimentacion.map((ObjPermiso) => ({ ...ObjPermiso, StrModulo: "ALIMENTACION" })),
  ...ArrCatalogoPermisosSanidad.map((ObjPermiso) => ({ ...ObjPermiso, StrModulo: "SANIDAD" })),
  ...ArrCatalogoPermisosVentas.map((ObjPermiso) => ({ ...ObjPermiso, StrModulo: "VENTAS" })),
] as const;

const ArrCodigosPermisosClientesProveedores = [
  ...ArrCatalogoPermisosClientes,
  ...ArrCatalogoPermisosProveedores,
].map((ObjPermiso) => ObjPermiso.StrCodigo);

export async function Usuarios_ejecutarBootstrap(): Promise<void> {
  Configuracion_obtenerEntorno();
  const StrBaseEsperada = process.env.BASE_DATOS_ESPERADA;
  if (StrBaseEsperada === undefined || StrBaseEsperada.length === 0) {
    throw new Error("Debe indicar BASE_DATOS_ESPERADA para ejecutar el bootstrap.");
  }
  await BaseDatos_exigirBaseActual(StrBaseEsperada);

  const ObjIdentidad = ObjIdentidadWebmaster.safeParse(process.env);
  if (!ObjIdentidad.success) {
    throw new Error("Debe proporcionar la identidad completa del webmaster inicial.");
  }

  const ObjPrisma = BaseDatos_obtenerCliente();
  const ObjResultado = await ObjPrisma.$transaction(async (ObjTx) => {
    let IntCambiosCatalogos = 0;
    let BoolBootstrapInicial = false;
    let BoolJerarquiaReconciliada = false;

    const ObjRoles = new Map<string, { rolId: number; nombre: string; activo: boolean; esReservado: boolean }>();
    for (const ObjDefinicion of ArrDefinicionesRolesUsuarios) {
      let ObjRol = await ObjTx.usuarioRol.findUnique({ where: { nombre: ObjDefinicion.StrNombre } });
      if (ObjRol === null) {
        ObjRol = await ObjTx.usuarioRol.create({
          data: { nombre: ObjDefinicion.StrNombre, descripcion: ObjDefinicion.StrDescripcion },
        });
        IntCambiosCatalogos += 1;
      } else if (!ObjRol.activo) {
        throw new Error(`El rol ${ObjDefinicion.StrNombre} existe pero está inactivo.`);
      }
      ObjRoles.set(ObjDefinicion.StrNombre, ObjRol);
    }

    const ArrPermisosObligatorios = [];
    for (const ObjDefinicion of ArrCatalogoPermisosSistema) {
      let ObjPermiso = await ObjTx.usuarioPermiso.findUnique({ where: { codigo: ObjDefinicion.StrCodigo } });
      if (ObjPermiso === null) {
        ObjPermiso = await ObjTx.usuarioPermiso.create({
          data: {
            codigo: ObjDefinicion.StrCodigo,
            nombre: ObjDefinicion.StrNombre,
            modulo: ObjDefinicion.StrModulo,
            accion: ObjDefinicion.StrAccion,
          },
        });
        IntCambiosCatalogos += 1;
      } else if (!ObjPermiso.activo) {
        throw new Error(`El permiso ${ObjDefinicion.StrCodigo} existe pero está inactivo.`);
      }
      ArrPermisosObligatorios.push(ObjPermiso);
    }

    for (const ObjTipo of ArrCatalogoTiposClientes) {
      const ObjExistente = await ObjTx.clienteTipo.findUnique({ where: { codigo: ObjTipo.StrCodigo } });
      if (ObjExistente === null) {
        await ObjTx.clienteTipo.create({ data: { codigo: ObjTipo.StrCodigo, nombre: ObjTipo.StrNombre } });
        IntCambiosCatalogos += 1;
      } else if (!ObjExistente.activo) {
        throw new Error(`El tipo de cliente ${ObjTipo.StrCodigo} existe pero esta inactivo.`);
      }
    }
    for (const ObjTipo of ArrCatalogoTiposProveedores) {
      const ObjExistente = await ObjTx.proveedorTipo.findUnique({ where: { codigo: ObjTipo.StrCodigo } });
      if (ObjExistente === null) {
        await ObjTx.proveedorTipo.create({ data: { codigo: ObjTipo.StrCodigo, nombre: ObjTipo.StrNombre } });
        IntCambiosCatalogos += 1;
      } else if (!ObjExistente.activo) {
        throw new Error(`El tipo de proveedor ${ObjTipo.StrCodigo} existe pero esta inactivo.`);
      }
    }
    for (const [StrCodigo, StrNombre] of ArrTiposSanidad) {
      const ObjExistente = await ObjTx.sanidadTipoAplicacion.findUnique({ where: { codigo: StrCodigo } });
      if (ObjExistente === null) { await ObjTx.sanidadTipoAplicacion.create({ data: { codigo: StrCodigo, nombre: StrNombre } }); IntCambiosCatalogos += 1; }
    }
    for (const [StrCodigo, StrNombre] of ArrViasSanidad) {
      const ObjExistente = await ObjTx.sanidadViaAdministracion.findUnique({ where: { codigo: StrCodigo } });
      if (ObjExistente === null) { await ObjTx.sanidadViaAdministracion.create({ data: { codigo: StrCodigo, nombre: StrNombre } }); IntCambiosCatalogos += 1; }
    }
    for (const [StrCodigo, StrNombre] of ArrUnidadesSanidad) {
      const ObjExistente = await ObjTx.sanidadUnidadDosis.findUnique({ where: { codigo: StrCodigo } });
      if (ObjExistente === null) { await ObjTx.sanidadUnidadDosis.create({ data: { codigo: StrCodigo, nombre: StrNombre } }); IntCambiosCatalogos += 1; }
    }

    const ObjRolWebmaster = ObjRoles.get(ObjRolesUsuarios.WEBMASTER);
    const ObjRolAdministrador = ObjRoles.get(ObjRolesUsuarios.ADMINISTRADOR);
    const ObjRolOperador = ObjRoles.get(ObjRolesUsuarios.OPERADOR);
    if (ObjRolWebmaster === undefined || ObjRolAdministrador === undefined || ObjRolOperador === undefined) {
      throw new Error("No fue posible garantizar el catálogo completo de roles.");
    }
    if (!ObjRolWebmaster.esReservado) {
      await ObjTx.usuarioRol.update({ where: { rolId: ObjRolWebmaster.rolId }, data: { esReservado: true } });
      IntCambiosCatalogos += 1;
    }

    const [ObjPorUsuario, ObjPorCorreo, ArrWebmasters] = await Promise.all([
      ObjTx.usuarioCuenta.findUnique({ where: { nombreUsuario: ObjIdentidad.data.BOOTSTRAP_WEBMASTER_USUARIO } }),
      ObjTx.usuarioCuenta.findUnique({ where: { correo: ObjIdentidad.data.BOOTSTRAP_WEBMASTER_CORREO } }),
      ObjTx.usuarioCuenta.findMany({ where: { rolId: ObjRolWebmaster.rolId } }),
    ]);
    if (ArrWebmasters.length > 1) {
      throw new Error("Existe más de una cuenta WEBMASTER.");
    }
    if (ObjPorUsuario === null !== (ObjPorCorreo === null) ||
      (ObjPorUsuario !== null && ObjPorCorreo !== null && ObjPorUsuario.usuarioId !== ObjPorCorreo.usuarioId)) {
      throw new Error("La identidad indicada entra en conflicto con una cuenta existente.");
    }

    let ObjWebmaster;
    if (ObjPorUsuario === null || ObjPorCorreo === null) {
      if (ArrWebmasters.length !== 0) {
        throw new Error("Ya existe una cuenta WEBMASTER diferente de la identidad indicada.");
      }
      const ObjContrasena = ObjContrasenaWebmaster.safeParse(process.env.BOOTSTRAP_WEBMASTER_CONTRASENA);
      if (!ObjContrasena.success) {
        throw new Error("La contraseña inicial debe tener entre 8 y 128 caracteres.");
      }
      ObjWebmaster = await ObjTx.usuarioCuenta.create({
        data: {
          rolId: ObjRolWebmaster.rolId,
          nombreCompleto: ObjIdentidad.data.BOOTSTRAP_WEBMASTER_NOMBRE_COMPLETO,
          nombreUsuario: ObjIdentidad.data.BOOTSTRAP_WEBMASTER_USUARIO,
          correo: ObjIdentidad.data.BOOTSTRAP_WEBMASTER_CORREO,
          contrasenaHash: await Autenticacion_hashearContrasena(ObjContrasena.data),
          esProtegida: true,
        },
      });
      BoolBootstrapInicial = true;
    } else {
      ObjWebmaster = ObjPorUsuario;
      if (!ObjWebmaster.esProtegida) {
        ObjWebmaster = await ObjTx.usuarioCuenta.update({ where: { usuarioId: ObjWebmaster.usuarioId }, data: { esProtegida: true } });
        IntCambiosCatalogos += 1;
      }
      if (
        ObjWebmaster.nombreCompleto !== ObjIdentidad.data.BOOTSTRAP_WEBMASTER_NOMBRE_COMPLETO ||
        ObjWebmaster.estado !== "ACTIVO"
      ) {
        throw new Error("La cuenta bootstrap no coincide con la identidad o estado esperado.");
      }
      if (ArrWebmasters.length === 1 && ArrWebmasters[0]?.usuarioId !== ObjWebmaster.usuarioId) {
        throw new Error("Ya existe una cuenta WEBMASTER diferente de la identidad indicada.");
      }
      if (ObjWebmaster.rolId === ObjRolAdministrador.rolId) {
        const DtAhoraGuatemala = Fecha_obtenerAhoraGuatemala();
        ObjWebmaster = await ObjTx.usuarioCuenta.update({
          where: { usuarioId: ObjWebmaster.usuarioId },
          data: { rolId: ObjRolWebmaster.rolId, fechaActualizacion: DtAhoraGuatemala },
        });
        await ObjTx.usuarioSesion.updateMany({
          where: { usuarioId: ObjWebmaster.usuarioId, estado: "ACTIVA" },
          data: { estado: "REVOCADA", fechaCierre: DtAhoraGuatemala },
        });
        BoolJerarquiaReconciliada = true;
      } else if (ObjWebmaster.rolId !== ObjRolWebmaster.rolId) {
        throw new Error("La cuenta bootstrap posee un rol histórico inesperado.");
      }
    }

    const ArrTodosPermisos = await ObjTx.usuarioPermiso.findMany({ select: { permisoId: true } });
    const ArrVinculosWebmaster = await ObjTx.usuarioRolPermiso.findMany({
      where: { rolId: ObjRolWebmaster.rolId }, select: { permisoId: true },
    });
    const ArrIdsWebmasterFaltantes = Usuarios_obtenerIdsFaltantes(
      ArrTodosPermisos.map((ObjPermiso) => ObjPermiso.permisoId),
      ArrVinculosWebmaster.map((ObjVinculo) => ObjVinculo.permisoId),
    );
    for (const IntPermisoId of ArrIdsWebmasterFaltantes) {
      await ObjTx.usuarioRolPermiso.create({
        data: { rolId: ObjRolWebmaster.rolId, permisoId: IntPermisoId, usuarioAsignadorId: ObjWebmaster.usuarioId },
      });
      IntCambiosCatalogos += 1;
    }

    const ArrVinculosAdministrador = await ObjTx.usuarioRolPermiso.findMany({
      where: { rolId: ObjRolAdministrador.rolId }, select: { permisoId: true },
    });
    const ArrIdsAdministradorFaltantes = Usuarios_obtenerIdsFaltantes(
      ArrPermisosObligatorios.map((ObjPermiso) => ObjPermiso.permisoId),
      ArrVinculosAdministrador.map((ObjVinculo) => ObjVinculo.permisoId),
    );
    for (const IntPermisoId of ArrIdsAdministradorFaltantes) {
      await ObjTx.usuarioRolPermiso.create({
        data: { rolId: ObjRolAdministrador.rolId, permisoId: IntPermisoId, usuarioAsignadorId: ObjWebmaster.usuarioId },
      });
      IntCambiosCatalogos += 1;
    }

    const IntPermisosUsuariosOperador = await ObjTx.usuarioRolPermiso.count({
      where: { rolId: ObjRolOperador.rolId, permiso: { codigo: { in: [...ArrCodigosPermisosUsuarios, ...ArrCodigosPermisosClientesProveedores] } } },
    });
    if (IntPermisosUsuariosOperador !== 0) {
      throw new Error("El rol OPERADOR posee permisos administrativos inesperados.");
    }

    const ArrPermisosOperador = ArrPermisosObligatorios.filter((ObjPermiso) =>
      ([...ArrPermisosInventarioOperador, ...ArrPermisosProduccionOperador, ...ArrPermisosAlimentacionOperador, ...ArrPermisosSanidadOperador, ...ArrPermisosVentasOperador] as readonly string[]).includes(ObjPermiso.codigo),
    );
    const ArrVinculosOperador = await ObjTx.usuarioRolPermiso.findMany({
      where: { rolId: ObjRolOperador.rolId }, select: { permisoId: true },
    });
    const ArrIdsOperadorFaltantes = Usuarios_obtenerIdsFaltantes(
      ArrPermisosOperador.map((ObjPermiso) => ObjPermiso.permisoId),
      ArrVinculosOperador.map((ObjVinculo) => ObjVinculo.permisoId),
    );
    for (const IntPermisoId of ArrIdsOperadorFaltantes) {
      await ObjTx.usuarioRolPermiso.create({
        data: { rolId: ObjRolOperador.rolId, permisoId: IntPermisoId, usuarioAsignadorId: ObjWebmaster.usuarioId },
      });
      IntCambiosCatalogos += 1;
    }

    const StrAccion = BoolBootstrapInicial
      ? "BOOTSTRAP_INICIAL"
      : BoolJerarquiaReconciliada
        ? "BOOTSTRAP_JERARQUIA_RECONCILIADA"
        : IntCambiosCatalogos > 0
          ? "BOOTSTRAP_CATALOGOS_ACTUALIZADOS"
          : undefined;
    if (StrAccion !== undefined) {
      await ObjTx.usuarioBitacora.create({
        data: {
          usuarioId: ObjWebmaster.usuarioId,
          modulo: "USUARIOS",
          accion: StrAccion,
          descripcion: "Inicialización idempotente de la jerarquía de usuarios.",
          resultado: "EXITO",
        },
      });
    }
    return StrAccion;
  });

  console.info(ObjResultado === undefined
    ? "Bootstrap ya estaba completo; no se realizaron cambios."
    : "Bootstrap de Usuarios completado correctamente.");
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

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await Usuarios_ejecutarBootstrapDesdeCli();
}
