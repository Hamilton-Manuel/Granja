import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity";
import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import { Configuracion_obtenerAlmacenamiento, Configuracion_obtenerEntorno } from "../config/configuracion-entorno.js";

const IntPlazoMs = 10_000;
const ObjOpcionesCliente = { retryOptions: { maxTries: 2, tryTimeoutInMs: 3_000, retryDelayInMs: 200, maxRetryDelayInMs: 500 } };

export function Almacenamiento_crearClienteContenedor(): ContainerClient {
  const ObjEntorno = Configuracion_obtenerAlmacenamiento();
  const ObjServicio = ObjEntorno.AZURE_STORAGE_CONNECTION_STRING
    ? BlobServiceClient.fromConnectionString(ObjEntorno.AZURE_STORAGE_CONNECTION_STRING, ObjOpcionesCliente)
    : new BlobServiceClient(
        ObjEntorno.AZURE_STORAGE_ACCOUNT_URL!,
        ObjEntorno.AZURE_STORAGE_MANAGED_IDENTITY_CLIENT_ID
          ? new ManagedIdentityCredential({ clientId: ObjEntorno.AZURE_STORAGE_MANAGED_IDENTITY_CLIENT_ID })
          : new DefaultAzureCredential(),
        ObjOpcionesCliente,
      );
  return ObjServicio.getContainerClient(ObjEntorno.AZURE_BLOB_CONTAINER_ANIMALES);
}

// Comparte verificaciones simultáneas; no memoriza fallos ni permisos viejos.
export function Almacenamiento_crearAcceso(
  Almacenamiento_crearCliente: () => ContainerClient,
  Almacenamiento_permitirCreacion: () => boolean,
) {
  let ObjVerificacion: Promise<ContainerClient> | undefined;
  return async function Almacenamiento_obtenerContenedor(): Promise<ContainerClient> {
    if (!ObjVerificacion) {
      ObjVerificacion = (async () => {
        const ObjCliente = Almacenamiento_crearCliente();
        const ObjOpciones = { abortSignal: AbortSignal.timeout(IntPlazoMs) };
        if (Almacenamiento_permitirCreacion()) await ObjCliente.createIfNotExists(ObjOpciones);
        // Un contenedor ausente es indisponibilidad, no una foto histórica ausente.
        const ObjPropiedades = await ObjCliente.getProperties(ObjOpciones).catch(() => {
          throw new Error("No fue posible verificar el contenedor privado.");
        });
        if (ObjPropiedades.blobPublicAccess !== undefined) throw new Error("El contenedor de fotografías permite acceso anónimo.");
        return ObjCliente;
      })();
    }
    const ObjActual = ObjVerificacion;
    try { return await ObjActual; }
    finally { if (ObjVerificacion === ObjActual) ObjVerificacion = undefined; }
  };
}

let Almacenamiento_obtenerContenedor = Almacenamiento_crearAcceso(
  Almacenamiento_crearClienteContenedor,
  () => Configuracion_obtenerEntorno().NODE_ENV !== "production",
);

export async function Almacenamiento_inicializar(): Promise<void> {
  await Almacenamiento_obtenerContenedor();
}

export async function Almacenamiento_subir(StrNombre: string, ObjContenido: Buffer): Promise<void> {
  const ObjCliente = await Almacenamiento_obtenerContenedor();
  await ObjCliente.getBlockBlobClient(StrNombre).uploadData(ObjContenido, {
    abortSignal: AbortSignal.timeout(IntPlazoMs),
    blobHTTPHeaders: { blobContentType: "image/webp" },
  });
}

export async function Almacenamiento_eliminar(StrNombre: string): Promise<void> {
  const ObjCliente = await Almacenamiento_obtenerContenedor();
  await ObjCliente.getBlockBlobClient(StrNombre).deleteIfExists({ abortSignal: AbortSignal.timeout(IntPlazoMs) });
}

export async function Almacenamiento_descargar(StrNombre: string) {
  const ObjCliente = await Almacenamiento_obtenerContenedor();
  return ObjCliente.getBlockBlobClient(StrNombre).download(0, undefined, { abortSignal: AbortSignal.timeout(IntPlazoMs) });
}

export function Almacenamiento_reiniciarParaPruebas(): void {
  Almacenamiento_obtenerContenedor = Almacenamiento_crearAcceso(Almacenamiento_crearClienteContenedor, () => Configuracion_obtenerEntorno().NODE_ENV !== "production");
}
