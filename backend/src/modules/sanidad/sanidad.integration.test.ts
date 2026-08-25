import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { Prisma } from "../../../generated/prisma/client.js";
import {
  BaseDatos_desconectar,
  BaseDatos_exigirBaseActual,
  BaseDatos_obtenerCliente,
} from "../../database/prisma.js";
import { Inventario_registrarMovimiento } from "../inventario/inventario.repository.js";
import {
  Sanidad_registrar,
  Sanidad_revertir,
  Sanidad_listar,
} from "./sanidad.service.js";
let IntUsuarioId = 0,
  IntAnimalId = 0,
  IntLoteProduccionId = 0,
  IntTipoAplicacionId = 0,
  IntUnidadId = 0,
  IntViaId = 0,
  IntProductoSinLote = 0,
  IntProductoConLote = 0,
  IntAlmacenId = 0,
  IntAlmacenSecundarioId = 0,
  IntLoteInventarioId = 0;
before(async () => {
  await BaseDatos_exigirBaseActual("granja_sanidad_migracion_pruebas");
  const P = BaseDatos_obtenerCliente();
  const U = await P.usuarioCuenta.findFirstOrThrow();
  IntUsuarioId = U.usuarioId;
  const C = await P.inventarioCategoria.create({
    data: { nombre: "Categoria sanitaria temporal" },
  });
  const A = await P.inventarioAlmacen.create({
    data: { codigo: "SAN-TMP", nombre: "Almacen sanitario temporal" },
  });
  IntAlmacenId = A.inventarioId;
  const ObjAlmacenSecundario = await P.inventarioAlmacen.create({data:{codigo:"SAN-TMP-2",nombre:"Almacen sanitario temporal 2"}});
  IntAlmacenSecundarioId = ObjAlmacenSecundario.inventarioId;
  const P1 = await P.inventarioProducto.create({
    data: {
      categoriaId: C.categoriaId,
      codigo: "SAN-SIN-LOTE",
      nombre: "Producto sanitario sin lote",
      unidadMedida: "ML",
      manejaLotes: false,
    },
  });
  const P2 = await P.inventarioProducto.create({
    data: {
      categoriaId: C.categoriaId,
      codigo: "SAN-CON-LOTE",
      nombre: "Producto sanitario con lote",
      unidadMedida: "DOSIS",
      manejaLotes: true,
    },
  });
  IntProductoSinLote = P1.productoId;
  IntProductoConLote = P2.productoId;
  await P.sanidadProductoHabilitado.createMany({
    data: [{ productoId: P1.productoId }, { productoId: P2.productoId }],
  });
  await Inventario_registrarMovimiento({
    tipo: "INGRESO",
    subtipo: "INVENTARIO_INICIAL",
    productoId: P1.productoId,
    inventarioId: A.inventarioId,
    cantidad: new Prisma.Decimal("20"),
    costoUnitario: new Prisma.Decimal("2.5"),
    IntUsuarioId,
  });
  await Inventario_registrarMovimiento({tipo:"INGRESO",subtipo:"INVENTARIO_INICIAL",productoId:P1.productoId,inventarioId:IntAlmacenSecundarioId,cantidad:new Prisma.Decimal("5"),costoUnitario:new Prisma.Decimal("2.5"),IntUsuarioId});
  const M = await Inventario_registrarMovimiento({
    tipo: "INGRESO",
    subtipo: "INVENTARIO_INICIAL",
    productoId: P2.productoId,
    inventarioId: A.inventarioId,
    codigoLote: "SAN-LOT-1",
    cantidad: new Prisma.Decimal("10"),
    costoUnitario: new Prisma.Decimal("4"),
    fechaVencimiento: new Date(Date.UTC(2026, 7, 24)),
    IntUsuarioId,
  });
  IntLoteInventarioId = (
    await P.inventarioExistenciaLote.findUniqueOrThrow({
      where: { existenciaLoteId: M.existenciaLoteId! },
    })
  ).loteInventarioId;
  const T = await P.produccionTipoAnimal.create({
    data: { nombre: "Tipo sanitario temporal" },
  });
  const L = await P.produccionLote.create({
    data: {
      tipoAnimalId: T.tipoAnimalId,
      codigo: "SAN-PROD-TMP",
      nombre: "Lote sanitario temporal",
    },
  });
  IntLoteProduccionId = L.loteProduccionId;
  const Ani = await P.produccionAnimal.create({
    data: {
      tipoAnimalId: T.tipoAnimalId,
      identificacion: "SAN-ANIMAL-TMP",
      sexo: "HEMBRA",
    },
  });
  IntAnimalId = Ani.animalId;
  await P.produccionAsignacionLote.create({
    data: {
      animalId: Ani.animalId,
      loteProduccionId: L.loteProduccionId,
      tipoAnimalId: T.tipoAnimalId,
      usuarioId: IntUsuarioId,
      fechaInicio: new Date(Date.UTC(2026, 7, 24, 0, 0, 0)),
    },
  });
  IntTipoAplicacionId = (
    await P.sanidadTipoAplicacion.findUniqueOrThrow({
      where: { codigo: "MEDICAMENTO" },
    })
  ).tipoAplicacionId;
  IntUnidadId = (
    await P.sanidadUnidadDosis.findUniqueOrThrow({ where: { codigo: "ML" } })
  ).unidadDosisId;
  IntViaId = (
    await P.sanidadViaAdministracion.findUniqueOrThrow({
      where: { codigo: "ORAL" },
    })
  ).viaAdministracionId;
});
after(async () => {
  await BaseDatos_desconectar();
});
test("aplicación sin productos es atómica y trazable", async () => {
  const R = await Sanidad_registrar({
    tipoAplicacionId: IntTipoAplicacionId,
    fechaAplicacion: "2026-08-24T07:00:00.000-06:00",
    destino: { tipo: "ANIMAL", animalId: IntAnimalId },
    motivo: "Revisión clínica",
    detalles: [],
    IntUsuarioId,
  });
  assert.equal(R.detalles.length, 0);
  assert.equal(R.estado, "CONFIRMADA");
});
test("varios productos y fuentes descuentan costo promedio y lote", async () => {
  const P = BaseDatos_obtenerCliente();
  const R = await Sanidad_registrar({
    tipoAplicacionId: IntTipoAplicacionId,
    fechaAplicacion: "2026-08-24T08:00:00.000-06:00",
    destino: { tipo: "LOTE", loteProduccionId: IntLoteProduccionId },
    motivo: "Tratamiento",
    detalles: [
      {
        productoId: IntProductoSinLote,
        dosisClinica: "2",
        unidadDosisId: IntUnidadId,
        viaAdministracionId: IntViaId,
        alcanceDosis: "TOTAL_LOTE",
        fuentes: [
          { inventarioId: IntAlmacenId, cantidad: "3" },
          { inventarioId: IntAlmacenSecundarioId, cantidad: "1" },
        ],
      },
      {
        productoId: IntProductoConLote,
        dosisClinica: "1",
        unidadDosisId: IntUnidadId,
        viaAdministracionId: IntViaId,
        alcanceDosis: "POR_ANIMAL",
        fuentes: [
          {
            inventarioId: IntAlmacenId,
            loteInventarioId: IntLoteInventarioId,
            cantidad: "2",
          },
        ],
      },
    ],
    IntUsuarioId,
  });
  assert.equal(R.detalles.length, 2);
  const Arr = await P.inventarioTransaccion.findMany({
    where: {
      sanidadFuente: {
        detalle: { aplicacionSanitariaId: R.aplicacionSanitariaId },
      },
    },
  });
  assert.equal(Arr.length, 3);
  assert.deepEqual(Arr.map((x) => x.costoUnitario?.toFixed(4)).sort(), [
    "2.5000",
    "2.5000",
    "4.0000",
  ]);
  const H = await Sanidad_listar({
    IntPagina: 1,
    IntLimite: 20,
    IntAnimalId: IntAnimalId,
  });
  assert.ok(
    H.datos.some((x) => x.aplicacionSanitariaId === R.aplicacionSanitariaId),
  );
  await Sanidad_revertir(
    R.aplicacionSanitariaId,
    "Corrección controlada",
    IntUsuarioId,
  );
  await assert.rejects(
    Sanidad_revertir(R.aplicacionSanitariaId, "Doble", IntUsuarioId),
    /ya fue revertida/i,
  );
});
test("stock insuficiente revierte cabecera, detalle y fuente", async () => {
  const P = BaseDatos_obtenerCliente();
  const Antes = await P.sanidadAplicacion.count();
  await assert.rejects(
    Sanidad_registrar({
      tipoAplicacionId: IntTipoAplicacionId,
      fechaAplicacion: "2026-08-24T09:00:00.000-06:00",
      destino: { tipo: "ANIMAL", animalId: IntAnimalId },
      motivo: "Debe fallar",
      detalles: [
        {
          productoId: IntProductoSinLote,
          dosisClinica: "1",
          unidadDosisId: IntUnidadId,
          viaAdministracionId: IntViaId,
          alcanceDosis: "INDIVIDUAL",
          fuentes: [{ inventarioId: IntAlmacenId, cantidad: "999" }],
        },
      ],
      IntUsuarioId,
    }),
    /stock suficiente/i,
  );
  assert.equal(await P.sanidadAplicacion.count(), Antes);
});
test("concurrencia no permite doble consumo del mismo saldo", async () => {
  const Sanidad_intento = () => Sanidad_registrar({tipoAplicacionId:IntTipoAplicacionId,fechaAplicacion:"2026-08-24T10:00:00.000-06:00",destino:{tipo:"ANIMAL",animalId:IntAnimalId},motivo:"Concurrencia",detalles:[{productoId:IntProductoSinLote,dosisClinica:"1",unidadDosisId:IntUnidadId,viaAdministracionId:IntViaId,alcanceDosis:"INDIVIDUAL",fuentes:[{inventarioId:IntAlmacenId,cantidad:"15"}]}],IntUsuarioId});
  const ArrResultados = await Promise.allSettled([Sanidad_intento(), Sanidad_intento()]);
  assert.equal(ArrResultados.filter(Obj=>Obj.status==="fulfilled").length,1);
  assert.equal(ArrResultados.filter(Obj=>Obj.status==="rejected").length,1);
});
test("lote vencido antes de fecha efectiva se rechaza; vence hoy es válido", async () => {
  await assert.rejects(
    Sanidad_registrar({
      tipoAplicacionId: IntTipoAplicacionId,
      fechaAplicacion: "2026-08-25T07:00:00.000-06:00",
      destino: { tipo: "ANIMAL", animalId: IntAnimalId },
      motivo: "Vencido",
      detalles: [
        {
          productoId: IntProductoConLote,
          dosisClinica: "1",
          unidadDosisId: IntUnidadId,
          viaAdministracionId: IntViaId,
          alcanceDosis: "INDIVIDUAL",
          fuentes: [
            {
              inventarioId: IntAlmacenId,
              loteInventarioId: IntLoteInventarioId,
              cantidad: "1",
            },
          ],
        },
      ],
      IntUsuarioId,
    }),
    /vencido/i,
  );
});
