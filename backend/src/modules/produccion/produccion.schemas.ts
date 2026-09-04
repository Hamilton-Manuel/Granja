import { z } from "zod";

const ObjId = z.coerce.number().int().positive();
const ObjTextoNullable = (IntMaximo: number) => z.string().trim().max(IntMaximo).transform((StrValor) => StrValor === "" ? null : StrValor).nullable().optional();
const ObjFechaCivil = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ObjDecimalNoNegativo = z.string().regex(/^\d{1,16}(?:\.\d{1,2})?$/);
const ObjAnimalBase = z.object({
  identificacion: z.string().trim().min(1).max(100), tipoAnimalId: ObjId, razaId: ObjId.nullable().optional(),
  sexo: z.enum(["MACHO", "HEMBRA", "NO_DETERMINADO"]), fechaNacimiento: ObjFechaCivil.nullable().optional(),
  madreAnimalId: ObjId.nullable().optional(), observaciones: ObjTextoNullable(1000),
}).strict();

export const ObjConsultaProduccion = z.object({ pagina: z.coerce.number().int().positive().default(1), limite: z.coerce.number().int().min(1).max(100).default(20), busqueda: z.string().trim().max(200).optional(), estado: z.string().trim().max(30).optional() }).strict();
export const ObjConsultaRazas = ObjConsultaProduccion.extend({ tipoAnimalId: ObjId.optional() }).strict();
export const ObjConsultaLotes = ObjConsultaProduccion.extend({ tipoAnimalId: ObjId.optional() }).strict();
export const ObjConsultaAnimales = ObjConsultaProduccion.extend({ tipoAnimalId: ObjId.optional(), razaId: ObjId.optional(), loteProduccionId: ObjId.optional(), sexo: z.enum(["MACHO", "HEMBRA", "NO_DETERMINADO"]).optional() }).strict();
export const ObjConsultaOperaciones = ObjConsultaProduccion.extend({ tipo: z.string().trim().max(30).optional(), subtipo: z.string().trim().max(40).optional(), loteProduccionId: ObjId.optional(), animalId: ObjId.optional() }).strict();
export const ObjConsultaMediciones = z.object({ pagina: z.coerce.number().int().positive().default(1), limite: z.coerce.number().int().min(1).max(100).default(20), animalId: ObjId.optional(), fechaDesde: ObjFechaCivil.optional(), fechaHasta: ObjFechaCivil.optional() }).strict();

export const ObjCrearTipo = z.object({ nombre: z.string().trim().min(1).max(100), descripcion: ObjTextoNullable(500) }).strict();
export const ObjEditarTipo = ObjCrearTipo.partial().refine((ObjValor) => Object.keys(ObjValor).length > 0);
export const ObjCrearRaza = z.object({ tipoAnimalId: ObjId, nombre: z.string().trim().min(1).max(150), descripcion: ObjTextoNullable(500) }).strict();
export const ObjEditarRaza = ObjCrearRaza.partial().refine((ObjValor) => Object.keys(ObjValor).length > 0);
export const ObjEstadoActivo = z.object({ activo: z.boolean() }).strict();
export const ObjCrearLote = z.object({ tipoAnimalId: ObjId, codigo: z.string().trim().min(1).max(50), nombre: z.string().trim().min(1).max(150), descripcion: ObjTextoNullable(500) }).strict();
export const ObjEditarLote = z.object({ nombre: z.string().trim().min(1).max(150).optional(), descripcion: ObjTextoNullable(500) }).strict().refine((ObjValor) => Object.keys(ObjValor).length > 0);
export const ObjEstadoLote = z.object({ estado: z.enum(["ACTIVO", "CERRADO"]) }).strict();
export const ObjEditarAnimal = ObjAnimalBase.omit({ identificacion: true, tipoAnimalId: true }).partial().refine((ObjValor) => Object.keys(ObjValor).length > 0);

export const ObjIngresoInicial = z.object({ loteDestinoId: ObjId, documentoReferencia: ObjTextoNullable(150), motivo: ObjTextoNullable(500), observaciones: ObjTextoNullable(1000), animales: z.array(ObjAnimalBase).min(1).max(500) }).strict();
export const ObjNacimiento = z.object({ loteDestinoId: ObjId, motivo: ObjTextoNullable(500), observaciones: ObjTextoNullable(1000), animales: z.array(ObjAnimalBase).min(1).max(500) }).strict();
export const ObjCompra = z.object({ proveedorId: ObjId, loteDestinoId: ObjId, documentoReferencia: ObjTextoNullable(150), motivo: ObjTextoNullable(500), observaciones: ObjTextoNullable(1000), animales: z.array(ObjAnimalBase.extend({ costoAdquisicion: ObjDecimalNoNegativo }).strict()).min(1).max(500) }).strict();
export const ObjTraslado = z.object({ loteOrigenId: ObjId, loteDestinoId: ObjId, animalIds: z.array(ObjId).min(1).max(500), motivo: z.string().trim().min(1).max(500), observaciones: ObjTextoNullable(1000) }).strict();
export const ObjEstadoTerminal = z.object({ estado: z.enum(["FALLECIDO", "RETIRADO"]), motivo: z.string().trim().min(1).max(500), observaciones: ObjTextoNullable(1000) }).strict();
const ObjDecimalPesoPositivo = z.string().regex(/^(?!0+(?:\.0{1,4})?$)\d{1,14}(?:\.\d{1,4})?$/);
const ObjDecimalMedidaPositiva = z.string().regex(/^(?!0+(?:\.0{1,4})?$)\d{1,6}(?:\.\d{1,4})?$/);
export const ObjCrearMedicion = z.discriminatedUnion("metodoObtencion", [
  z.object({ animalId: ObjId, metodoObtencion: z.literal("BASCULA"), pesoKg: ObjDecimalPesoPositivo, observaciones: ObjTextoNullable(1000) }).strict(),
  z.object({ animalId: ObjId, metodoObtencion: z.literal("ESTIMACION_SCHAEFFER"), perimetroToracicoCm: ObjDecimalMedidaPositiva, longitudCorporalCm: ObjDecimalMedidaPositiva, observaciones: ObjTextoNullable(1000) }).strict(),
]);
export const ObjCuerpoVacio = z.object({}).strict();

export const ObjParametroTipo = z.object({ tipoAnimalId: ObjId }).strict();
export const ObjParametroRaza = z.object({ razaId: ObjId }).strict();
export const ObjParametroLote = z.object({ loteProduccionId: ObjId }).strict();
export const ObjParametroAnimal = z.object({ animalId: ObjId }).strict();
export const ObjParametroOperacion = z.object({ operacionProduccionId: ObjId }).strict();
