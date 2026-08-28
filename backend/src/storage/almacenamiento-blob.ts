import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity";
import { BlobServiceClient, type BlockBlobClient, type ContainerClient } from "@azure/storage-blob";
import { Configuracion_obtenerAlmacenamiento } from "../config/configuracion-entorno.js";

let ObjContenedor: ContainerClient | undefined;

export function Almacenamiento_crearClienteContenedor(): ContainerClient {
  const ObjEntorno = Configuracion_obtenerAlmacenamiento();
  const ObjServicio = ObjEntorno.AZURE_STORAGE_CONNECTION_STRING
    ? BlobServiceClient.fromConnectionString(ObjEntorno.AZURE_STORAGE_CONNECTION_STRING)
    : new BlobServiceClient(
        ObjEntorno.AZURE_STORAGE_ACCOUNT_URL!,
        ObjEntorno.AZURE_STORAGE_MANAGED_IDENTITY_CLIENT_ID
          ? new ManagedIdentityCredential({ clientId: ObjEntorno.AZURE_STORAGE_MANAGED_IDENTITY_CLIENT_ID })
          : new DefaultAzureCredential(),
      );
  return ObjServicio.getContainerClient(ObjEntorno.AZURE_BLOB_CONTAINER_ANIMALES);
}

export async function Almacenamiento_inicializar(): Promise<void> {
  const ObjCliente = Almacenamiento_crearClienteContenedor();
  await ObjCliente.createIfNotExists();
  const ObjPropiedades = await ObjCliente.getProperties();
  if (ObjPropiedades.blobPublicAccess !== undefined) {
    throw new Error("El contenedor de fotografias permite acceso anonimo.");
  }
  ObjContenedor = ObjCliente;
}

function Almacenamiento_obtenerContenedor(): ContainerClient {
  ObjContenedor ??= Almacenamiento_crearClienteContenedor();
  return ObjContenedor;
}

function Almacenamiento_blob(StrNombre: string): BlockBlobClient {
  return Almacenamiento_obtenerContenedor().getBlockBlobClient(StrNombre);
}

export async function Almacenamiento_subir(StrNombre: string, ObjContenido: Buffer): Promise<void> {
  await Almacenamiento_blob(StrNombre).uploadData(ObjContenido, {
    blobHTTPHeaders: { blobContentType: "image/webp" },
  });
}

export async function Almacenamiento_eliminar(StrNombre: string): Promise<void> {
  await Almacenamiento_blob(StrNombre).deleteIfExists();
}

export async function Almacenamiento_descargar(StrNombre: string) {
  return Almacenamiento_blob(StrNombre).download();
}

export function Almacenamiento_reiniciarParaPruebas(): void {
  ObjContenedor = undefined;
}
