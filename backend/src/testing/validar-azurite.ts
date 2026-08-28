import { randomUUID } from "node:crypto";
import { BlobServiceClient } from "@azure/storage-blob";

const ObjServicio = BlobServiceClient.fromConnectionString("UseDevelopmentStorage=true");
const StrContenedor = `prueba-fotos-${randomUUID().replaceAll("-", "")}`;
const ObjContenedor = ObjServicio.getContainerClient(StrContenedor);
try {
  await ObjContenedor.create();
  const ObjPropiedades = await ObjContenedor.getProperties();
  if (ObjPropiedades.blobPublicAccess !== undefined) throw new Error("CONTENEDOR_NO_PRIVADO");
  const ObjBlob = ObjContenedor.getBlockBlobClient("produccion/animales/1/perfil/prueba.webp");
  const ObjContenido = Buffer.from("contenido-prueba");
  await ObjBlob.uploadData(ObjContenido, { blobHTTPHeaders: { blobContentType: "image/webp" } });
  const ObjDescarga = await ObjBlob.downloadToBuffer();
  if (!ObjDescarga.equals(ObjContenido)) throw new Error("DESCARGA_NO_COINCIDE");
  console.info("AZURITE_FOTOS_OK");
} finally {
  await ObjContenedor.deleteIfExists();
  console.info("CLEANUP_AZURITE_OK");
}
