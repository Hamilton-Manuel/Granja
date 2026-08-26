import assert from "node:assert/strict";
import test from "node:test";
import { BaseDatos_desconectar, BaseDatos_obtenerCliente } from "../../database/prisma.js";
import { Fecha_formatearInstanteGuatemala } from "../../datetime/fecha.js";
import * as Produccion from "../produccion/produccion.service.js";
import * as Ventas from "./ventas.service.js";

const BoolIntegracion = process.env.VENTAS_INTEGRACION === "1";

test("Ventas integra animales exactos, multillote, recibos concurrentes y reversión", { skip: !BoolIntegracion }, async () => {
  const ObjPrisma = BaseDatos_obtenerCliente();
  const ObjUsuario = await ObjPrisma.usuarioCuenta.findFirstOrThrow({ orderBy: { usuarioId: "asc" } });
  const ObjTipoCliente = await ObjPrisma.clienteTipo.findFirstOrThrow({ where: { activo: true } });
  const ObjCliente = await ObjPrisma.clienteRegistro.create({ data: { tipoClienteId: ObjTipoCliente.tipoClienteId, nombreCompleto: "Cliente temporal Ventas", nit: "CF" } });
  const ObjClienteInactivo = await ObjPrisma.clienteRegistro.create({ data: { tipoClienteId: ObjTipoCliente.tipoClienteId, nombreCompleto: "Cliente temporal inactivo", activo: false } });
  const ObjTipoA = await Produccion.Produccion_crearTipo({ nombre: "Tipo temporal venta A", IntUsuarioId: ObjUsuario.usuarioId });
  const ObjTipoB = await Produccion.Produccion_crearTipo({ nombre: "Tipo temporal venta B", IntUsuarioId: ObjUsuario.usuarioId });
  const ObjLoteA = await Produccion.Produccion_crearLote({ tipoAnimalId: ObjTipoA.tipoAnimalId, codigo: "VTA-A", nombre: "Lote venta A", IntUsuarioId: ObjUsuario.usuarioId });
  const ObjLoteB = await Produccion.Produccion_crearLote({ tipoAnimalId: ObjTipoB.tipoAnimalId, codigo: "VTA-B", nombre: "Lote venta B", IntUsuarioId: ObjUsuario.usuarioId });
  const ObjLoteC = await Produccion.Produccion_crearLote({ tipoAnimalId: ObjTipoA.tipoAnimalId, codigo: "VTA-C", nombre: "Lote venta C", IntUsuarioId: ObjUsuario.usuarioId });
  const ObjIngresoA = await Produccion.Produccion_registrarInicial({ loteDestinoId: ObjLoteA.loteProduccionId, animales: ["001", "002", "003", "004", "005"].map(StrCodigo => ({ identificacion: `VTA-A-${StrCodigo}`, tipoAnimalId: ObjTipoA.tipoAnimalId, sexo: "HEMBRA" as const })), IntUsuarioId: ObjUsuario.usuarioId });
  const ObjIngresoB = await Produccion.Produccion_registrarInicial({ loteDestinoId: ObjLoteB.loteProduccionId, animales: ["001", "002"].map(StrCodigo => ({ identificacion: `VTA-B-${StrCodigo}`, tipoAnimalId: ObjTipoB.tipoAnimalId, sexo: "MACHO" as const })), IntUsuarioId: ObjUsuario.usuarioId });
  const ObjIngresoC = await Produccion.Produccion_registrarInicial({ loteDestinoId: ObjLoteC.loteProduccionId, animales: [{ identificacion: "VTA-C-001", tipoAnimalId: ObjTipoA.tipoAnimalId, sexo: "MACHO" }], IntUsuarioId: ObjUsuario.usuarioId });
  const Ventas_fechaActual = () => Fecha_formatearInstanteGuatemala(new Date());

  const ObjVenta = await Ventas.Ventas_registrar({ clienteId: ObjCliente.clienteId, fechaVenta: Ventas_fechaActual(), formaPago: "TRANSFERENCIA", animales: [
    { animalId: ObjIngresoA.animales[0]!.animalId, precioVenta: "1000.10" },
    { animalId: ObjIngresoA.animales[1]!.animalId, precioVenta: "2000.20" },
    { animalId: ObjIngresoB.animales[0]!.animalId, precioVenta: "3000.30" },
  ], IntUsuarioId: ObjUsuario.usuarioId });
  assert.equal(ObjVenta.detalles.length, 2);
  assert.equal(ObjVenta.detalles.flatMap(ObjDetalle => ObjDetalle.animales).length, 3);
  assert.equal(ObjVenta.total.toFixed(2), "6000.60");
  assert.deepEqual({ serie: ObjVenta.recibo?.serie, estado: ObjVenta.recibo?.estado }, { serie: "A", estado: "EMITIDO" });
  assert.equal(await ObjPrisma.produccionAnimal.count({ where: { animalId: { in: ObjIngresoA.animales.slice(0, 2).map(ObjAnimal => ObjAnimal.animalId).concat(ObjIngresoB.animales[0]!.animalId) }, estadoActual: "VENDIDO" } }), 3);
  assert.equal(await ObjPrisma.produccionAsignacionLote.count({ where: { animalId: ObjIngresoB.animales[0]!.animalId, estado: "VIGENTE" } }), 0);
  assert.equal((await ObjPrisma.produccionLote.findUniqueOrThrow({ where: { loteProduccionId: ObjLoteB.loteProduccionId } })).estado, "ACTIVO");

  const ArrRecibosConcurrentes = await Promise.all([
    Ventas.Ventas_registrar({ clienteId: ObjCliente.clienteId, fechaVenta: Ventas_fechaActual(), formaPago: "EFECTIVO", animales: [{ animalId: ObjIngresoA.animales[2]!.animalId, precioVenta: "800.01" }], IntUsuarioId: ObjUsuario.usuarioId }),
    Ventas.Ventas_registrar({ clienteId: ObjCliente.clienteId, fechaVenta: Ventas_fechaActual(), formaPago: "DEPOSITO", animales: [{ animalId: ObjIngresoB.animales[1]!.animalId, precioVenta: "900.02" }], IntUsuarioId: ObjUsuario.usuarioId }),
  ]);
  const ArrNumeros = ArrRecibosConcurrentes.map(ObjItem => ObjItem.recibo!.numero);
  assert.equal(new Set(ArrNumeros).size, 2);
  assert.equal(ArrRecibosConcurrentes.every(ObjItem => ObjItem.recibo!.serie === "A"), true);

  const IntAnimalConcurrente = ObjIngresoA.animales[3]!.animalId;
  const ArrMismoAnimal = await Promise.allSettled([
    Ventas.Ventas_registrar({ clienteId: ObjCliente.clienteId, fechaVenta: Ventas_fechaActual(), formaPago: "EFECTIVO", animales: [{ animalId: IntAnimalConcurrente, precioVenta: "700.00" }], IntUsuarioId: ObjUsuario.usuarioId }),
    Ventas.Ventas_registrar({ clienteId: ObjCliente.clienteId, fechaVenta: Ventas_fechaActual(), formaPago: "EFECTIVO", animales: [{ animalId: IntAnimalConcurrente, precioVenta: "701.00" }], IntUsuarioId: ObjUsuario.usuarioId }),
  ]);
  assert.equal(ArrMismoAnimal.filter(ObjResultado => ObjResultado.status === "fulfilled").length, 1);
  assert.equal(await ObjPrisma.ventaDetalleAnimal.count({ where: { animalId: IntAnimalConcurrente } }), 1);

  const ObjAnulada = await Ventas.Ventas_revertir(ObjVenta.ventaId, "Corrección integral", ObjUsuario.usuarioId);
  assert.equal(ObjAnulada.estado, "ANULADA");
  assert.equal(ObjAnulada.recibo?.estado, "ANULADO");
  assert.equal(ObjAnulada.recibo?.numero, ObjVenta.recibo?.numero);
  assert.equal(await ObjPrisma.produccionAnimal.count({ where: { animalId: { in: ObjVenta.detalles.flatMap(ObjDetalle => ObjDetalle.animales.map(ObjAnimal => ObjAnimal.animalId)) }, estadoActual: "ACTIVO" } }), 3);
  await assert.rejects(() => Ventas.Ventas_revertir(ObjVenta.ventaId, "Segunda reversión", ObjUsuario.usuarioId), (ObjError: unknown) => (ObjError as { StrCodigo?: string }).StrCodigo === "VENTA_YA_ANULADA");

  const ObjVentaLoteC = await Ventas.Ventas_registrar({ clienteId: ObjCliente.clienteId, fechaVenta: Ventas_fechaActual(), formaPago: "CREDITO", animales: [{ animalId: ObjIngresoC.animales[0]!.animalId, precioVenta: "1200.00" }], IntUsuarioId: ObjUsuario.usuarioId });
  await Produccion.Produccion_cambiarEstadoLote(ObjLoteC.loteProduccionId, "CERRADO", ObjUsuario.usuarioId);
  await assert.rejects(() => Ventas.Ventas_revertir(ObjVentaLoteC.ventaId, "No debe reabrir lote", ObjUsuario.usuarioId), (ObjError: unknown) => (ObjError as { StrCodigo?: string }).StrCodigo === "LOTE_ORIGEN_INACTIVO");
  await Produccion.Produccion_cambiarEstadoLote(ObjLoteC.loteProduccionId, "ACTIVO", ObjUsuario.usuarioId);

  await assert.rejects(() => Ventas.Ventas_registrar({ clienteId: ObjClienteInactivo.clienteId, fechaVenta: Ventas_fechaActual(), formaPago: "EFECTIVO", animales: [{ animalId: ObjIngresoA.animales[4]!.animalId, precioVenta: "500.00" }], IntUsuarioId: ObjUsuario.usuarioId }), (ObjError: unknown) => (ObjError as { StrCodigo?: string }).StrCodigo === "CLIENTE_INACTIVO");
  await assert.rejects(() => Ventas.Ventas_registrar({ clienteId: ObjCliente.clienteId, fechaVenta: Fecha_formatearInstanteGuatemala(new Date(Date.now() + 60_000)), formaPago: "EFECTIVO", animales: [{ animalId: ObjIngresoA.animales[4]!.animalId, precioVenta: "500.00" }], IntUsuarioId: ObjUsuario.usuarioId }), (ObjError: unknown) => (ObjError as { StrCodigo?: string }).StrCodigo === "FECHA_VENTA_FUTURA");

  const ObjDiagnostico = await Ventas.Ventas_diagnosticar(ObjUsuario.usuarioId);
  assert.equal(ObjDiagnostico.consistente, true);
  await BaseDatos_desconectar();
});
