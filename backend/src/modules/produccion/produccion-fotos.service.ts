import { randomUUID } from "node:crypto";
import { RestError } from "@azure/storage-blob";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import { Almacenamiento_descargar, Almacenamiento_eliminar, Almacenamiento_subir } from "../../storage/almacenamiento-blob.js";
import { Produccion_procesarFoto } from "./produccion-fotos.js";
import * as R from "./produccion-fotos.repository.js";

function Produccion_errorAlmacenamiento(ObjError: unknown): ErrorAplicacion {
  if (ObjError instanceof RestError && ObjError.statusCode === 404) {
    return new ErrorAplicacion(500, "FOTO_INCONSISTENTE", "La fotografia registrada no esta disponible.");
  }
  return new ErrorAplicacion(503, "ALMACENAMIENTO_NO_DISPONIBLE", "El almacenamiento de fotografias no esta disponible.");
}

export async function Produccion_reemplazarFoto(IntAnimalId: number, ObjArchivo: Express.Multer.File | undefined, IntUsuarioId: number, StrIp?: string) {
  if (!await R.Produccion_existeAnimalFoto(IntAnimalId)) {
    throw new ErrorAplicacion(404, "ANIMAL_NO_ENCONTRADO", "El animal no existe.");
  }
  if (!ObjArchivo) {
    throw new ErrorAplicacion(400, "FOTO_REQUERIDA", "Debe enviar una fotografia en el campo foto.");
  }
  const ObjFoto = await Produccion_procesarFoto(ObjArchivo);
  const StrBlobNombre = `produccion/animales/${IntAnimalId}/perfil/${randomUUID()}.webp`;
  try {
    await Almacenamiento_subir(StrBlobNombre, ObjFoto.ObjContenido);
  } catch (ObjError) {
    throw Produccion_errorAlmacenamiento(ObjError);
  }
  try {
    return await R.Produccion_guardarFotoPrincipal({
      IntAnimalId,
      StrBlobNombre,
      StrNombreOriginal: ObjFoto.StrNombreOriginal,
      IntTamanoBytes: ObjFoto.ObjContenido.length,
      IntAncho: ObjFoto.IntAncho,
      IntAlto: ObjFoto.IntAlto,
      IntUsuarioId,
      StrIp,
    });
  } catch (ObjErrorOriginal) {
    try {
      await Almacenamiento_eliminar(StrBlobNombre);
    } catch {
      console.error("No fue posible eliminar un blob huerfano despues de un fallo de persistencia.");
    }
    throw ObjErrorOriginal;
  }
}

export async function Produccion_descargarFotoPrincipal(IntAnimalId: number) {
  const ObjFoto = await R.Produccion_obtenerFotoPrincipal(IntAnimalId);
  if (!ObjFoto) {
    throw new ErrorAplicacion(404, "FOTO_NO_ENCONTRADA", "El animal no tiene una fotografia principal.");
  }
  try {
    const ObjDescarga = await Almacenamiento_descargar(ObjFoto.blobNombre);
    if (!ObjDescarga.readableStreamBody) throw new Error("RESPUESTA_SIN_CONTENIDO");
    return {
      ObjFlujo: ObjDescarga.readableStreamBody,
      IntLongitud: ObjDescarga.contentLength ?? ObjFoto.tamanoBytes,
      StrEtag: ObjDescarga.etag,
    };
  } catch (ObjError) {
    throw Produccion_errorAlmacenamiento(ObjError);
  }
}
