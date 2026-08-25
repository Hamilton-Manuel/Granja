import { Prisma } from "../../../generated/prisma/client.js";
import { BaseDatos_obtenerCliente } from "../../database/prisma.js";
import {
  Fecha_formatearFechaCivil,
  Fecha_obtenerAhoraGuatemala,
} from "../../datetime/fecha.js";
import {
  Inventario_aplicarMovimientoConTx,
  Inventario_revertirMovimientoConTx,
} from "../inventario/inventario.repository.js";

type SanidadDetalleEntrada = {
  productoId: number;
  dosisClinica: Prisma.Decimal;
  unidadDosisId: number;
  viaAdministracionId: number;
  alcanceDosis: "INDIVIDUAL" | "POR_ANIMAL" | "TOTAL_LOTE";
  fuentes: Array<{
    inventarioId: number;
    loteInventarioId?: number | null | undefined;
    cantidad: Prisma.Decimal;
  }>;
};
export type SanidadRegistroEntrada = {
  tipoAplicacionId: number;
  fechaAplicacion: Date;
  proximaAplicacion?: Date | null | undefined;
  animalId?: number | null | undefined;
  loteProduccionId?: number | null | undefined;
  motivo: string;
  diagnostico?: string | null | undefined;
  observaciones?: string | null | undefined;
  detalles: SanidadDetalleEntrada[];
  IntUsuarioId: number;
  StrIp?: string | undefined;
};
const ObjProducto = {
  productoId: true,
  codigo: true,
  nombre: true,
  unidadMedida: true,
  manejaLotes: true,
  activo: true,
} satisfies Prisma.InventarioProductoSelect;
const ObjAplicacionInclude = {
  tipoAplicacion: true,
  animal: { select: { animalId: true, identificacion: true } },
  lote: { select: { loteProduccionId: true, codigo: true, nombre: true } },
  usuario: { select: { usuarioId: true, nombreCompleto: true } },
  usuarioReversion: { select: { usuarioId: true, nombreCompleto: true } },
  detalles: {
    include: {
      producto: { select: ObjProducto },
      unidadDosis: true,
      viaAdministracion: true,
      fuentes: {
        include: {
          existencia: { include: { almacen: true } },
          existenciaLote: {
            include: { lote: true, existencia: { include: { almacen: true } } },
          },
          inventarioTransacciones: { include: { reversion: true } },
        },
      },
    },
  },
} satisfies Prisma.SanidadAplicacionInclude;

export async function Sanidad_registrar(Obj: SanidadRegistroEntrada) {
  return BaseDatos_obtenerCliente().$transaction(
    async (ObjTx) => {
      const ObjRegistro = await ObjTx.sanidadAplicacion.create({
        data: {
          tipoAplicacionId: Obj.tipoAplicacionId,
          animalId: Obj.animalId ?? null,
          loteProduccionId: Obj.loteProduccionId ?? null,
          usuarioId: Obj.IntUsuarioId,
          fechaAplicacion: Obj.fechaAplicacion,
          proximaAplicacion: Obj.proximaAplicacion ?? null,
          motivo: Obj.motivo,
          diagnostico: Obj.diagnostico ?? null,
          observaciones: Obj.observaciones ?? null,
        },
      });
      for (const ObjLinea of Obj.detalles) {
        const ObjProductoDb = await ObjTx.inventarioProducto.findUnique({
          where: { productoId: ObjLinea.productoId },
          include: { habilitacionSanidad: true },
        });
        if (
          !ObjProductoDb ||
          !ObjProductoDb.activo ||
          !ObjProductoDb.habilitacionSanidad?.activo
        )
          throw new Error("PRODUCTO_NO_HABILITADO");
        const [ObjUnidad, ObjVia] = await Promise.all([
          ObjTx.sanidadUnidadDosis.findUnique({
            where: { unidadDosisId: ObjLinea.unidadDosisId },
          }),
          ObjTx.sanidadViaAdministracion.findUnique({
            where: { viaAdministracionId: ObjLinea.viaAdministracionId },
          }),
        ]);
        if (!ObjUnidad?.activo) throw new Error("UNIDAD_DOSIS_INACTIVA");
        if (!ObjVia?.activo) throw new Error("VIA_ADMINISTRACION_INACTIVA");
        const ObjDetalle = await ObjTx.sanidadAplicacionDetalle.create({
          data: {
            aplicacionSanitariaId: ObjRegistro.aplicacionSanitariaId,
            productoId: ObjLinea.productoId,
            unidadDosisId: ObjLinea.unidadDosisId,
            viaAdministracionId: ObjLinea.viaAdministracionId,
            dosisClinica: ObjLinea.dosisClinica,
            alcanceDosis: ObjLinea.alcanceDosis,
            unidadInventario: ObjProductoDb.unidadMedida,
          },
        });
        for (const ObjOrigen of ObjLinea.fuentes) {
          let IntExistenciaLoteId: number | undefined;
          if (ObjProductoDb.manejaLotes) {
            if (!ObjOrigen.loteInventarioId)
              throw new Error("LOTE_INVENTARIO_REQUERIDO");
            const ObjFuente = await ObjTx.inventarioExistenciaLote.findFirst({
              where: {
                loteInventarioId: ObjOrigen.loteInventarioId,
                productoId: ObjLinea.productoId,
                existencia: { inventarioId: ObjOrigen.inventarioId },
              },
              include: { lote: true },
            });
            if (!ObjFuente) throw new Error("FUENTE_INVENTARIO_INCONSISTENTE");
            if (!ObjFuente.lote.activo) throw new Error("LOTE_INACTIVO");
            if (
              ObjFuente.lote.fechaVencimiento &&
              Fecha_formatearFechaCivil(ObjFuente.lote.fechaVencimiento) <
                Fecha_formatearFechaCivil(Obj.fechaAplicacion)
            )
              throw new Error("LOTE_INVENTARIO_VENCIDO");
            IntExistenciaLoteId = ObjFuente.existenciaLoteId;
          } else if (ObjOrigen.loteInventarioId)
            throw new Error("PRODUCTO_NO_MANEJA_LOTES");
          const ObjFuenteCreada = await ObjTx.sanidadAplicacionFuente.create({
            data: {
              detalleSanidadId: ObjDetalle.detalleSanidadId,
              productoId: ObjLinea.productoId,
              inventarioId: IntExistenciaLoteId ? null : ObjOrigen.inventarioId,
              existenciaLoteId: IntExistenciaLoteId ?? null,
              cantidadConsumida: ObjOrigen.cantidad,
            },
          });
          await Inventario_aplicarMovimientoConTx(ObjTx, {
            tipo: "SALIDA",
            subtipo: "SANIDAD",
            productoId: ObjLinea.productoId,
            inventarioId: ObjOrigen.inventarioId,
            loteInventarioId: ObjOrigen.loteInventarioId ?? undefined,
            cantidad: ObjOrigen.cantidad.negated(),
            motivo: Obj.motivo,
            IntUsuarioId: Obj.IntUsuarioId,
            animalId: Obj.animalId ?? null,
            loteProduccionId: Obj.loteProduccionId ?? null,
            sanidadFuenteId: ObjFuenteCreada.fuenteSanidadId,
            StrIp: Obj.StrIp,
          });
        }
      }
      await ObjTx.produccionEvento.create({
        data: {
          animalId: Obj.animalId ?? null,
          loteProduccionId: Obj.loteProduccionId ?? null,
          usuarioId: Obj.IntUsuarioId,
          aplicacionSanitariaId: ObjRegistro.aplicacionSanitariaId,
          tipoEvento: "APLICACION_SANITARIA",
          fechaEvento: Obj.fechaAplicacion,
          descripcion: `Aplicacion sanitaria ${ObjRegistro.aplicacionSanitariaId}.`,
        },
      });
      await ObjTx.usuarioBitacora.create({
        data: {
          usuarioId: Obj.IntUsuarioId,
          modulo: "SANIDAD",
          accion: "SANIDAD_APLICACION_REGISTRADA",
          descripcion: `Aplicacion sanitaria ${ObjRegistro.aplicacionSanitariaId}.`,
          resultado: "EXITO",
          direccionIp: Obj.StrIp ?? null,
        },
      });
      return ObjTx.sanidadAplicacion.findUniqueOrThrow({
        where: { aplicacionSanitariaId: ObjRegistro.aplicacionSanitariaId },
        include: ObjAplicacionInclude,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function Sanidad_revertir(
  IntId: number,
  StrMotivo: string,
  IntUsuarioId: number,
  StrIp?: string,
) {
  return BaseDatos_obtenerCliente().$transaction(
    async (ObjTx) => {
      const ObjRegistro = await ObjTx.sanidadAplicacion.findUnique({
        where: { aplicacionSanitariaId: IntId },
        include: {
          detalles: {
            include: {
              fuentes: {
                include: {
                  inventarioTransacciones: { include: { reversion: true } },
                },
              },
            },
          },
        },
      });
      if (!ObjRegistro) throw new Error("SANIDAD_APLICACION_NO_ENCONTRADA");
      if (ObjRegistro.estado === "REVERTIDA")
        throw new Error("SANIDAD_APLICACION_YA_REVERTIDA");
      const DtAhora = Fecha_obtenerAhoraGuatemala();
      for (const ObjDetalle of ObjRegistro.detalles)
        for (const ObjFuente of ObjDetalle.fuentes) {
          const ObjMovimiento = ObjFuente.inventarioTransacciones.find(
            (ObjM) =>
              ObjM.subtipoTransaccion === "SANIDAD" &&
              ObjM.transaccionRevertidaId === null,
          );
          if (!ObjMovimiento || ObjMovimiento.reversion)
            throw new Error("SANIDAD_INCONSISTENTE");
          await Inventario_revertirMovimientoConTx(
            ObjTx,
            ObjMovimiento,
            IntUsuarioId,
            DtAhora,
          );
        }
      await ObjTx.sanidadAplicacion.update({
        where: { aplicacionSanitariaId: IntId },
        data: {
          estado: "REVERTIDA",
          usuarioReversionId: IntUsuarioId,
          fechaReversion: DtAhora,
          motivoReversion: StrMotivo,
        },
      });
      await ObjTx.usuarioBitacora.create({
        data: {
          usuarioId: IntUsuarioId,
          modulo: "SANIDAD",
          accion: "SANIDAD_APLICACION_REVERTIDA",
          descripcion: `Aplicacion sanitaria ${IntId}.`,
          resultado: "EXITO",
          direccionIp: StrIp ?? null,
        },
      });
      return {
        aplicacionSanitariaId: IntId,
        estado: "REVERTIDA",
        fechaReversion: DtAhora,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function Sanidad_listar(Obj: {
  IntPagina: number;
  IntLimite: number;
  StrBusqueda?: string | undefined;
  StrEstado?: string | undefined;
  StrDestino?: string | undefined;
  IntAnimalId?: number | undefined;
  IntLoteId?: number | undefined;
  IntTipoId?: number | undefined;
  DtDesde?: Date | undefined;
  DtHasta?: Date | undefined;
}) {
  const P = BaseDatos_obtenerCliente();
  const ArrAsignaciones = Obj.IntAnimalId
    ? await P.produccionAsignacionLote.findMany({
        where: { animalId: Obj.IntAnimalId },
        select: { loteProduccionId: true, fechaInicio: true, fechaFin: true },
      })
    : [];
  const ArrFiltros: Prisma.SanidadAplicacionWhereInput[] = [];
  if (Obj.IntAnimalId) {
    ArrFiltros.push({
      OR: [
        { animalId: Obj.IntAnimalId },
        ...ArrAsignaciones.map((ObjAsignacion) => ({
          loteProduccionId: ObjAsignacion.loteProduccionId,
          fechaAplicacion: {
            gte: ObjAsignacion.fechaInicio,
            ...(ObjAsignacion.fechaFin ? { lte: ObjAsignacion.fechaFin } : {}),
          },
        })),
      ],
    });
  }
  if (Obj.StrBusqueda) {
    ArrFiltros.push({ OR: [
      { animal: { identificacion: { contains: Obj.StrBusqueda } } },
      { lote: { codigo: { contains: Obj.StrBusqueda } } },
    ] });
  }
  const where: Prisma.SanidadAplicacionWhereInput = {
    ...(Obj.StrEstado ? { estado: Obj.StrEstado } : {}),
    ...(Obj.StrDestino === "ANIMAL"
      ? { animalId: { not: null } }
      : Obj.StrDestino === "LOTE"
        ? { loteProduccionId: { not: null } }
        : {}),
    ...(ArrFiltros.length ? { AND: ArrFiltros } : {}),
    ...(Obj.IntLoteId ? { loteProduccionId: Obj.IntLoteId } : {}),
    ...(Obj.IntTipoId ? { tipoAplicacionId: Obj.IntTipoId } : {}),
    ...(Obj.DtDesde || Obj.DtHasta
      ? {
          fechaAplicacion: {
            ...(Obj.DtDesde ? { gte: Obj.DtDesde } : {}),
            ...(Obj.DtHasta ? { lte: Obj.DtHasta } : {}),
          },
        }
      : {}),
  };
  const [datos, total] = await P.$transaction([
    P.sanidadAplicacion.findMany({
      where,
      include: ObjAplicacionInclude,
      orderBy: { fechaAplicacion: "desc" },
      skip: (Obj.IntPagina - 1) * Obj.IntLimite,
      take: Obj.IntLimite,
    }),
    P.sanidadAplicacion.count({ where }),
  ]);
  return { datos, total };
}
export const Sanidad_obtener = (IntId: number) =>
  BaseDatos_obtenerCliente().sanidadAplicacion.findUnique({
    where: { aplicacionSanitariaId: IntId },
    include: ObjAplicacionInclude,
  });

export async function Sanidad_listarCatalogo(
  StrTipo: "tipos" | "vias" | "unidades",
  BoolSoloActivos = false,
) {
  const P = BaseDatos_obtenerCliente();
  const where = BoolSoloActivos ? { activo: true } : {};
  return StrTipo === "tipos"
    ? P.sanidadTipoAplicacion.findMany({ where, orderBy: { codigo: "asc" } })
    : StrTipo === "vias"
      ? P.sanidadViaAdministracion.findMany({
          where,
          orderBy: { codigo: "asc" },
        })
      : P.sanidadUnidadDosis.findMany({ where, orderBy: { codigo: "asc" } });
}
export async function Sanidad_crearCatalogo(
  StrTipo: "tipos" | "vias" | "unidades",
  Obj: { codigo: string; nombre: string; descripcion?: string | null | undefined },
) {
  const P = BaseDatos_obtenerCliente();
  const ObjDatos = { codigo: Obj.codigo, nombre: Obj.nombre, descripcion: Obj.descripcion ?? null };
  return StrTipo === "tipos"
    ? P.sanidadTipoAplicacion.create({ data: ObjDatos })
    : StrTipo === "vias"
      ? P.sanidadViaAdministracion.create({ data: ObjDatos })
      : P.sanidadUnidadDosis.create({ data: ObjDatos });
}
export async function Sanidad_editarCatalogo(
  StrTipo: "tipos" | "vias" | "unidades",
  IntId: number,
  Obj: Record<string, unknown>,
) {
  const P = BaseDatos_obtenerCliente();
  const data = { ...Obj, fechaActualizacion: Fecha_obtenerAhoraGuatemala() };
  return StrTipo === "tipos"
    ? P.sanidadTipoAplicacion.update({
        where: { tipoAplicacionId: IntId },
        data,
      })
    : StrTipo === "vias"
      ? P.sanidadViaAdministracion.update({
          where: { viaAdministracionId: IntId },
          data,
        })
      : P.sanidadUnidadDosis.update({ where: { unidadDosisId: IntId }, data });
}
export async function Sanidad_listarProductos(BoolSoloHabilitados = false) {
  return BaseDatos_obtenerCliente().inventarioProducto.findMany({
    where: {
      activo: true,
      ...(BoolSoloHabilitados ? { habilitacionSanidad: { activo: true } } : {}),
    },
    select: { ...ObjProducto, habilitacionSanidad: true },
    orderBy: { codigo: "asc" },
  });
}
export function Sanidad_habilitarProducto(
  IntProductoId: number,
  BoolActivo: boolean,
) {
  return BaseDatos_obtenerCliente().sanidadProductoHabilitado.upsert({
    where: { productoId: IntProductoId },
    create: { productoId: IntProductoId, activo: BoolActivo },
    update: {
      activo: BoolActivo,
      fechaActualizacion: Fecha_obtenerAhoraGuatemala(),
    },
  });
}
export async function Sanidad_destinosAnimales(
  StrBusqueda: string | undefined,
  IntPagina: number,
  IntLimite: number,
) {
  const where: Prisma.ProduccionAnimalWhereInput = {
    estadoActual: "ACTIVO",
    asignaciones: { some: { estado: "VIGENTE", lote: { estado: "ACTIVO" } } },
    ...(StrBusqueda ? { identificacion: { contains: StrBusqueda } } : {}),
  };
  const P = BaseDatos_obtenerCliente();
  const [datos, total] = await P.$transaction([
    P.produccionAnimal.findMany({
      where,
      select: {
        animalId: true,
        identificacion: true,
        sexo: true,
        tipoAnimal: { select: { tipoAnimalId: true, nombre: true } },
        asignaciones: {
          where: { estado: "VIGENTE" },
          select: {
            lote: {
              select: { loteProduccionId: true, codigo: true, nombre: true },
            },
          },
          take: 1,
        },
      },
      skip: (IntPagina - 1) * IntLimite,
      take: IntLimite,
    }),
    P.produccionAnimal.count({ where }),
  ]);
  return { datos, total };
}
export async function Sanidad_destinosLotes(
  StrBusqueda: string | undefined,
  IntPagina: number,
  IntLimite: number,
) {
  const where: Prisma.ProduccionLoteWhereInput = {
    estado: "ACTIVO",
    asignaciones: {
      some: { estado: "VIGENTE", animal: { estadoActual: "ACTIVO" } },
    },
    ...(StrBusqueda
      ? {
          OR: [
            { codigo: { contains: StrBusqueda } },
            { nombre: { contains: StrBusqueda } },
          ],
        }
      : {}),
  };
  const P = BaseDatos_obtenerCliente();
  const [datos, total] = await P.$transaction([
    P.produccionLote.findMany({
      where,
      select: {
        loteProduccionId: true,
        codigo: true,
        nombre: true,
        tipoAnimal: { select: { tipoAnimalId: true, nombre: true } },
        _count: {
          select: {
            asignaciones: {
              where: { estado: "VIGENTE", animal: { estadoActual: "ACTIVO" } },
            },
          },
        },
      },
      skip: (IntPagina - 1) * IntLimite,
      take: IntLimite,
    }),
    P.produccionLote.count({ where }),
  ]);
  return { datos, total };
}
export const Sanidad_almacenes = () =>
  BaseDatos_obtenerCliente().inventarioAlmacen.findMany({
    where: { activo: true },
    select: { inventarioId: true, codigo: true, nombre: true },
    orderBy: { codigo: "asc" },
  });
export const Sanidad_existencias = (
  IntProductoId: number,
  IntInventarioId?: number,
) =>
  BaseDatos_obtenerCliente().inventarioExistencia.findMany({
    where: {
      productoId: IntProductoId,
      activo: true,
      almacen: { activo: true },
      ...(IntInventarioId ? { inventarioId: IntInventarioId } : {}),
    },
    select: {
      inventarioId: true,
      productoId: true,
      existenciaActual: true,
      costoPromedioActual: true,
      producto: { select: { manejaLotes: true, unidadMedida: true } },
      almacen: { select: { codigo: true, nombre: true } },
    },
  });
export const Sanidad_lotes = (IntProductoId: number, IntInventarioId: number) =>
  BaseDatos_obtenerCliente().inventarioExistenciaLote.findMany({
    where: {
      productoId: IntProductoId,
      existencia: { inventarioId: IntInventarioId },
      existenciaActual: { gt: 0 },
      lote: { activo: true },
    },
    select: {
      loteInventarioId: true,
      existenciaActual: true,
      lote: {
        select: {
          codigoLote: true,
          fechaVencimiento: true,
          costoUnitario: true,
          activo: true,
        },
      },
    },
  });
export async function Sanidad_diagnosticar() {
  const P = BaseDatos_obtenerCliente();
  const [IntFuentes, IntMovimientos] = await Promise.all([
    P.sanidadAplicacionFuente.count(),
    P.inventarioTransaccion.count({
      where: { sanidadFuenteId: { not: null }, subtipoTransaccion: "SANIDAD" },
    }),
  ]);
  return {
    consistente: IntFuentes === IntMovimientos,
    fuentesRevisadas: IntFuentes,
    movimientosRevisados: IntMovimientos,
    diferencias:
      IntFuentes === IntMovimientos
        ? []
        : [
            {
              tipo: "FUENTES_MOVIMIENTOS",
              esperado: IntFuentes,
              actual: IntMovimientos,
            },
          ],
  };
}
