import { z } from "zod";
const ObjId = z.coerce.number().int().positive();
const ObjDecimal = z
  .string()
  .regex(/^(?!0+(?:\.0{1,6})?$)\d{1,18}(?:\.\d{1,6})?$/);
const ObjTexto = (IntMax: number) =>
  z
    .string()
    .trim()
    .max(IntMax)
    .transform((Str) => (Str === "" ? null : Str))
    .nullable()
    .optional();
export const ObjConsultaSanidad = z
  .object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    busqueda: z.string().trim().max(100).optional(),
    estado: z.enum(["CONFIRMADA", "REVERTIDA"]).optional(),
    destino: z.enum(["ANIMAL", "LOTE"]).optional(),
    animalId: ObjId.optional(),
    loteProduccionId: ObjId.optional(),
    tipoAplicacionId: ObjId.optional(),
    fechaDesde: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    fechaHasta: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();
export const ObjConsultaLookupSanidad = z
  .object({
    busqueda: z.string().trim().max(100).optional(),
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export const ObjConsultaExistenciasSanidad = z
  .object({ productoId: ObjId, inventarioId: ObjId.optional() })
  .strict();
export const ObjConsultaLotesSanidad = z
  .object({
    productoId: ObjId,
    inventarioId: ObjId,
    fechaAplicacion: z.string().optional(),
  })
  .strict();
const ObjFuente = z
  .object({
    inventarioId: ObjId,
    loteInventarioId: ObjId,
    cantidad: ObjDecimal,
  })
  .strict();
const ObjDetalle = z
  .object({
    productoId: ObjId,
    dosisClinica: ObjDecimal,
    unidadDosisId: ObjId,
    viaAdministracionId: ObjId,
    alcanceDosis: z.enum(["INDIVIDUAL", "POR_ANIMAL", "TOTAL_LOTE"]),
    fuentes: z.array(ObjFuente).min(1).max(100),
  })
  .strict();
export const ObjRegistrarSanidad = z
  .object({
    tipoAplicacionId: ObjId,
    fechaAplicacion: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-06:00$/),
    proximaAplicacion: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    destino: z.discriminatedUnion("tipo", [
      z.object({ tipo: z.literal("ANIMAL"), animalId: ObjId }).strict(),
      z.object({ tipo: z.literal("LOTE"), loteProduccionId: ObjId }).strict(),
    ]),
    motivo: z.string().trim().min(1).max(500),
    diagnostico: ObjTexto(1000),
    observaciones: ObjTexto(1000),
    detalles: z.array(ObjDetalle).max(100).default([]),
  })
  .strict();
export const ObjRevertirSanidad = z
  .object({ motivo: z.string().trim().min(1).max(500) })
  .strict();
export const ObjCatalogoSanidad = z
  .object({
    codigo: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_]+$/)
      .max(50),
    nombre: z.string().trim().min(1).max(100),
    descripcion: ObjTexto(500),
  })
  .strict();
export const ObjEditarCatalogoSanidad = ObjCatalogoSanidad.omit({
  codigo: true,
})
  .partial()
  .refine((Obj) => Object.keys(Obj).length > 0);
export const ObjEstadoSanidad = z.object({ activo: z.boolean() }).strict();
export const ObjParametroSanidad = z
  .object({ aplicacionSanitariaId: ObjId })
  .strict();
export const ObjParametroCatalogoSanidad = z
  .object({ catalogoId: ObjId })
  .strict();
export const ObjParametroProductoSanidad = z
  .object({ productoId: ObjId })
  .strict();
export const ObjCuerpoVacioSanidad = z.object({}).strict();
