import assert from "node:assert/strict";
import test from "node:test";
import { BlobServiceClient } from "@azure/storage-blob";
import { Almacenamiento_crearAcceso } from "./almacenamiento-blob.js";

test("Blob comparte intentos concurrentes y se recupera tras fallar sin reinicio", async (ObjContexto) => {
  const ObjCliente = BlobServiceClient.fromConnectionString("UseDevelopmentStorage=true").getContainerClient("prueba");
  let BoolDisponible = false;
  let IntConsultas = 0;
  ObjContexto.mock.method(ObjCliente, "getProperties", async () => {
    IntConsultas++;
    if (!BoolDisponible) throw new Error("indisponible");
    return {};
  });
  const ObjCreacion = ObjContexto.mock.method(ObjCliente, "createIfNotExists", async () => { throw new Error("No crear en producción"); });
  const Almacenamiento_acceder = Almacenamiento_crearAcceso(() => ObjCliente, () => false);
  const ArrResultados = await Promise.allSettled([Almacenamiento_acceder(), Almacenamiento_acceder()]);
  assert.equal(ArrResultados.every((ObjResultado) => ObjResultado.status === "rejected"), true);
  assert.equal(IntConsultas, 1);
  BoolDisponible = true;
  assert.equal(await Almacenamiento_acceder(), ObjCliente);
  assert.equal(ObjCreacion.mock.callCount(), 0);
});

test("Blob vuelve a verificar privacidad y rechaza un contenedor que se hizo público", async (ObjContexto) => {
  const ObjCliente = BlobServiceClient.fromConnectionString("UseDevelopmentStorage=true").getContainerClient("prueba");
  let BoolPublico = false;
  ObjContexto.mock.method(ObjCliente, "getProperties", async () => BoolPublico ? { blobPublicAccess: "blob" } : {});
  const Almacenamiento_acceder = Almacenamiento_crearAcceso(() => ObjCliente, () => false);
  await Almacenamiento_acceder();
  BoolPublico = true;
  await assert.rejects(Almacenamiento_acceder(), /anónimo/);
});
