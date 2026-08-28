import path from "node:path";
import sharp from "sharp";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";

export const PRODUCCION_FOTO_MAX_BYTES = 5 * 1024 * 1024;
const PRODUCCION_FOTO_MAX_PIXELES = 40_000_000;

export interface ProduccionFotoProcesada {
  ObjContenido: Buffer;
  StrNombreOriginal: string;
  IntAncho: number;
  IntAlto: number;
}

export function Produccion_limpiarNombreFoto(StrNombre: string): string {
  const StrBase = path.basename(StrNombre.replaceAll("\\", "/"));
  const StrLimpio = StrBase.replace(/[\u0000-\u001f\u007f/\\]/g, "").trim();
  return (StrLimpio || "foto").slice(0, 255);
}

export async function Produccion_procesarFoto(ObjArchivo: Express.Multer.File): Promise<ProduccionFotoProcesada> {
  try {
    const ObjImagen = sharp(ObjArchivo.buffer, { limitInputPixels: PRODUCCION_FOTO_MAX_PIXELES, animated: true });
    const ObjMetadatos = await ObjImagen.metadata();
    if (!ObjMetadatos.format || !["jpeg", "png", "webp"].includes(ObjMetadatos.format)) {
      throw new Error("FORMATO_NO_PERMITIDO");
    }
    if ((ObjMetadatos.pages ?? 1) !== 1) {
      throw new Error("ANIMACION_NO_PERMITIDA");
    }
    const { data: ObjContenido, info: ObjInfo } = await sharp(ObjArchivo.buffer, { limitInputPixels: PRODUCCION_FOTO_MAX_PIXELES })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    if (ObjContenido.length > PRODUCCION_FOTO_MAX_BYTES) {
      throw new Error("SALIDA_DEMASIADO_GRANDE");
    }
    return { ObjContenido, StrNombreOriginal: Produccion_limpiarNombreFoto(ObjArchivo.originalname), IntAncho: ObjInfo.width, IntAlto: ObjInfo.height };
  } catch (ObjError) {
    if (ObjError instanceof ErrorAplicacion) throw ObjError;
    throw new ErrorAplicacion(400, "FOTO_INVALIDA", "La fotografia debe ser JPEG, PNG o WebP estatico valido y no superar los limites permitidos.");
  }
}
