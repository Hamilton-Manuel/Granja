import { Prisma } from "../../../generated/prisma/client.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import {
  Fecha_convertirAlmacenamientoGuatemalaAInstante,
  Fecha_convertirInstanteAAlmacenamientoGuatemala,
  Fecha_formatearFechaCivil,
  Fecha_formatearInstanteGuatemala,
  Fecha_parsearFechaCivil,
  Fecha_parsearFechaHoraGuatemala,
} from "../../datetime/fecha.js";
import * as R from "./sanidad.repository.js";
const ObjErrores: Record<string, [number, string]> = {
  PRODUCTO_NO_HABILITADO: [409, "El producto no está habilitado para Sanidad."],
  UNIDAD_DOSIS_INACTIVA: [409, "La unidad de dosis está inactiva."],
  VIA_ADMINISTRACION_INACTIVA: [409, "La vía de administración está inactiva."],
  LOTE_INVENTARIO_VENCIDO: [
    409,
    "El lote estaba vencido en la fecha efectiva.",
  ],
  LOTE_VENCIDO: [409, "El lote estaba vencido en la fecha efectiva."],
  STOCK_INSUFICIENTE: [409, "No existe stock suficiente."],
  SANIDAD_APLICACION_NO_ENCONTRADA: [404, "La aplicación sanitaria no existe."],
  SANIDAD_APLICACION_YA_REVERTIDA: [
    409,
    "La aplicación sanitaria ya fue revertida.",
  ],
  SANIDAD_INCONSISTENTE: [
    409,
    "La aplicación no puede revertirse por una inconsistencia histórica.",
  ],
};
function Sanidad_error(ObjError: unknown): never {
  if (ObjError instanceof ErrorAplicacion) throw ObjError;
  const StrCodigo =
    ObjError instanceof Error ? ObjError.message : "ERROR_INTERNO";
  const Obj = ObjErrores[StrCodigo];
  if (Obj) throw new ErrorAplicacion(Obj[0], StrCodigo, Obj[1]);
  if (
    ObjError instanceof Prisma.PrismaClientKnownRequestError &&
    ObjError.code === "P2002"
  )
    throw new ErrorAplicacion(
      409,
      "REGISTRO_DUPLICADO",
      "El registro ya existe.",
    );
  throw ObjError;
}
export async function Sanidad_registrar(
  Obj: Parameters<typeof R.Sanidad_registrar>[0] extends never
    ? never
    : {
        tipoAplicacionId: number;
        fechaAplicacion: string;
        proximaAplicacion?: string | null | undefined;
        destino:
          | { tipo: "ANIMAL"; animalId: number }
          | { tipo: "LOTE"; loteProduccionId: number };
        motivo: string;
        diagnostico?: string | null | undefined;
        observaciones?: string | null | undefined;
        detalles: Array<{
          productoId: number;
          dosisClinica: string;
          unidadDosisId: number;
          viaAdministracionId: number;
          alcanceDosis: "INDIVIDUAL" | "POR_ANIMAL" | "TOTAL_LOTE";
          fuentes: Array<{
            inventarioId: number;
            loteInventarioId: number;
            cantidad: string;
          }>;
        }>;
        IntUsuarioId: number;
        StrIp?: string | undefined;
      },
) {
  const P = (
    await import("../../database/prisma.js")
  ).BaseDatos_obtenerCliente();
  const DtFecha = Fecha_convertirInstanteAAlmacenamientoGuatemala(
    Fecha_parsearFechaHoraGuatemala(Obj.fechaAplicacion),
  );
  const ObjTipo = await P.sanidadTipoAplicacion.findUnique({
    where: { tipoAplicacionId: Obj.tipoAplicacionId },
  });
  if (!ObjTipo)
    throw new ErrorAplicacion(
      404,
      "TIPO_APLICACION_NO_ENCONTRADO",
      "El tipo no existe.",
    );
  if (!ObjTipo.activo)
    throw new ErrorAplicacion(
      409,
      "TIPO_APLICACION_INACTIVO",
      "El tipo está inactivo.",
    );
  if (Obj.destino.tipo === "ANIMAL") {
    const ObjAnimal = await P.produccionAnimal.findUnique({
      where: { animalId: Obj.destino.animalId },
      include: {
        asignaciones: {
          where: { estado: "VIGENTE", lote: { estado: "ACTIVO" } },
        },
      },
    });
    if (
      !ObjAnimal ||
      ObjAnimal.estadoActual !== "ACTIVO" ||
      ObjAnimal.asignaciones.length !== 1
    )
      throw new ErrorAplicacion(
        409,
        "DESTINO_ANIMAL_INVALIDO",
        "El animal no está activo con asignación vigente.",
      );
    if (Obj.detalles.some((ObjD) => ObjD.alcanceDosis !== "INDIVIDUAL"))
      throw new ErrorAplicacion(
        400,
        "ALCANCE_DOSIS_INVALIDO",
        "Una aplicación individual requiere alcance INDIVIDUAL.",
      );
  } else {
    const ObjLote = await P.produccionLote.findUnique({
      where: { loteProduccionId: Obj.destino.loteProduccionId },
      include: {
        asignaciones: {
          where: { estado: "VIGENTE", animal: { estadoActual: "ACTIVO" } },
        },
      },
    });
    if (
      !ObjLote ||
      ObjLote.estado !== "ACTIVO" ||
      ObjLote.asignaciones.length === 0
    )
      throw new ErrorAplicacion(
        409,
        "DESTINO_LOTE_INVALIDO",
        "El lote no está activo o no contiene animales vigentes.",
      );
    if (Obj.detalles.some((ObjD) => ObjD.alcanceDosis === "INDIVIDUAL"))
      throw new ErrorAplicacion(
        400,
        "ALCANCE_DOSIS_INVALIDO",
        "Una aplicación de lote requiere POR_ANIMAL o TOTAL_LOTE.",
      );
  }
  try {
    return await R.Sanidad_registrar({
      tipoAplicacionId: Obj.tipoAplicacionId,
      fechaAplicacion: DtFecha,
      proximaAplicacion: Obj.proximaAplicacion
        ? Fecha_parsearFechaCivil(Obj.proximaAplicacion)
        : null,
      ...(Obj.destino.tipo === "ANIMAL"
        ? { animalId: Obj.destino.animalId }
        : { loteProduccionId: Obj.destino.loteProduccionId }),
      motivo: Obj.motivo,
      diagnostico: Obj.diagnostico,
      observaciones: Obj.observaciones,
      detalles: Obj.detalles.map((ObjD) => ({
        ...ObjD,
        dosisClinica: new Prisma.Decimal(ObjD.dosisClinica),
        fuentes: ObjD.fuentes.map((ObjF) => ({
          ...ObjF,
          cantidad: new Prisma.Decimal(ObjF.cantidad),
        })),
      })),
      IntUsuarioId: Obj.IntUsuarioId,
      StrIp: Obj.StrIp,
    });
  } catch (ObjError) {
    Sanidad_error(ObjError);
  }
}
export async function Sanidad_revertir(
  ...ArrArgs: Parameters<typeof R.Sanidad_revertir>
) {
  try {
    return await R.Sanidad_revertir(...ArrArgs);
  } catch (ObjError) {
    Sanidad_error(ObjError);
  }
}
export const Sanidad_listar = R.Sanidad_listar;
export const Sanidad_obtener = R.Sanidad_obtener;
export const Sanidad_listarCatalogo = R.Sanidad_listarCatalogo;
export const Sanidad_crearCatalogo = R.Sanidad_crearCatalogo;
export const Sanidad_editarCatalogo = R.Sanidad_editarCatalogo;
export const Sanidad_listarProductos = R.Sanidad_listarProductos;
export const Sanidad_habilitarProducto = R.Sanidad_habilitarProducto;
export const Sanidad_destinosAnimales = R.Sanidad_destinosAnimales;
export const Sanidad_destinosLotes = R.Sanidad_destinosLotes;
export const Sanidad_almacenes = R.Sanidad_almacenes;
export const Sanidad_existencias = R.Sanidad_existencias;
export function Sanidad_lotes(IntProductoId:number,IntInventarioId:number,StrFecha?:string){return R.Sanidad_lotes(IntProductoId,IntInventarioId,StrFecha?Fecha_parsearFechaCivil(StrFecha.slice(0,10)):undefined);}
export const Sanidad_diagnosticar = R.Sanidad_diagnosticar;
export function Sanidad_formatearRespuesta(Obj: unknown, StrCampo?: string): unknown {
  if (Obj instanceof Prisma.Decimal) return Obj.toFixed(4);
  if (Obj instanceof Date) return StrCampo === "proximaAplicacion" || StrCampo === "fechaVencimiento"
    ? Fecha_formatearFechaCivil(Obj)
    : Fecha_formatearInstanteGuatemala(Fecha_convertirAlmacenamientoGuatemalaAInstante(Obj));
  if (Array.isArray(Obj)) return Obj.map((ObjItem) => Sanidad_formatearRespuesta(ObjItem));
  if (Obj && typeof Obj === "object")
    return Object.fromEntries(
      Object.entries(Obj).map(([StrK, ObjV]) => [
        StrK,
        Sanidad_formatearRespuesta(ObjV, StrK),
      ]),
    );
  return Obj;
}
