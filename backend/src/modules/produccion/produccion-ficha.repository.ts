import { Prisma } from "../../../generated/prisma/client.js";
import { BaseDatos_obtenerCliente } from "../../database/prisma.js";

const ObjDetalleSanitario = {
  producto: { select: { nombre: true } },
  unidadDosis: { select: { nombre: true } },
  viaAdministracion: { select: { nombre: true } },
} satisfies Prisma.SanidadAplicacionDetalleSelect;

const ObjAplicacionSanitaria = {
  aplicacionSanitariaId: true,
  fechaAplicacion: true,
  motivo: true,
  diagnostico: true,
  observaciones: true,
  animalId: true,
  loteProduccionId: true,
  tipoAplicacion: { select: { nombre: true } },
  lote: { select: { codigo: true, nombre: true } },
  detalles: { select: { dosisClinica: true, alcanceDosis: true, ...ObjDetalleSanitario } },
} satisfies Prisma.SanidadAplicacionSelect;

export async function Produccion_obtenerDatosFichaTecnica(IntAnimalId: number) {
  const ObjPrisma = BaseDatos_obtenerCliente();
  return ObjPrisma.$transaction(async (ObjTx) => {
    const ObjAnimal = await ObjTx.produccionAnimal.findUnique({
      where: { animalId: IntAnimalId },
      select: {
        animalId: true,
        identificacion: true,
        sexo: true,
        fechaNacimiento: true,
        fechaIngreso: true,
        estadoActual: true,
        observaciones: true,
        tipoAnimal: { select: { nombre: true } },
        raza: { select: { nombre: true } },
        madre: { select: { identificacion: true } },
        fotos: { where: { esPrincipal: true }, select: { animalFotoId: true }, take: 1 },
        asignaciones: {
          orderBy: { fechaInicio: "asc" },
          select: {
            asignacionLoteId: true,
            fechaInicio: true,
            fechaFin: true,
            estado: true,
            motivoCambio: true,
            lote: { select: { loteProduccionId: true, codigo: true, nombre: true, estado: true } },
          },
        },
        mediciones: {
          orderBy: { fechaMedicion: "asc" },
          select: { medicionId: true, tipoMedicion: true, valor: true, unidadMedida: true, metodoObtencion: true, perimetroToracicoCm: true, longitudCorporalCm: true, fechaMedicion: true, observaciones: true },
        },
        historialEstados: {
          orderBy: { fechaCambio: "asc" },
          select: { historialEstadoId: true, estadoAnterior: true, estadoNuevo: true, motivo: true, fechaCambio: true },
        },
        operaciones: {
          where: { operacion: { tipoOperacion: "INGRESO" } },
          orderBy: { operacion: { fechaOperacion: "asc" } },
          take: 1,
          select: { operacion: { select: { subtipoOperacion: true, fechaOperacion: true } } },
        },
        sanidadAplicaciones: {
          where: { estado: "CONFIRMADA" },
          orderBy: { fechaAplicacion: "asc" },
          select: ObjAplicacionSanitaria,
        },
      },
    });
    if (!ObjAnimal) return null;

    const ArrIntervalos = ObjAnimal.asignaciones.map((ObjAsignacion) => ({
      loteProduccionId: ObjAsignacion.lote.loteProduccionId,
      fechaAplicacion: {
        gte: ObjAsignacion.fechaInicio,
        ...(ObjAsignacion.fechaFin ? { lt: ObjAsignacion.fechaFin } : {}),
      },
    }));
    const ArrSanidadLote = ArrIntervalos.length
      ? await ObjTx.sanidadAplicacion.findMany({
          where: { estado: "CONFIRMADA", animalId: null, OR: ArrIntervalos },
          orderBy: { fechaAplicacion: "asc" },
          select: ObjAplicacionSanitaria,
        })
      : [];
    return { ObjAnimal, ArrSanidadLote };
  });
}

export type DatosFichaTecnica = NonNullable<Awaited<ReturnType<typeof Produccion_obtenerDatosFichaTecnica>>>;
