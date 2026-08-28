import { Prisma } from "../../../generated/prisma/client.js";
import { BaseDatos_obtenerCliente } from "../../database/prisma.js";

const Produccion_seleccionFotoPublica = {
  animalFotoId: true,
  animalId: true,
  nombreOriginal: true,
  mimeType: true,
  tamanoBytes: true,
  anchoPixeles: true,
  altoPixeles: true,
  esPrincipal: true,
  creadoPorUsuarioId: true,
  fechaCreacion: true,
} satisfies Prisma.ProduccionAnimalFotoSelect;

export const Produccion_existeAnimalFoto = (IntAnimalId: number) =>
  BaseDatos_obtenerCliente().produccionAnimal.findUnique({ where: { animalId: IntAnimalId }, select: { animalId: true } });

export const Produccion_obtenerFotoPrincipal = (IntAnimalId: number) =>
  BaseDatos_obtenerCliente().produccionAnimalFoto.findFirst({
    where: { animalId: IntAnimalId, esPrincipal: true },
    orderBy: { fechaCreacion: "desc" },
  });

export function Produccion_guardarFotoPrincipal(ObjDatos: {
  IntAnimalId: number;
  StrBlobNombre: string;
  StrNombreOriginal: string;
  IntTamanoBytes: number;
  IntAncho: number;
  IntAlto: number;
  IntUsuarioId: number;
  StrIp: string | undefined;
}) {
  return BaseDatos_obtenerCliente().$transaction(async (ObjTx) => {
    await ObjTx.produccionAnimal.findUniqueOrThrow({ where: { animalId: ObjDatos.IntAnimalId }, select: { animalId: true } });
    await ObjTx.produccionAnimalFoto.updateMany({
      where: { animalId: ObjDatos.IntAnimalId, esPrincipal: true },
      data: { esPrincipal: false },
    });
    const ObjFoto = await ObjTx.produccionAnimalFoto.create({
      data: {
        animalId: ObjDatos.IntAnimalId,
        blobNombre: ObjDatos.StrBlobNombre,
        nombreOriginal: ObjDatos.StrNombreOriginal,
        mimeType: "image/webp",
        tamanoBytes: ObjDatos.IntTamanoBytes,
        anchoPixeles: ObjDatos.IntAncho,
        altoPixeles: ObjDatos.IntAlto,
        esPrincipal: true,
        creadoPorUsuarioId: ObjDatos.IntUsuarioId,
      },
      select: Produccion_seleccionFotoPublica,
    });
    await ObjTx.usuarioBitacora.create({
      data: {
        usuarioId: ObjDatos.IntUsuarioId,
        modulo: "PRODUCCION",
        accion: "PRODUCCION_FOTO_ANIMAL_ACTUALIZADA",
        descripcion: `Fotografia principal actualizada para animal ${ObjDatos.IntAnimalId}.`,
        resultado: "EXITOSO",
        direccionIp: ObjDatos.StrIp ?? null,
      },
    });
    return ObjFoto;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
