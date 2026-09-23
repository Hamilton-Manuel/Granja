import { z } from "zod";
import { Prisma } from "../../../../generated/prisma/client.js";
import { Fecha_parsearFechaCivil, Fecha_parsearFechaHoraGuatemala } from "../../../datetime/fecha.js";

const ObjId = z.number().int().positive().max(2147483647);
const ObjCantidad = z.string().regex(/^(?!0+(?:\.0+)?$)\d{1,18}(?:\.\d{1,6})?$/);
const ObjUnidadPeso = z.enum(["g", "kg", "lb", "oz", "qq", "t"]);
const ObjObservaciones = z.string().trim().min(1).max(1000).optional();
const ObjFechaEfectiva = z.string().refine(StrValor => {
  try { Fecha_parsearFechaHoraGuatemala(StrValor); return true; } catch { return false; }
}, "Fecha y hora civil de Guatemala inválida.");
const ObjFechaCivil = z.string().refine(StrValor => {
  try { Fecha_parsearFechaCivil(StrValor); return true; } catch { return false; }
}, "Fecha civil inválida.");

export const ObjConcentradoCrear = z.object({ productoId: ObjId }).strict();
export const ObjConcentradoEstado = z.object({ activo: z.boolean() }).strict();
export const ObjConcentradoParametro = z.object({
  concentradoId: z.coerce.number().int().positive().max(2147483647),
}).strict();
export const ObjConcentradoConsulta = z.object({
  pagina: z.coerce.number().int().positive().max(1000000).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  busqueda: z.string().trim().max(100).optional(),
  concentradoId: z.coerce.number().int().positive().max(2147483647).optional(),
}).strict();
export const ObjConcentradoRecetaParametro = z.object({ recetaId: z.coerce.number().int().positive().max(2147483647) }).strict();
export const ObjConcentradoRecetaEstado = z.object({ activo: z.boolean(), versionEsperada: ObjId }).strict();

const ObjRecetaCampos = z.object({
  concentradoId: ObjId,
  nombre: z.string().trim().min(1).max(150),
  descripcion: z.string().trim().max(500).optional(),
  cantidadBase: ObjCantidad,
  unidadBase: ObjUnidadPeso,
  detalles: z.array(z.object({
    productoId: ObjId, cantidad: ObjCantidad, unidadMedida: ObjUnidadPeso,
  }).strict()).min(1).max(100),
}).strict();
const Alimentacion_ingredientesUnicos = (ObjReceta: z.infer<typeof ObjRecetaCampos>) =>
  new Set(ObjReceta.detalles.map(ObjDetalle => ObjDetalle.productoId)).size === ObjReceta.detalles.length;
export const ObjConcentradoRecetaCrear = ObjRecetaCampos.refine(Alimentacion_ingredientesUnicos, "Ingredientes duplicados.");
export const ObjConcentradoRecetaEditar = ObjRecetaCampos.extend({ versionEsperada: ObjId })
  .refine(Alimentacion_ingredientesUnicos, "Ingredientes duplicados.");

// La identidad del actor y todos los costos provienen del servidor.
const ObjElaboracionCampos = z.object({
  recetaId: ObjId,
  versionReceta: ObjId,
  fechaEfectiva: ObjFechaEfectiva,
  cantidadTeorica: ObjCantidad,
  cantidadReal: ObjCantidad,
  unidadCaptura: ObjUnidadPeso,
  inventarioDestinoId: ObjId,
  fechaVencimiento: ObjFechaCivil.optional(),
  motivoDiferencia: ObjObservaciones,
  observaciones: ObjObservaciones,
}).strict();
function Alimentacion_validarRendimiento(ObjEntrada: z.infer<typeof ObjElaboracionCampos>, ObjContexto: z.RefinementCtx) {
  if (ObjCantidad.safeParse(ObjEntrada.cantidadTeorica).success && ObjCantidad.safeParse(ObjEntrada.cantidadReal).success &&
      !new Prisma.Decimal(ObjEntrada.cantidadTeorica).eq(ObjEntrada.cantidadReal) && !ObjEntrada.motivoDiferencia) {
    ObjContexto.addIssue({ code: "custom", path: ["motivoDiferencia"], message: "Justifique la diferencia entre cantidad teórica y real." });
  }
  if (ObjEntrada.fechaVencimiento && ObjEntrada.fechaVencimiento < ObjEntrada.fechaEfectiva.slice(0, 10)) {
    ObjContexto.addIssue({ code: "custom", path: ["fechaVencimiento"], message: "El vencimiento no puede preceder a la elaboración." });
  }
}
export const ObjConcentradoPrevisualizar = ObjElaboracionCampos.superRefine(Alimentacion_validarRendimiento);
export const ObjConcentradoConfirmar = ObjElaboracionCampos.extend({
  claveIdempotencia: z.uuid(),
  huellaPrevisualizacion: z.string().regex(/^[a-f0-9]{64}$/),
}).superRefine(Alimentacion_validarRendimiento);
export const ObjConcentradoRevertir = z.object({ motivo: z.string().trim().min(1).max(500) }).strict();
export const ObjConcentradoElaboracionParametro = z.object({ elaboracionId: z.coerce.number().int().positive().max(2147483647) }).strict();
