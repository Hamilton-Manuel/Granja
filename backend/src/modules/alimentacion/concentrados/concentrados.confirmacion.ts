import { createHash } from "node:crypto";
import { ErrorAplicacion } from "../../../errors/error-aplicacion.js";
import { ObjConcentradoConfirmar } from "./concentrados.schemas.js";
import { Prisma } from "../../../../generated/prisma/client.js";

/** MSSQL puede envolver SQL 1205 de $executeRaw como P2010/EREQUEST en lugar de P2034. */
export function Alimentacion_esConflictoConfirmacion(ObjError: unknown): boolean {
  if (!(ObjError instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (["P2002", "P2034", "P2028"].includes(ObjError.code)) return true;
  if (ObjError.code !== "P2010") return false;
  const ObjAdaptador = ObjError.meta?.driverAdapterError;
  const ObjCausa = ObjAdaptador && typeof ObjAdaptador === "object" && "cause" in ObjAdaptador ? ObjAdaptador.cause : undefined;
  return (ObjCausa !== null && typeof ObjCausa === "object" && "kind" in ObjCausa && ObjCausa.kind === "TransactionWriteConflict") ||
    String(ObjError.meta?.code) === "1205" ||
    /has been chosen as the deadlock victim/i.test(`${String(ObjError.meta?.message ?? "")} ${ObjError.message}`);
}

export function Alimentacion_prepararConfirmacion(ObjDatos: unknown, IntUsuarioId: number) {
  const ObjValidacion = ObjConcentradoConfirmar.safeParse(ObjDatos);
  if (!ObjValidacion.success) throw new ErrorAplicacion(400, "ELABORACION_DATOS_INVALIDOS", "La confirmación requiere datos válidos, clave UUID y huella de vista previa.");
  const { claveIdempotencia, huellaPrevisualizacion, ...ObjEntrada } = ObjValidacion.data;
  const StrClave = claveIdempotencia.toLowerCase();
  // Zod fija el orden y descarta diferencias de orden de propiedades HTTP; no ignora cambios de contenido.
  const StrHash = createHash("sha256").update(JSON.stringify({ version: 1, usuarioId: IntUsuarioId, clave: StrClave, entrada: ObjEntrada, huella: huellaPrevisualizacion })).digest("hex");
  return { ObjEntrada, StrClave, StrHash, StrHuella: huellaPrevisualizacion };
}
export function Alimentacion_exigirIdempotencia(ObjAnterior: { usuarioId: number; hashSolicitud: string }, IntUsuarioId: number, StrHash: string) {
  if (ObjAnterior.usuarioId !== IntUsuarioId || ObjAnterior.hashSolicitud !== StrHash) {
    throw new ErrorAplicacion(409, "ELABORACION_IDEMPOTENCIA_CONFLICTO", "La clave de idempotencia ya fue utilizada por otra solicitud.");
  }
}
export function Alimentacion_exigirPreviaVigente(BoolDisponible: boolean, StrActual: string, StrAceptada: string) {
  if (!BoolDisponible || StrActual !== StrAceptada) {
    throw new ErrorAplicacion(409, "ELABORACION_PREVIA_OBSOLETA", "Las cantidades, fuentes o costos cambiaron, o existen faltantes. Genere una nueva vista previa.");
  }
}
