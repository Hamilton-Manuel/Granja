import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "../../../generated/prisma/client.js";
import { Inventario_registrarEntradaConLoteConTx, type InventarioDatosEntradaConLote } from "./inventario.repository.js";

function Inventario_crearTxPrueba(BoolFallarMovimiento = false) {
  const ArrEventos: string[] = [];
  let ObjDatosMovimiento: Record<string, unknown> | undefined;
  let ObjVinculo: unknown;
  const ObjTx = {
    alimentacionConcentrado: { findUnique: async () => null },
    inventarioExistencia: {
      upsert: async () => { ArrEventos.push("existencia"); return { inventarioProductoId: 10, activo: true }; },
      update: async () => { ArrEventos.push("saldo"); return {}; },
    },
    inventarioLote: {
      create: async () => { ArrEventos.push("lote"); return { loteInventarioId: 20, codigoLote: "L-20" }; },
      update: async (ObjEntrada: unknown) => { ObjVinculo = ObjEntrada; return {}; },
      findUniqueOrThrow: async () => ({ loteInventarioId: 20, costoUnitario: new Prisma.Decimal("0.123456789123456789") }),
    },
    inventarioExistenciaLote: { create: async () => { ArrEventos.push("saldo-lote"); return { existenciaLoteId: 30 }; } },
    inventarioTransaccion: {
      create: async (ObjEntrada: { data: Record<string, unknown> }) => {
        ArrEventos.push("movimiento");
        if (BoolFallarMovimiento) throw new Error("FALLO_MOVIMIENTO_PRUEBA");
        ObjDatosMovimiento = ObjEntrada.data;
        return { transaccionInventarioId: 40 };
      },
      findUniqueOrThrow: async () => ({ transaccionInventarioId: 40, costoUnitario: new Prisma.Decimal("0.123456789123456789") }),
    },
    $executeRawUnsafe: async () => { ArrEventos.push("precision"); return 1; },
    $executeRaw: async () => { ArrEventos.push("precision"); return 1; },
    usuarioBitacora: { create: async () => { ArrEventos.push("bitacora"); return {}; } },
    $transaction: () => { throw new Error("TRANSACCION_ANIDADA_PROHIBIDA"); },
  };
  return { ObjTx: ObjTx as unknown as Prisma.TransactionClient, ArrEventos,
    Inventario_datos: () => ObjDatosMovimiento, Inventario_vinculo: () => ObjVinculo };
}

const ObjEntrada: InventarioDatosEntradaConLote = {
  subtipo: "ELABORACION_INGRESO", productoId: 1, inventarioId: 2, IntUsuarioId: 3,
  cantidadComercial: new Prisma.Decimal("1"), unidadComercial: "lb", factorConversion: new Prisma.Decimal("1"),
  cantidadBase: new Prisma.Decimal("1"), unidadBase: "lb", precioTotalIngreso: null,
  costoUnitario: new Prisma.Decimal("0.123456789123456789"),
};

test("entrada ConTx vincula lote y movimiento usando exclusivamente la transacción recibida", async () => {
  const ObjPrueba = Inventario_crearTxPrueba();
  const ObjResultado = await Inventario_registrarEntradaConLoteConTx(ObjPrueba.ObjTx, ObjEntrada);
  assert.equal(ObjResultado.costoUnitario?.toString(), "0.123456789123456789");
  assert.equal(ObjPrueba.Inventario_datos()?.subtipoTransaccion, "ELABORACION_INGRESO");
  assert.equal(ObjPrueba.Inventario_datos()?.precioTotalIngreso, null);
  assert.equal(ObjPrueba.Inventario_datos()?.existenciaLoteId, 30);
  assert.deepEqual(ObjPrueba.Inventario_vinculo(), { where: { loteInventarioId: 20 }, data: { transaccionOrigenId: 40 } });
  assert.equal(ObjPrueba.ArrEventos.filter(StrEvento => StrEvento === "movimiento").length, 1);
});

test("entrada ConTx conserva metadatos de compra e inventario inicial", async () => {
  for (const StrSubtipo of ["COMPRA", "INVENTARIO_INICIAL"] as const) {
    const ObjPrueba = Inventario_crearTxPrueba();
    await Inventario_registrarEntradaConLoteConTx(ObjPrueba.ObjTx, { ...ObjEntrada, subtipo: StrSubtipo, proveedorId: 9, precioTotalIngreso: new Prisma.Decimal("10") });
    assert.equal(ObjPrueba.Inventario_datos()?.subtipoTransaccion, StrSubtipo);
    assert.equal(ObjPrueba.Inventario_datos()?.proveedorId, 9);
    assert.equal(String(ObjPrueba.Inventario_datos()?.precioTotalIngreso), "10");
  }
});

test("entrada ConTx propaga el fallo para que el llamador revierta toda su transacción", async () => {
  const ObjPrueba = Inventario_crearTxPrueba(true);
  await assert.rejects(Inventario_registrarEntradaConLoteConTx(ObjPrueba.ObjTx, ObjEntrada), /FALLO_MOVIMIENTO_PRUEBA/);
  assert.equal(ObjPrueba.Inventario_vinculo(), undefined);
  assert.equal(ObjPrueba.ArrEventos.includes("bitacora"), false);
});
test("clasificación bloquea compras e iniciales antes de modificar saldos", async () => {
  const ObjTx = { alimentacionConcentrado: { findUnique: async () => ({ concentradoId: 1 }) } } as unknown as Prisma.TransactionClient;
  for (const StrSubtipo of ["COMPRA", "INVENTARIO_INICIAL"] as const) {
    await assert.rejects(Inventario_registrarEntradaConLoteConTx(ObjTx, { ...ObjEntrada, subtipo: StrSubtipo }), /solo admite/);
  }
});
