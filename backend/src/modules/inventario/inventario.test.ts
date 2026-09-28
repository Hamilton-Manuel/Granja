import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "../../../generated/prisma/client.js";
import { ArrCatalogoPermisosInventario, ArrPermisosInventarioOperador, Inventario_canonicalizarCodigo, ObjSubtiposInventario } from "./inventario.constants.js";
import { ObjConsultaExistencias, ObjConsultaProductos, ObjConsultaTransferencias, ObjCrearAjuste, ObjCrearAlmacen, ObjCrearEntrada, ObjCrearProducto, ObjCrearSalida, ObjCrearTransferencia, ObjEditarLote, ObjEditarMinimo } from "./inventario.schemas.js";
import { Inventario_calcularConversion, Inventario_validarProveedorLote, Inventario_validarProveedorOperacion } from "./inventario.service.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import { ObjCrearUnidad, ObjConsultaUnidades, ObjEstadoUnidad } from "./inventario.schemas.js";
import { Inventario_validarUnidadActiva, Inventario_validarUnidadesConversion } from "./inventario.service.js";

test("Inventario canonicaliza códigos manuales", () => assert.equal(Inventario_canonicalizarCodigo(" alm 01 "), "ALM01"));

test("Unidades acepta factores exactos DECIMAL(30,15) y rechaza cero, negativos o dimensiones ajenas", () => {
  const ObjBase = { codigo: "envase", nombre: "Envase", dimension: "VOLUMEN", factorReferencia: "250.123456789123456" };
  assert.equal(ObjCrearUnidad.parse(ObjBase).factorReferencia, ObjBase.factorReferencia);
  for (const StrFactor of ["0", "0.000", "-1", "1e3", "1.1234567891234567", "1000000000000000"]) assert.equal(ObjCrearUnidad.safeParse({ ...ObjBase, factorReferencia: StrFactor }).success, false);
  assert.equal(ObjCrearUnidad.safeParse({ ...ObjBase, dimension: "OTRA" }).success, false);
  assert.equal(ObjCrearUnidad.safeParse({ ...ObjBase, codigo: "m L" }).success, false);
  assert.equal(ObjConsultaUnidades.safeParse({ dimension: "VOLUMEN", estado: "INACTIVO" }).success, true);
});

test("Estado de unidad no permite cambiar factor, dimensión ni código", () => {
  assert.equal(ObjEstadoUnidad.safeParse({ activo: false }).success, true);
  for (const ObjExtra of [{ factorReferencia: "5" }, { dimension: "PESO" }, { codigo: "nuevo" }]) assert.equal(ObjEstadoUnidad.safeParse({ activo: false, ...ObjExtra }).success, false);
});

test("Unidades inactivas se rechazan y las conversiones no cruzan dimensiones", () => {
  assert.throws(() => Inventario_validarUnidadActiva({ activo: false }), { StrCodigo: "UNIDAD_INACTIVA" });
  assert.throws(() => Inventario_validarUnidadActiva(null), { StrCodigo: "UNIDAD_INACTIVA" });
  assert.doesNotThrow(() => Inventario_validarUnidadActiva({ activo: true }));
  const ObjPeso = { activo: true, dimension: "PESO" }, ObjVolumen = { activo: true, dimension: "VOLUMEN" };
  assert.throws(() => Inventario_validarUnidadesConversion(ObjPeso, ObjVolumen), { StrCodigo: "DIMENSION_UNIDAD_INCOMPATIBLE" });
  assert.throws(() => Inventario_validarUnidadesConversion({ ...ObjVolumen, activo: false }, ObjVolumen), { StrCodigo: "UNIDAD_COMERCIAL_INVALIDA" });
  assert.throws(() => Inventario_validarUnidadesConversion(ObjVolumen, { ...ObjVolumen, activo: false }), { StrCodigo: "UNIDAD_BASE_INVALIDA" });
  assert.doesNotThrow(() => Inventario_validarUnidadesConversion(ObjVolumen, ObjVolumen));
  assert.doesNotThrow(() => Inventario_validarUnidadesConversion(ObjPeso, ObjPeso));
});

test("Persistencia de unidad conserva el factor como texto exacto dentro de la transacción", async () => {
  const { BaseDatos_obtenerCliente } = await import("../../database/prisma.js");
  const { Inventario_crearUnidad } = await import("./inventario.repository.js");
  const ObjDb = BaseDatos_obtenerCliente();
  const Inventario_transaccionOriginal = Reflect.get(ObjDb, "$transaction");
  const ArrEventos: string[] = [];
  const StrFactor = "250.123456789123456";
  const ObjTx = {
    inventarioUnidadMedida: { create: async () => { ArrEventos.push("crear"); return { unidadMedidaId: 50, codigo: "envase" }; } },
    $executeRaw: async (_ArrSql: TemplateStringsArray, StrValor: string, IntId: number) => { ArrEventos.push("factor"); assert.equal(StrValor, StrFactor); assert.equal(IntId, 50); },
    usuarioBitacora: { create: async () => { ArrEventos.push("bitacora"); } },
  };
  Reflect.set(ObjDb, "$transaction", async (Inventario_accion: (Obj: unknown) => Promise<unknown>) => Inventario_accion(ObjTx));
  try {
    const ObjResultado = await Inventario_crearUnidad({ codigo: "envase", nombre: "Envase", dimension: "VOLUMEN", factorReferencia: StrFactor, IntUsuarioId: 1 });
    assert.equal(ObjResultado.factorReferencia, StrFactor);
    assert.deepEqual(ArrEventos, ["crear", "factor", "bitacora"]);
  } finally { Reflect.set(ObjDb, "$transaction", Inventario_transaccionOriginal); }
});

test("Crear producto rechaza una unidad inactiva antes de persistir", async () => {
  const { BaseDatos_obtenerCliente } = await import("../../database/prisma.js");
  const { Inventario_crearProducto } = await import("./inventario.service.js");
  const ObjDb = BaseDatos_obtenerCliente();
  const Inventario_consultaOriginal = Reflect.get(ObjDb, "$queryRaw");
  Reflect.set(ObjDb, "$queryRaw", async () => [{ codigo: "L", activo: false }]);
  try {
    await assert.rejects(Inventario_crearProducto({ codigo: "TEST", nombre: "Prueba", unidadMedida: "L", categoriaId: 1, manejaLotes: true, IntUsuarioId: 1 }), { StrCodigo: "UNIDAD_INACTIVA" });
  } finally { Reflect.set(ObjDb, "$queryRaw", Inventario_consultaOriginal); }
});
test("Inventario define permisos únicos", () => assert.equal(new Set(ArrCatalogoPermisosInventario.map((Obj) => Obj.StrCodigo)).size, 21));
test("Operador solo recibe cuatro permisos operativos", () => assert.deepEqual([...ArrPermisosInventarioOperador], ["INVENTARIO_CONSULTAR", "INVENTARIO_ENTRADAS_CREAR", "INVENTARIO_SALIDAS_CREAR", "INVENTARIO_TRANSFERENCIAS_CREAR"]));
test("No existen subtipos de venta, devolución de cliente o producción", () => { const Arr = Object.values(ObjSubtiposInventario); assert.equal(Arr.includes("VENTA" as never), false); assert.equal(Arr.includes("DEVOLUCION_CLIENTE" as never), false); assert.equal(Arr.includes("PRODUCCION" as never), false); });
test("Entrada solo acepta realidad comercial y no acepta lote ni costo calculado por cliente", () => { const Base = { productoId: 1, inventarioId: 1, cantidadComercial: "1", unidadComercial: "t", precioTotalIngreso: "1500" }; assert.equal(ObjCrearEntrada.safeParse({ ...Base, proveedorId: 1, subtipo: "COMPRA" }).success, true); assert.equal(ObjCrearEntrada.safeParse({ ...Base, subtipo: "PRODUCCION" }).success, false); assert.equal(ObjCrearEntrada.safeParse({ ...Base, proveedorId: 1, subtipo: "COMPRA", codigoLote: "MANUAL" }).success, false); assert.equal(ObjCrearEntrada.safeParse({ ...Base, proveedorId: 1, subtipo: "COMPRA", costoUnitario: "1" }).success, false); });
test("COMPRA exige proveedor y saldo inicial lo permite opcional", () => { const Base = { productoId: 1, inventarioId: 1, cantidadComercial: "1", unidadComercial: "kg", precioTotalIngreso: "10" }; assert.equal(ObjCrearEntrada.safeParse({ ...Base, subtipo: "COMPRA" }).success, false); assert.equal(ObjCrearEntrada.safeParse({ ...Base, subtipo: "INVENTARIO_INICIAL" }).success, true); });
test("Conversión t a lb usa snapshots y ROUND_HALF_UP determinista", () => { const Obj = Inventario_calcularConversion(new Prisma.Decimal(1), new Prisma.Decimal(1000000), new Prisma.Decimal("453.59237"), new Prisma.Decimal(1500)); assert.equal(Obj.DecFactorConversion.toFixed(15), "2204.622621848776000"); assert.equal(Obj.DecCantidadBase.toFixed(6), "2204.622622"); assert.equal(Obj.DecCostoUnitario.toFixed(18), "0.680388554953329332"); });
test("Compra, saldo inicial y devolución validan proveedor directo sin relación producto-proveedor", () => {
  assert.doesNotThrow(() => Inventario_validarProveedorOperacion({ activo: true }, true, true));
  assert.doesNotThrow(() => Inventario_validarProveedorOperacion(null, false, false));
  assert.throws(() => Inventario_validarProveedorOperacion(null, true, false), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.IntEstadoHttp === 400 && ObjError.StrCodigo === "PROVEEDOR_REQUERIDO");
  assert.throws(() => Inventario_validarProveedorOperacion(null, false, true), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.IntEstadoHttp === 404 && ObjError.StrCodigo === "PROVEEDOR_NO_ENCONTRADO");
  assert.throws(() => Inventario_validarProveedorOperacion({ activo: false }, false, true), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.IntEstadoHttp === 409 && ObjError.StrCodigo === "PROVEEDOR_INACTIVO");
});
test("Proveedor recibido debe coincidir con el proveedor histórico del lote", () => {
  assert.doesNotThrow(() => Inventario_validarProveedorLote(8, 8)); assert.doesNotThrow(() => Inventario_validarProveedorLote(null, 8)); assert.doesNotThrow(() => Inventario_validarProveedorLote(8));
  assert.throws(() => Inventario_validarProveedorLote(8, 9), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "PROVEEDOR_LOTE_NO_COINCIDE");
});
test("Salida manual rechaza ALIMENTACION y SANIDAD", () => { const Base = { productoId: 1, inventarioId: 1, loteInventarioId:1, cantidad: "1" }; assert.equal(ObjCrearSalida.safeParse({ ...Base, subtipo: "ALIMENTACION" }).success, false); assert.equal(ObjCrearSalida.safeParse({ ...Base, subtipo: "SANIDAD" }).success, false); });
test("Salida manual exige lote y acepta devolución, merma y disposición", () => { const Base = { productoId: 1, inventarioId: 1, loteInventarioId:1, cantidad: "1" }; for (const subtipo of ["DEVOLUCION_PROVEEDOR", "MERMA", "DISPOSICION"]) assert.equal(ObjCrearSalida.safeParse({ ...Base, subtipo }).success, true); assert.equal(ObjCrearSalida.safeParse({productoId:1,inventarioId:1,cantidad:"1",subtipo:"MERMA"}).success,false); });
test("Ajuste no acepta cantidad cero", () => assert.equal(ObjCrearAjuste.safeParse({ productoId: 1, inventarioId: 1, loteInventarioId:1, cantidad: "0", motivo: "Conteo", subtipo: "CONTEO_FISICO" }).success, false));
test("CONTEO_FISICO exige motivo", () => assert.equal(ObjCrearAjuste.safeParse({ productoId: 1, inventarioId: 1, loteInventarioId:1, cantidad: "1", subtipo: "CONTEO_FISICO" }).success, false));
test("Existencia mínima exige decimal no negativo", () => { assert.equal(ObjEditarMinimo.safeParse({ existenciaMinima: "0.0000" }).success, true); assert.equal(ObjEditarMinimo.safeParse({ existenciaMinima: "-1" }).success, false); });
test("Almacén exige código manual", () => assert.equal(ObjCrearAlmacen.safeParse({ nombre: "Principal" }).success, false));
test("Producto no acepta campos de stock", () => assert.equal(ObjCrearProducto.safeParse({ categoriaId: 1, codigo: "INS01", nombre: "Insumo", unidadMedida: "kg", manejaLotes: false, existenciaActual: 2 }).success, false));
test("Transferencia exige lote, almacenes y cantidad positiva", () => { assert.equal(ObjCrearTransferencia.safeParse({ productoId: 1, inventarioOrigenId: 1, inventarioDestinoId: 2, loteInventarioId:1, cantidad: "1.5" }).success, true); assert.equal(ObjCrearTransferencia.safeParse({ productoId: 1, inventarioOrigenId: 1, inventarioDestinoId: 2, cantidad: "1.5" }).success, false); assert.equal(ObjCrearTransferencia.safeParse({ productoId: 1, inventarioOrigenId: 1, inventarioDestinoId: 2, loteInventarioId:1, cantidad: "0" }).success, false); });
test("Decimal conserva comparación exacta", () => assert.equal(new Prisma.Decimal("0.1000").equals(new Prisma.Decimal("0.1")), true));

test("Volumen: una caneca equivale exactamente a cinco galones estadounidenses", () => {
  const DecGalon = new Prisma.Decimal("3785.411784");
  const DecCaneca = new Prisma.Decimal("18927.05892");
  assert.equal(DecCaneca.equals(DecGalon.mul(5)), true);
  const ObjConversion = Inventario_calcularConversion(new Prisma.Decimal(1), DecCaneca, DecGalon, new Prisma.Decimal(1));
  assert.equal(ObjConversion.DecFactorConversion.toFixed(12), "5.000000000000");
  assert.equal(ObjConversion.DecCantidadBase.toFixed(6), "5.000000");
  const ObjInversa = Inventario_calcularConversion(new Prisma.Decimal(5), DecGalon, DecCaneca, new Prisma.Decimal(1));
  assert.equal(ObjInversa.DecCantidadBase.toFixed(6), "1.000000");
});
test("Código no forma parte de PATCH de producto", async () => { const { ObjEditarProducto } = await import("./inventario.schemas.js"); assert.equal(ObjEditarProducto.safeParse({ codigo: "OTRO" }).success, false); });
test("No hay esquema DELETE", () => assert.equal(Object.keys(ObjSubtiposInventario).some((Str) => Str.includes("DELETE")), false));
test("PATCH de lote no acepta fecha de fabricacion", () => { assert.equal(ObjEditarLote.safeParse({ fechaFabricacion: "2026-08-01" }).success, false); assert.equal(ObjEditarLote.safeParse({ fechaVencimiento: null }).success, true); });
test("Booleanos de query distinguen false", () => { assert.equal(ObjConsultaProductos.parse({ manejaLotes: "false" }).manejaLotes, false); assert.equal(ObjConsultaExistencias.parse({ bajoMinimo: "true" }).bajoMinimo, true); assert.equal(ObjConsultaTransferencias.safeParse({ revertida: "no" }).success, false); });

test("Consulta de lotes para salida exige producto y almacén sin afectar historial", async () => {
  const { ObjConsultaLotes } = await import("./inventario.schemas.js");
  assert.equal(ObjConsultaLotes.safeParse({}).success, true);
  assert.equal(ObjConsultaLotes.safeParse({ operacionSalida: "MERMA" }).success, false);
  assert.equal(ObjConsultaLotes.safeParse({ operacionSalida: "DISPOSICION", productoId: 42, inventarioId: 7 }).success, true);
});

test("Fuentes disponibles filtra saldo positivo, actividad, producto y almacén", async () => {
  const { Inventario_filtroFuentesDisponibles } = await import("./inventario.repository.js");
  assert.deepEqual(Inventario_filtroFuentesDisponibles(42, undefined, 7), {
    productoId: 42, existenciaActual: { gt: 0 },
    existencia: { inventarioId: 7, activo: true, existenciaActual: { gt: 0 }, almacen: { activo: true }, producto: { activo: true, manejaLotes: true } },
    lote: { activo: true },
  });
  const DtFecha = new Date("2026-09-28T00:00:00Z");
  assert.deepEqual(Inventario_filtroFuentesDisponibles(42, DtFecha, 7).lote, { activo: true, OR: [{ fechaVencimiento: null }, { fechaVencimiento: { gte: DtFecha } }] });
});

test("Salida rechaza lote agotado entre selección y confirmación antes de escribir movimiento", async () => {
  const { Inventario_aplicarMovimientoConTx } = await import("./inventario.repository.js");
  let BoolMovimiento = false;
  const ObjTx = {
    inventarioExistencia: { findUnique: async () => ({ inventarioProductoId: 10 }) },
    inventarioExistenciaLote: {
      findUnique: async () => ({ existenciaLoteId: 6, productoId: 42 }),
      updateMany: async (Obj: { where: { existenciaActual: { gte: Prisma.Decimal } } }) => {
        assert.equal(Obj.where.existenciaActual.gte.toString(), "1");
        return { count: 0 };
      },
    },
    inventarioTransaccion: { create: async () => { BoolMovimiento = true; } },
  } as unknown as Prisma.TransactionClient;
  await assert.rejects(Inventario_aplicarMovimientoConTx(ObjTx, { productoId: 42, inventarioId: 7, loteInventarioId: 6, cantidad: new Prisma.Decimal("-1"), tipo: "SALIDA", subtipo: "MERMA", IntUsuarioId: 1 }), /STOCK_INSUFICIENTE/);
  assert.equal(BoolMovimiento, false);
});
