import assert from "node:assert/strict";
import test from "node:test";
import { BaseDatos_desconectar, BaseDatos_obtenerCliente } from "../../database/prisma.js";
import * as Produccion from "./produccion.service.js";

const BoolIntegracion = process.env.PRODUCCION_INTEGRACION === "1";

test("Produccion integra ingresos, costos, traslado, medicion, reversion y reconciliacion", { skip: !BoolIntegracion }, async () => {
  const ObjPrisma = BaseDatos_obtenerCliente();
  await ObjPrisma.produccionEvento.deleteMany();
  await ObjPrisma.produccionTransaccion.deleteMany();
  await ObjPrisma.produccionOperacionAnimal.deleteMany();
  await ObjPrisma.produccionOperacion.deleteMany();
  await ObjPrisma.produccionMedicion.deleteMany();
  await ObjPrisma.produccionHistorialEstado.deleteMany();
  await ObjPrisma.produccionAsignacionLote.deleteMany();
  await ObjPrisma.produccionAnimal.deleteMany();
  await ObjPrisma.produccionLote.deleteMany();
  await ObjPrisma.produccionRaza.deleteMany();
  await ObjPrisma.produccionTipoAnimal.deleteMany();
  await ObjPrisma.proveedorRegistro.deleteMany({ where: { nombre: "Proveedor temporal de integracion" } });
  const ObjUsuario = await ObjPrisma.usuarioCuenta.findUniqueOrThrow({ where: { nombreUsuario: "webmaster_prod_temp" } });
  const ObjTipoProveedor = await ObjPrisma.proveedorTipo.findFirstOrThrow({ where: { codigo: "PERSONA_INDIVIDUAL" } });
  const ObjProveedor = await ObjPrisma.proveedorRegistro.create({ data: { tipoProveedorId: ObjTipoProveedor.tipoProveedorId, nombre: "Proveedor temporal de integracion" } });

  const ObjTipo = await Produccion.Produccion_crearTipo({ nombre: "Bovino temporal", IntUsuarioId: ObjUsuario.usuarioId });
  const ObjLoteA = await Produccion.Produccion_crearLote({ tipoAnimalId: ObjTipo.tipoAnimalId, codigo: "LOTE-A", nombre: "Lote temporal A", IntUsuarioId: ObjUsuario.usuarioId });
  const ObjLoteB = await Produccion.Produccion_crearLote({ tipoAnimalId: ObjTipo.tipoAnimalId, codigo: "LOTE-B", nombre: "Lote temporal B", IntUsuarioId: ObjUsuario.usuarioId });

  const ObjInicial = await Produccion.Produccion_registrarInicial({ loteDestinoId: ObjLoteA.loteProduccionId, animales: [{ identificacion: "ANIMAL-001", tipoAnimalId: ObjTipo.tipoAnimalId, sexo: "HEMBRA" }], IntUsuarioId: ObjUsuario.usuarioId });
  const ObjCompra = await Produccion.Produccion_registrarCompra({ proveedorId: ObjProveedor.proveedorId, loteDestinoId: ObjLoteA.loteProduccionId, animales: [
    { identificacion: "ANIMAL-002", tipoAnimalId: ObjTipo.tipoAnimalId, sexo: "MACHO", costoAdquisicion: "4500.00" },
    { identificacion: "ANIMAL-003", tipoAnimalId: ObjTipo.tipoAnimalId, sexo: "HEMBRA", costoAdquisicion: "4750.25" },
  ], IntUsuarioId: ObjUsuario.usuarioId });
  const ArrCostos = await ObjPrisma.produccionOperacionAnimal.findMany({ where: { operacionProduccionId: ObjCompra.operacionProduccionId }, orderBy: { animalId: "asc" } });
  assert.deepEqual(ArrCostos.map(ObjCosto => ObjCosto.costoAdquisicion?.toFixed(2)), ["4500.00", "4750.25"]);

  const IntAnimalId = ObjInicial.animales[0]!.animalId;
  await Produccion.Produccion_registrarMedicion({animalId:IntAnimalId,metodoObtencion:"BASCULA",pesoKg:"125.5000",observaciones:null,IntUsuarioId:ObjUsuario.usuarioId});
  const ObjTraslado = await Produccion.Produccion_registrarTraslado({ loteOrigenId: ObjLoteA.loteProduccionId, loteDestinoId: ObjLoteB.loteProduccionId, animalIds: [IntAnimalId], motivo: "Prueba de traslado", IntUsuarioId: ObjUsuario.usuarioId });
  assert.equal(ObjTraslado.cantidad, 1);
  await Produccion.Produccion_revertirOperacion(ObjTraslado.operacionProduccionId, ObjUsuario.usuarioId);
  await assert.rejects(() => Produccion.Produccion_revertirOperacion(ObjTraslado.operacionProduccionId, ObjUsuario.usuarioId), (ObjError: unknown) => (ObjError as { StrCodigo?: string }).StrCodigo === "OPERACION_YA_REVERTIDA");

  const ObjDiagnostico = await Produccion.Produccion_diagnosticar(ObjUsuario.usuarioId);
  assert.equal(ObjDiagnostico.consistente, true);
  assert.equal(ObjDiagnostico.totalDiferencias, 0);

  const ArrAsignaciones = await ObjPrisma.produccionAsignacionLote.findMany({ where: { animalId: IntAnimalId, estado: "VIGENTE" } });
  assert.equal(ArrAsignaciones.length, 1);
  assert.equal(ArrAsignaciones[0]!.loteProduccionId, ObjLoteA.loteProduccionId);

  const ObjNacimiento = await Produccion.Produccion_registrarNacimiento({ loteDestinoId: ObjLoteA.loteProduccionId, animales: [{ identificacion: "ANIMAL-004", tipoAnimalId: ObjTipo.tipoAnimalId, sexo: "HEMBRA", madreAnimalId: IntAnimalId, fechaNacimiento: "2026-08-21" }], IntUsuarioId: ObjUsuario.usuarioId });
  assert.equal(ObjNacimiento.animales.length, 1);

  const IntAnimalTerminal = ObjCompra.animales[0]!.animalId;
  const ObjTerminal = await Produccion.Produccion_registrarEstadoTerminal(IntAnimalTerminal, "RETIRADO", "Prueba administrativa", null, ObjUsuario.usuarioId);
  await Produccion.Produccion_revertirOperacion(ObjTerminal.operacionProduccionId, ObjUsuario.usuarioId);
  assert.equal((await ObjPrisma.produccionAnimal.findUniqueOrThrow({ where: { animalId: IntAnimalTerminal } })).estadoActual, "ACTIVO");

  const IntOperacionesAntes = await ObjPrisma.produccionOperacion.count();
  await assert.rejects(() => Produccion.Produccion_registrarInicial({ loteDestinoId: ObjLoteA.loteProduccionId, animales: [
    { identificacion: "ANIMAL-ROLLBACK", tipoAnimalId: ObjTipo.tipoAnimalId, sexo: "MACHO" },
    { identificacion: "ANIMAL-001", tipoAnimalId: ObjTipo.tipoAnimalId, sexo: "MACHO" },
  ], IntUsuarioId: ObjUsuario.usuarioId }));
  assert.equal(await ObjPrisma.produccionAnimal.count({ where: { identificacion: "ANIMAL-ROLLBACK" } }), 0);
  assert.equal(await ObjPrisma.produccionOperacion.count(), IntOperacionesAntes);

  const IntAnimalConcurrente = ObjNacimiento.animales[0]!.animalId;
  const ArrConcurrentes = await Promise.allSettled([
    Produccion.Produccion_registrarTraslado({ loteOrigenId: ObjLoteA.loteProduccionId, loteDestinoId: ObjLoteB.loteProduccionId, animalIds: [IntAnimalConcurrente], motivo: "Concurrencia A", IntUsuarioId: ObjUsuario.usuarioId }),
    Produccion.Produccion_registrarTraslado({ loteOrigenId: ObjLoteA.loteProduccionId, loteDestinoId: ObjLoteB.loteProduccionId, animalIds: [IntAnimalConcurrente], motivo: "Concurrencia B", IntUsuarioId: ObjUsuario.usuarioId }),
  ]);
  assert.equal(ArrConcurrentes.filter(ObjResultado => ObjResultado.status === "fulfilled").length, 1);
  assert.equal(await ObjPrisma.produccionAsignacionLote.count({ where: { animalId: IntAnimalConcurrente, estado: "VIGENTE" } }), 1);
  await BaseDatos_desconectar();
});
