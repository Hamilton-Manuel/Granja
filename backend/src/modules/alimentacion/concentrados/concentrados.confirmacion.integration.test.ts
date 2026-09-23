import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "../../../../generated/prisma/client.js";
import { BaseDatos_exigirBaseActual, BaseDatos_obtenerCliente } from "../../../database/prisma.js";
import { PruebasBaseDatos_crearTemporalConcentrados } from "../../../testing/concentrados-base-temporal.js";
import { Usuarios_ejecutarBootstrap } from "../../../scripts/bootstrap-usuarios.js";
import { Alimentacion_confirmarElaboracion } from "./concentrados.elaboraciones.service.js";
import * as S from "./concentrados.service.js";
import * as I from "../../inventario/inventario.service.js";
import { ErrorAplicacion } from "../../../errors/error-aplicacion.js";
import * as V from "./concentrados.reversion.service.js";
import * as Alimentacion from "../alimentacion.service.js";
import * as Produccion from "../../produccion/produccion.service.js";
import { Fecha_parsearFechaCivil } from "../../../datetime/fecha.js";

let ObjBase: Awaited<ReturnType<typeof PruebasBaseDatos_crearTemporalConcentrados>> | undefined;
let IntUsuarioId: number, IntCategoriaId: number, IntAlmacenId: number, IntOtroAlmacenId: number, IntCaso = 0;
before(async () => {
  ObjBase = await PruebasBaseDatos_crearTemporalConcentrados();
  await BaseDatos_exigirBaseActual(ObjBase.StrNombre);
  process.env.BOOTSTRAP_WEBMASTER_NOMBRE_COMPLETO = "Temporal 3B";
  process.env.BOOTSTRAP_WEBMASTER_USUARIO = "concentrados_3b";
  process.env.BOOTSTRAP_WEBMASTER_CORREO = "3b@example.invalid";
  process.env.BOOTSTRAP_WEBMASTER_CONTRASENA = randomBytes(24).toString("base64url");
  await Usuarios_ejecutarBootstrap();
  const ObjDb = BaseDatos_obtenerCliente();
  IntUsuarioId = (await ObjDb.usuarioCuenta.findUniqueOrThrow({ where: { nombreUsuario: "concentrados_3b" } })).usuarioId;
  IntCategoriaId = (await ObjDb.inventarioCategoria.create({ data: { nombre: "Pruebas 3B" } })).categoriaId;
  IntAlmacenId = (await ObjDb.inventarioAlmacen.create({ data: { codigo: "3B-A", nombre: "Origen y destino" } })).inventarioId;
  IntOtroAlmacenId = (await ObjDb.inventarioAlmacen.create({ data: { codigo: "3B-B", nombre: "Otro origen" } })).inventarioId;
  await ObjDb.alimentacionFormula.create({ data: { nombre: "Fórmula intacta", cantidadBase: "1", unidadBase: "lb" } });
});
after(async () => { await ObjBase?.eliminar(); });
async function Alimentacion_producto(BoolConcentrado = false) {
  const Obj = await BaseDatos_obtenerCliente().inventarioProducto.create({ data: { codigo: `3B-${++IntCaso}`, nombre: `Producto ${IntCaso}`, categoriaId: IntCategoriaId, unidadMedida: "lb" } });
  const ObjClasificacion = BoolConcentrado ? await S.Alimentacion_clasificarConcentrado(Obj.productoId, { IntUsuarioId }) : null;
  return { ...Obj, concentradoId: ObjClasificacion?.concentradoId ?? 0 };
}
async function Alimentacion_entrada(IntProductoId: number, StrCantidad: string, StrTotal: string, IntAlmacen = IntAlmacenId) {
  return I.Inventario_registrarEntrada({ subtipo: "INVENTARIO_INICIAL", productoId: IntProductoId, inventarioId: IntAlmacen,
    cantidadComercial: StrCantidad, unidadComercial: "lb", precioTotalIngreso: StrTotal, IntUsuarioId });
}
async function Alimentacion_caso(BoolFuentes = true) {
  const ObjMateria = await Alimentacion_producto(), ObjProducto = await Alimentacion_producto(true);
  const ObjRecetaDatos = { concentradoId: ObjProducto.concentradoId, nombre: `Receta ${IntCaso}`, cantidadBase: "100", unidadBase: "lb" as const,
    detalles: [{ productoId: ObjMateria.productoId, cantidad: "50", unidadMedida: "lb" as const }] };
  const ObjReceta = await S.Alimentacion_crearRecetaConcentrado(ObjRecetaDatos, { IntUsuarioId });
  if (BoolFuentes) {
    await Alimentacion_entrada(ObjMateria.productoId, "20", "40");
    await Alimentacion_entrada(ObjMateria.productoId, "10", "30");
    await Alimentacion_entrada(ObjMateria.productoId, "30", "120", IntOtroAlmacenId);
  }
  const ObjEntrada = { recetaId: ObjReceta.recetaId, versionReceta: 1, fechaEfectiva: "2026-09-22T12:00:00.000-06:00",
    cantidadTeorica: "100", cantidadReal: "100", unidadCaptura: "lb", inventarioDestinoId: IntAlmacenId };
  const ObjPrevia = await S.Alimentacion_previsualizarElaboracion(ObjEntrada);
  return { ObjMateria, ObjProducto, ObjReceta, ObjRecetaDatos, ObjEntrada, ObjPrevia,
    ObjSolicitud: { ...ObjEntrada, claveIdempotencia: randomUUID(), huellaPrevisualizacion: ObjPrevia.huellaPrevisualizacion } };
}
async function Alimentacion_foto() {
  return BaseDatos_obtenerCliente().$queryRaw`
    SELECT (SELECT * FROM dbo.inventario_existencias ORDER BY inventario_producto_id FOR JSON PATH) saldos,
    (SELECT * FROM dbo.inventario_existencias_lotes ORDER BY existencia_lote_id FOR JSON PATH) saldosLotes,
    (SELECT * FROM dbo.inventario_lotes ORDER BY lote_inventario_id FOR JSON PATH) lotes,
    (SELECT * FROM dbo.inventario_transacciones ORDER BY transaccion_inventario_id FOR JSON PATH) movimientos,
    (SELECT * FROM dbo.alimentacion_elaboraciones ORDER BY elaboracion_id FOR JSON PATH) elaboraciones,
    (SELECT * FROM dbo.alimentacion_elaboraciones_detalles ORDER BY elaboracion_detalle_id FOR JSON PATH) detalles,
    (SELECT * FROM dbo.alimentacion_elaboraciones_fuentes ORDER BY elaboracion_fuente_id FOR JSON PATH) fuentes,
    (SELECT * FROM dbo.usuarios_bitacora FOR JSON PATH) bitacora`;
}
function Alimentacion_esConflicto(ObjError: unknown) { return ObjError instanceof ErrorAplicacion && ObjError.IntEstadoHttp === 409; }

test("consultas para frontend conservan precisión, snapshots, paginación y no escriben", async () => {
  const ObjCaso = await Alimentacion_caso(), ObjDb = BaseDatos_obtenerCliente();
  const IntLote = ObjCaso.ObjPrevia.ingredientes[0]!.fuentes[0]!.loteInventarioId;
  await ObjDb.$executeRaw`UPDATE dbo.inventario_lotes SET costo_unitario=CAST(N'2.123456789012345678' AS DECIMAL(38,18)) WHERE lote_inventario_id=${IntLote}`;
  const ObjPrevia = await S.Alimentacion_previsualizarElaboracion(ObjCaso.ObjEntrada);
  const ObjConfirmada = await Alimentacion_confirmarElaboracion({ ...ObjCaso.ObjSolicitud, huellaPrevisualizacion: ObjPrevia.huellaPrevisualizacion }, { IntUsuarioId });
  await ObjDb.inventarioProducto.update({ where: { productoId: ObjCaso.ObjProducto.productoId }, data: { nombre: "Nombre posterior" } });
  const ObjAntes = await Alimentacion_foto();
  const ObjDetalle = await S.Alimentacion_detalleElaboracion(ObjConfirmada.datos.elaboracionId);
  assert.equal(ObjDetalle.nombreProductoSnapshot, ObjCaso.ObjProducto.nombre);
  assert.equal(ObjDetalle.costoTotal, ObjConfirmada.datos.costoTotal);
  assert.equal(ObjDetalle.detalles[0]!.fuentes[0]!.costoUnitarioHistorico, "2.123456789012345678");
  assert.equal(ObjDetalle.almacenDestino.inventarioId, IntAlmacenId);
  assert.equal(ObjDetalle.detalles[0]!.fuentes[2]!.almacen.inventarioId, IntOtroAlmacenId);
  const ObjLista = await S.Alimentacion_historial({ pagina: 1, limite: 1, concentradoId: ObjCaso.ObjProducto.concentradoId });
  assert.equal(ObjLista.paginacion.total, 1);
  assert.equal(ObjLista.datos[0]!.costoTotal, ObjConfirmada.datos.costoTotal);
  assert.equal((await S.Alimentacion_historial({ pagina: 2, limite: 1, concentradoId: ObjCaso.ObjProducto.concentradoId })).datos.length, 0);
  assert.equal((await S.Alimentacion_historial({ pagina: 1, limite: 20, busqueda: "Nombre posterior" })).datos.length, 0);
  await assert.rejects(S.Alimentacion_detalleElaboracion(2147483647), /no existe/);
  assert.deepEqual(await Alimentacion_foto(), ObjAntes);
});

test("3B confirma tres fuentes reales, nuevo lote/ingreso, costo y relaciones; fórmulas intactas", async () => {
  const ObjCaso = await Alimentacion_caso(), ObjDb = BaseDatos_obtenerCliente();
  const ArrFormulas = await ObjDb.alimentacionFormula.findMany({ include: { detalles: true } });
  const Obj = await Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId });
  assert.equal(Obj.reutilizada, false);
  assert.equal(Obj.datos.costoTotal, "150.000000000000000000000000");
  assert.equal(Obj.datos.costoUnitario, "1.500000000000000000");
  assert.equal(Obj.datos.residualValoracion, "0.000000000000000000000000");
  assert.deepEqual(Obj.datos.detalles[0]!.fuentes.map(Obj => Obj.cantidadConsumida), ["20.000000", "10.000000", "20.000000"]);
  const ArrSaldos = await ObjDb.inventarioExistencia.findMany({ where: { productoId: ObjCaso.ObjMateria.productoId }, orderBy: { inventarioId: "asc" } });
  assert.deepEqual(ArrSaldos.map(Obj => Obj.existenciaActual.toString()), ["0", "10"]);
  const ObjSalida = await ObjDb.inventarioExistenciaLote.findUniqueOrThrow({ where: { existenciaLoteId: Obj.datos.existenciaDestinoId }, include: { lote: true, existencia: true } });
  assert.equal(ObjSalida.existenciaActual.toString(), "100");
  assert.equal(ObjSalida.existencia.existenciaActual.toString(), "100");
  assert.equal(ObjSalida.lote.transaccionOrigenId, Obj.datos.transaccionIngresoId);
  for (const ObjFuente of Obj.datos.detalles[0]!.fuentes) {
    const ObjMovimiento = await ObjDb.inventarioTransaccion.findUniqueOrThrow({ where: { transaccionInventarioId: ObjFuente.transaccionConsumoId } });
    assert.equal(ObjMovimiento.existenciaLoteId, ObjFuente.existenciaLoteId);
    assert.equal(ObjMovimiento.cantidad.abs().toFixed(6), ObjFuente.cantidadConsumida);
    assert.equal(ObjMovimiento.subtipoTransaccion, "ELABORACION_CONSUMO");
    assert.equal(ObjMovimiento.fechaTransaccion.getUTCHours(), 12);
  }
  const ObjIngreso = await ObjDb.inventarioTransaccion.findUniqueOrThrow({ where: { transaccionInventarioId: Obj.datos.transaccionIngresoId } });
  assert.equal(ObjIngreso.subtipoTransaccion, "ELABORACION_INGRESO");
  assert.equal(ObjIngreso.precioTotalIngreso, null);
  assert.deepEqual(await ObjDb.alimentacionFormula.findMany({ include: { detalles: true } }), ArrFormulas);
  await assert.rejects(I.Inventario_revertirMovimiento(ObjIngreso.transaccionInventarioId, IntUsuarioId), /individualmente/);
  await assert.rejects(I.Inventario_revertirMovimiento(Obj.datos.detalles[0]!.fuentes[0]!.transaccionConsumoId, IntUsuarioId), /individualmente/);
});

test("3B rechaza huella obsoleta por stock, costos o versión sin sustituir fuentes ni escribir", async () => {
  for (const StrCambio of ["stock", "costo", "receta"]) {
    const ObjCaso = await Alimentacion_caso(), ObjDb = BaseDatos_obtenerCliente();
    const ObjFuente = ObjCaso.ObjPrevia.ingredientes[0]!.fuentes[0]!;
    if (StrCambio === "stock") await Alimentacion_entrada(ObjCaso.ObjMateria.productoId, "100", "100");
    if (StrCambio === "costo") await ObjDb.$executeRaw`UPDATE dbo.inventario_lotes SET costo_unitario=CAST(N'2.000000000000000001' AS DECIMAL(38,18)) WHERE lote_inventario_id=${ObjFuente.loteInventarioId}`;
    if (StrCambio === "receta") await S.Alimentacion_editarRecetaConcentrado(ObjCaso.ObjReceta.recetaId, { ...ObjCaso.ObjRecetaDatos, versionEsperada: 1 }, { IntUsuarioId });
    const ObjAntes = await Alimentacion_foto();
    await assert.rejects(Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId }), Alimentacion_esConflicto);
    assert.deepEqual(await Alimentacion_foto(), ObjAntes);
  }
});
test("3B rechaza ingredientes insuficientes incluso con huella idéntica a la previa", async () => {
  const ObjCaso = await Alimentacion_caso(false), ObjAntes = await Alimentacion_foto();
  await assert.rejects(Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId }), Alimentacion_esConflicto);
  assert.deepEqual(await Alimentacion_foto(), ObjAntes);
});

for (const StrFallo of ["segundo_descuento", "lote", "ingreso"] as const) {
  test(`3B rollback SQL completo ante fallo en ${StrFallo}`, async () => {
    const ObjCaso = await Alimentacion_caso(), ObjDb = BaseDatos_obtenerCliente();
    await BaseDatos_exigirBaseActual(ObjBase!.StrNombre);
    const StrTabla = StrFallo === "lote" ? "inventario_lotes" : "inventario_transacciones";
    const StrCondicion = StrFallo === "lote" ? `producto_id=${ObjCaso.ObjProducto.productoId}`
      : StrFallo === "ingreso" ? "subtipo_transaccion=N'ELABORACION_INGRESO'"
      : `subtipo_transaccion=N'ELABORACION_CONSUMO' AND existencia_lote_id=${ObjCaso.ObjPrevia.ingredientes[0]!.fuentes[1]!.existenciaLoteId}`;
    // Trigger únicamente en esta base desechable; fallo real del motor, sin simular persistencia.
    await ObjDb.$executeRawUnsafe(`CREATE TRIGGER dbo.prueba_3b_fallo ON dbo.${StrTabla} AFTER INSERT AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted WHERE ${StrCondicion}) THROW 51000,N'FALLO_SQL_3B',1; END`);
    try {
      const ObjAntes = await Alimentacion_foto();
      await assert.rejects(Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId }), /FALLO_SQL_3B/);
      assert.deepEqual(await Alimentacion_foto(), ObjAntes);
    } finally {
      await BaseDatos_exigirBaseActual(ObjBase!.StrNombre);
      await ObjDb.$executeRaw`DROP TRIGGER dbo.prueba_3b_fallo`;
    }
    const ObjReintento = await Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId });
    assert.equal(ObjReintento.reutilizada, false);
  });
}
test("3B idempotencia devuelve lo persistido y rechaza otro contenido/usuario", async () => {
  const ObjCaso = await Alimentacion_caso(), ObjDb = BaseDatos_obtenerCliente();
  const ObjPrimera = await Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId });
  const ObjAntes = await Alimentacion_foto();
  const ObjSegunda = await Alimentacion_confirmarElaboracion({ ...ObjCaso.ObjSolicitud, claveIdempotencia: ObjCaso.ObjSolicitud.claveIdempotencia.toUpperCase() }, { IntUsuarioId });
  assert.equal(ObjSegunda.reutilizada, true); assert.deepEqual(ObjSegunda.datos, ObjPrimera.datos);
  assert.deepEqual(await Alimentacion_foto(), ObjAntes);
  await assert.rejects(Alimentacion_confirmarElaboracion({ ...ObjCaso.ObjSolicitud, observaciones: "Contenido cambiado" }, { IntUsuarioId }), Alimentacion_esConflicto);
  const ObjOriginal = await ObjDb.usuarioCuenta.findUniqueOrThrow({ where: { usuarioId: IntUsuarioId } });
  const ObjOtro = await ObjDb.usuarioCuenta.create({ data: { nombreUsuario: "otro_3b", correo: "otro3b@example.invalid", nombreCompleto: "Otro responsable", rolId: ObjOriginal.rolId, contrasenaHash: ObjOriginal.contrasenaHash } });
  await assert.rejects(Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId: ObjOtro.usuarioId }), Alimentacion_esConflicto);
});
test("3B solicitudes simultáneas con la misma clave crean una sola elaboración", async () => {
  const ObjCaso = await Alimentacion_caso(), ObjDb = BaseDatos_obtenerCliente();
  const Arr = await Promise.all([Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId }), Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId })]);
  assert.equal(Arr[0]!.datos.elaboracionId, Arr[1]!.datos.elaboracionId);
  assert.deepEqual(Arr.map(Obj => Obj.reutilizada).sort(), [false, true]);
  assert.equal(await ObjDb.alimentacionElaboracion.count({ where: { claveIdempotencia: ObjCaso.ObjSolicitud.claveIdempotencia } }), 1);
  assert.equal(await ObjDb.inventarioTransaccion.count({ where: { documentoReferencia: ObjCaso.ObjSolicitud.claveIdempotencia } }), 4);
});
test("3B confirmaciones con claves distintas compiten sin stock negativo ni ingreso duplicado", async () => {
  const ObjCaso = await Alimentacion_caso();
  const Arr = await Promise.allSettled([Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId }), Alimentacion_confirmarElaboracion({ ...ObjCaso.ObjSolicitud, claveIdempotencia: randomUUID() }, { IntUsuarioId })]);
  assert.equal(Arr.filter(Obj => Obj.status === "fulfilled").length, 1);
  const ObjFallo = Arr.find(Obj => Obj.status === "rejected");
  assert.ok(ObjFallo?.status === "rejected" && Alimentacion_esConflicto(ObjFallo.reason), ObjFallo?.status === "rejected" ? String(ObjFallo.reason) : "Falta el rechazo concurrente");
  const ObjDb = BaseDatos_obtenerCliente();
  assert.equal(await ObjDb.inventarioExistenciaLote.count({ where: { existenciaActual: { lt: 0 } } }), 0);
  assert.equal(await ObjDb.alimentacionElaboracion.count({ where: { recetaId: ObjCaso.ObjReceta.recetaId } }), 1);
  assert.equal(await ObjDb.inventarioTransaccion.count({ where: { subtipoTransaccion: { in: ["ELABORACION_CONSUMO", "ELABORACION_INGRESO"] }, existencia: { productoId: { in: [ObjCaso.ObjMateria.productoId, ObjCaso.ObjProducto.productoId] } } } }), 4);
  const ArrSaldos = await ObjDb.inventarioExistencia.findMany({ where: { productoId: ObjCaso.ObjMateria.productoId } });
  assert.equal(ArrSaldos.reduce((Dec, Obj) => Dec.add(Obj.existenciaActual), new Prisma.Decimal(0)).toString(), "10");
});
test("3B compite con salida de Inventario y mantiene saldos conciliados", async () => {
  const ObjCaso = await Alimentacion_caso(), ObjFuente = ObjCaso.ObjPrevia.ingredientes[0]!.fuentes[0]!;
  const Arr = await Promise.allSettled([Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId }),
    I.Inventario_registrarSalida({ subtipo: "MERMA", productoId: ObjCaso.ObjMateria.productoId, inventarioId: IntAlmacenId, loteInventarioId: ObjFuente.loteInventarioId, cantidad: "20", motivo: "Competencia temporal", IntUsuarioId })]);
  assert.equal(Arr.filter(Obj => Obj.status === "fulfilled").length, 1);
  assert.equal(await BaseDatos_obtenerCliente().inventarioExistenciaLote.count({ where: { existenciaActual: { lt: 0 } } }), 0);
  const ArrSaldos = await BaseDatos_obtenerCliente().inventarioExistencia.findMany({ where: { productoId: ObjCaso.ObjMateria.productoId }, include: { lotes: true, transacciones: true } });
  for (const ObjSaldo of ArrSaldos) {
    assert.equal(ObjSaldo.lotes.reduce((Dec, Obj) => Dec.add(Obj.existenciaActual), new Prisma.Decimal(0)).toString(), ObjSaldo.existenciaActual.toString());
    assert.equal(ObjSaldo.transacciones.reduce((Dec, Obj) => Dec.add(Obj.cantidad), new Prisma.Decimal(0)).toString(), ObjSaldo.existenciaActual.toString());
  }
});
test("3B conserva snapshots y lotes previos al editar recetas/nombres y elaborar con otro costo", async () => {
  const ObjCaso = await Alimentacion_caso(), ObjDb = BaseDatos_obtenerCliente();
  const ObjPrimera = await Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId });
  await S.Alimentacion_editarRecetaConcentrado(ObjCaso.ObjReceta.recetaId, { ...ObjCaso.ObjRecetaDatos, nombre: "Receta editada", versionEsperada: 1 }, { IntUsuarioId });
  await ObjDb.inventarioProducto.update({ where: { productoId: ObjCaso.ObjMateria.productoId }, data: { nombre: "Nombre modificado" } });
  await Alimentacion_entrada(ObjCaso.ObjMateria.productoId, "100", "500");
  const ObjEntrada = { ...ObjCaso.ObjEntrada, versionReceta: 2 };
  const ObjPrevia = await S.Alimentacion_previsualizarElaboracion(ObjEntrada);
  const ObjSegunda = await Alimentacion_confirmarElaboracion({ ...ObjEntrada, claveIdempotencia: randomUUID(), huellaPrevisualizacion: ObjPrevia.huellaPrevisualizacion }, { IntUsuarioId });
  assert.notEqual(ObjSegunda.datos.loteInventarioId, ObjPrimera.datos.loteInventarioId);
  assert.notEqual(ObjSegunda.datos.costoUnitario, ObjPrimera.datos.costoUnitario);
  const ObjReintento = await Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId });
  assert.deepEqual(ObjReintento.datos, ObjPrimera.datos);
});
test("3B cantidades mayores que Number seguro y costos de 18 decimales persisten exactamente", async () => {
  const ObjCaso = await Alimentacion_caso(false), ObjDb = BaseDatos_obtenerCliente();
  await Alimentacion_entrada(ObjCaso.ObjMateria.productoId, "1", "1");
  const ObjFuente = await ObjDb.inventarioExistenciaLote.findFirstOrThrow({ where: { productoId: ObjCaso.ObjMateria.productoId } });
  const StrCantidad = "9007199254740993.123456", StrCosto = "0.000000000000000001";
  await ObjDb.$executeRaw`UPDATE dbo.inventario_existencias SET existencia_actual=CAST(${StrCantidad} AS DECIMAL(24,6)) WHERE inventario_producto_id=${ObjFuente.inventarioProductoId}`;
  await ObjDb.$executeRaw`UPDATE dbo.inventario_existencias_lotes SET existencia_actual=CAST(${StrCantidad} AS DECIMAL(24,6)) WHERE existencia_lote_id=${ObjFuente.existenciaLoteId}`;
  await ObjDb.$executeRaw`UPDATE dbo.inventario_lotes SET costo_unitario=CAST(${StrCosto} AS DECIMAL(38,18)) WHERE lote_inventario_id=${ObjFuente.loteInventarioId}`;
  await ObjDb.$executeRaw`UPDATE dbo.inventario_transacciones SET cantidad=CAST(${StrCantidad} AS DECIMAL(24,6)),costo_unitario=CAST(${StrCosto} AS DECIMAL(38,18)) WHERE existencia_lote_id=${ObjFuente.existenciaLoteId}`;
  await S.Alimentacion_editarRecetaConcentrado(ObjCaso.ObjReceta.recetaId, { ...ObjCaso.ObjRecetaDatos, cantidadBase: "1", versionEsperada: 1,
    detalles: [{ productoId: ObjCaso.ObjMateria.productoId, cantidad: "1", unidadMedida: "lb" }] }, { IntUsuarioId });
  const ObjEntrada = { ...ObjCaso.ObjEntrada, versionReceta: 2, cantidadTeorica: StrCantidad, cantidadReal: StrCantidad };
  const ObjPrevia = await S.Alimentacion_previsualizarElaboracion(ObjEntrada);
  const Obj = await Alimentacion_confirmarElaboracion({ ...ObjEntrada, claveIdempotencia: randomUUID(), huellaPrevisualizacion: ObjPrevia.huellaPrevisualizacion }, { IntUsuarioId });
  assert.equal(Obj.datos.cantidadRealBase, StrCantidad);
  assert.equal(Obj.datos.detalles[0]!.cantidadConsumida, StrCantidad);
  assert.equal(Obj.datos.costoTotal, "0.009007199254740993123456");
  assert.equal(Obj.datos.detalles[0]!.fuentes[0]!.costoUnitarioHistorico, StrCosto);
  const Arr = await ObjDb.$queryRaw<Array<{ cantidad: string; saldo: string }>>`
    SELECT CONVERT(NVARCHAR(100),t.cantidad) cantidad,CONVERT(NVARCHAR(100),e.existencia_actual) saldo
    FROM dbo.inventario_transacciones t JOIN dbo.inventario_existencias_lotes e ON e.existencia_lote_id=t.existencia_lote_id
    WHERE t.transaccion_inventario_id=${Obj.datos.transaccionIngresoId}`;
  assert.deepEqual(Arr, [{ cantidad: StrCantidad, saldo: StrCantidad }]);
});

test("3B merma usa cantidad real y persiste el residual firmado conciliado", async () => {
  const ObjCaso = await Alimentacion_caso();
  const ObjEntrada = { ...ObjCaso.ObjEntrada, cantidadReal: "7", motivoDiferencia: "Merma documentada de la prueba" };
  const ObjPrevia = await S.Alimentacion_previsualizarElaboracion(ObjEntrada);
  const Obj = await Alimentacion_confirmarElaboracion({ ...ObjEntrada, claveIdempotencia: randomUUID(), huellaPrevisualizacion: ObjPrevia.huellaPrevisualizacion }, { IntUsuarioId });
  const DecimalExacto = Prisma.Decimal.clone({ precision: 100 });
  assert.equal(new DecimalExacto(Obj.datos.costoUnitario).mul(Obj.datos.cantidadRealBase).add(Obj.datos.residualValoracion).toFixed(24), Obj.datos.costoTotal);
  assert.notEqual(Obj.datos.residualValoracion, "0.000000000000000000000000");
  assert.equal(Obj.datos.cantidadRealBase, "7.000000");
  assert.equal(Obj.datos.detalles[0]!.cantidadConsumida, "50.000000");
});

async function Alimentacion_casoReversion() {
  const ObjCaso = await Alimentacion_caso();
  const ObjConfirmada = await Alimentacion_confirmarElaboracion(ObjCaso.ObjSolicitud, { IntUsuarioId });
  return { ...ObjCaso, ObjConfirmada, IntId: ObjConfirmada.datos.elaboracionId };
}
test("3C reversión integral restaura fuentes originales y conserva importes/historia", async () => {
  const ObjCaso = await Alimentacion_caso(), ObjDb = BaseDatos_obtenerCliente();
  await ObjDb.$executeRaw`UPDATE dbo.inventario_lotes SET costo_unitario=CAST(N'1.123456789123456789' AS DECIMAL(38,18)) WHERE producto_id=${ObjCaso.ObjMateria.productoId}`;
  const ObjPrevia = await S.Alimentacion_previsualizarElaboracion(ObjCaso.ObjEntrada);
  const ObjC = await Alimentacion_confirmarElaboracion({ ...ObjCaso.ObjSolicitud, huellaPrevisualizacion: ObjPrevia.huellaPrevisualizacion }, { IntUsuarioId });
  const ArrOriginales = await ObjDb.inventarioTransaccion.findMany({ where: { documentoReferencia: ObjCaso.ObjSolicitud.claveIdempotencia }, orderBy: { transaccionInventarioId: "asc" } });
  const ArrCostos = await ObjDb.$queryRaw`SELECT lote_inventario_id,CONVERT(NVARCHAR(100),costo_unitario) costo FROM dbo.inventario_lotes ORDER BY lote_inventario_id`;
  const ObjConsulta = await V.Alimentacion_consultarDependencias(ObjC.datos.elaboracionId, { IntUsuarioId });
  assert.equal(ObjConsulta.reversible, true);
  const ObjR = await V.Alimentacion_revertirElaboracion(ObjC.datos.elaboracionId, { motivo: "Corrección integral" }, { IntUsuarioId });
  assert.equal(ObjR.datos.estado, "REVERTIDA"); assert.equal(ObjR.movimientosReversion.length, 4);
  assert.equal(ObjR.datos.costoTotal, ObjC.datos.costoTotal); assert.equal(ObjR.datos.residualValoracion, ObjC.datos.residualValoracion);
  assert.deepEqual(await ObjDb.inventarioTransaccion.findMany({ where: { documentoReferencia: ObjCaso.ObjSolicitud.claveIdempotencia }, orderBy: { transaccionInventarioId: "asc" } }), ArrOriginales);
  assert.deepEqual(await ObjDb.$queryRaw`SELECT lote_inventario_id,CONVERT(NVARCHAR(100),costo_unitario) costo FROM dbo.inventario_lotes ORDER BY lote_inventario_id`, ArrCostos);
  const ArrComp = await ObjDb.$queryRaw<Array<{ original: string; cantidad: string; costoOriginal: string; costo: string }>>`
    SELECT CONVERT(NVARCHAR(100),o.cantidad) original,CONVERT(NVARCHAR(100),r.cantidad) cantidad,
      CONVERT(NVARCHAR(100),o.costo_unitario) costoOriginal,CONVERT(NVARCHAR(100),r.costo_unitario) costo
    FROM dbo.inventario_transacciones r JOIN dbo.inventario_transacciones o ON o.transaccion_inventario_id=r.transaccion_revertida_id
    WHERE o.documento_referencia=${ObjCaso.ObjSolicitud.claveIdempotencia}`;
  assert.equal(ArrComp.length, 4);
  for (const Obj of ArrComp) { assert.equal(new Prisma.Decimal(Obj.original).negated().toFixed(6), Obj.cantidad); assert.equal(Obj.costoOriginal, Obj.costo); }
  const ArrSaldos = await ObjDb.inventarioExistenciaLote.findMany({ where: { productoId: ObjCaso.ObjMateria.productoId }, orderBy: { existenciaLoteId: "asc" } });
  assert.deepEqual(ArrSaldos.map(Obj => Obj.existenciaActual.toString()), ["20", "10", "30"]);
  assert.equal((await ObjDb.inventarioExistenciaLote.findUniqueOrThrow({ where: { existenciaLoteId: ObjC.datos.existenciaDestinoId } })).existenciaActual.toString(), "0");
  assert.equal((await ObjDb.inventarioLote.findUniqueOrThrow({ where: { loteInventarioId: ObjC.datos.loteInventarioId } })).activo, false);
  await assert.rejects(I.Inventario_revertirMovimiento(ObjC.datos.transaccionIngresoId, IntUsuarioId), /ya fue revertido/);
});
test("3C Alimentación bloquea la reversión hasta revertir explícitamente su consumo", async () => {
  const ObjCaso = await Alimentacion_casoReversion(), ObjDb = BaseDatos_obtenerCliente();
  const ObjTipo = await Produccion.Produccion_crearTipo({ nombre: `Tipo 3C ${++IntCaso}`, IntUsuarioId });
  const ObjLote = await Produccion.Produccion_crearLote({ tipoAnimalId: ObjTipo.tipoAnimalId, codigo: `3C-P-${IntCaso}`, nombre: "Destino", IntUsuarioId });
  const ObjInicial = await Produccion.Produccion_registrarInicial({ loteDestinoId: ObjLote.loteProduccionId, animales: [{ identificacion: `3C-A-${IntCaso}`, tipoAnimalId: ObjTipo.tipoAnimalId, sexo: "HEMBRA" }], IntUsuarioId });
  await ObjDb.alimentacionProductoHabilitado.create({ data: { productoId: ObjCaso.ObjProducto.productoId } });
  const ObjConsumo = await Alimentacion.Alimentacion_registrar({ destino: { tipo: "ANIMAL", animalId: ObjInicial.animales[0]!.animalId },
    fechaEfectiva: ObjCaso.ObjEntrada.fechaEfectiva, detalles: [{ productoId: ObjCaso.ObjProducto.productoId, inventarioId: IntAlmacenId, loteInventarioId: ObjCaso.ObjConfirmada.datos.loteInventarioId, cantidad: "10" }], IntUsuarioId });
  const ObjAntes = await Alimentacion_foto();
  const ObjConsulta = await V.Alimentacion_consultarDependencias(ObjCaso.IntId, { IntUsuarioId });
  assert.equal(ObjConsulta.dependencias[0]!.alimentacionId, ObjConsumo.alimentacionId);
  await assert.rejects(V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Bloqueada" }, { IntUsuarioId }), Obj => Obj instanceof V.AlimentacionReversionBloqueada && Obj.ObjDiagnostico.dependencias.length === 1);
  assert.deepEqual(await Alimentacion_foto(), ObjAntes);
  await Alimentacion.Alimentacion_revertir(ObjConsumo.alimentacionId, "Resolver dependencia", IntUsuarioId);
  assert.equal((await V.Alimentacion_consultarDependencias(ObjCaso.IntId, { IntUsuarioId })).reversible, true);
  assert.equal((await V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Dependencia resuelta" }, { IntUsuarioId })).datos.estado, "REVERTIDA");
});
test("3C otra elaboración bloquea; resolver hija no revierte automáticamente la madre", async () => {
  const ObjMadre = await Alimentacion_casoReversion(), ObjProducto = await Alimentacion_producto(true);
  const ObjReceta = await S.Alimentacion_crearRecetaConcentrado({ concentradoId: ObjProducto.concentradoId, nombre: "Hija", cantidadBase: "100", unidadBase: "lb",
    detalles: [{ productoId: ObjMadre.ObjProducto.productoId, cantidad: "10", unidadMedida: "lb" }] }, { IntUsuarioId });
  const ObjEntrada = { ...ObjMadre.ObjEntrada, recetaId: ObjReceta.recetaId };
  const ObjPrevia = await S.Alimentacion_previsualizarElaboracion(ObjEntrada);
  const ObjHija = await Alimentacion_confirmarElaboracion({ ...ObjEntrada, claveIdempotencia: randomUUID(), huellaPrevisualizacion: ObjPrevia.huellaPrevisualizacion }, { IntUsuarioId });
  assert.equal((await V.Alimentacion_consultarDependencias(ObjMadre.IntId, { IntUsuarioId })).dependencias[0]!.elaboracionId, ObjHija.datos.elaboracionId);
  await assert.rejects(V.Alimentacion_revertirElaboracion(ObjMadre.IntId, { motivo: "Bloqueada" }, { IntUsuarioId }), Alimentacion_esConflicto);
  await V.Alimentacion_revertirElaboracion(ObjHija.datos.elaboracionId, { motivo: "Resolver hija" }, { IntUsuarioId });
  assert.equal((await BaseDatos_obtenerCliente().alimentacionElaboracion.findUniqueOrThrow({ where: { elaboracionId: ObjMadre.IntId } })).estado, "CONFIRMADA");
  assert.equal((await V.Alimentacion_revertirElaboracion(ObjMadre.IntId, { motivo: "Resolver madre" }, { IntUsuarioId })).datos.estado, "REVERTIDA");
});
test("3C transferencias y ajustes pendientes bloquean aunque se consulte después", async () => {
  const ObjCaso = await Alimentacion_casoReversion();
  const ObjTransferencia = await I.Inventario_registrarTransferencia({ productoId: ObjCaso.ObjProducto.productoId, inventarioOrigenId: IntAlmacenId, inventarioDestinoId: IntOtroAlmacenId,
    loteInventarioId: ObjCaso.ObjConfirmada.datos.loteInventarioId, cantidad: "20", IntUsuarioId });
  const ObjAjuste = await I.Inventario_registrarAjuste({ subtipo: "CONTEO_FISICO", productoId: ObjCaso.ObjProducto.productoId, inventarioId: IntAlmacenId,
    loteInventarioId: ObjCaso.ObjConfirmada.datos.loteInventarioId, cantidad: "5", motivo: "Conteo temporal", IntUsuarioId });
  const ObjConsulta = await V.Alimentacion_consultarDependencias(ObjCaso.IntId, { IntUsuarioId });
  assert.equal(ObjConsulta.dependencias.length, 3); assert.equal(ObjConsulta.ubicaciones.length, 2);
  await assert.rejects(V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Bloqueada" }, { IntUsuarioId }), Alimentacion_esConflicto);
  await I.Inventario_revertirMovimiento(ObjAjuste.transaccionInventarioId, IntUsuarioId);
  await I.Inventario_revertirTransferencia(ObjTransferencia.transferenciaId, IntUsuarioId);
  assert.equal((await V.Alimentacion_consultarDependencias(ObjCaso.IntId, { IntUsuarioId })).dependencias.length, 0);
  assert.equal((await V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Dependencias resueltas" }, { IntUsuarioId })).datos.estado, "REVERTIDA");
});
test("3C ajustes de saldo neto cero siguen bloqueando sin reversión vinculada", async () => {
  const ObjCaso = await Alimentacion_casoReversion();
  for (const cantidad of ["5", "-5"]) await I.Inventario_registrarAjuste({ subtipo: "CONTEO_FISICO", productoId: ObjCaso.ObjProducto.productoId, inventarioId: IntAlmacenId,
    loteInventarioId: ObjCaso.ObjConfirmada.datos.loteInventarioId, cantidad, motivo: "Conteo temporal", IntUsuarioId });
  const ObjConsulta = await V.Alimentacion_consultarDependencias(ObjCaso.IntId, { IntUsuarioId });
  assert.equal(ObjConsulta.ubicaciones[0]!.cantidad, "100.000000"); assert.equal(ObjConsulta.dependencias.length, 2);
  await assert.rejects(V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Sin cascada" }, { IntUsuarioId }), Alimentacion_esConflicto);
});
test("3C exige lote completo incluso si faltan movimientos que expliquen el saldo", async () => {
  const ObjCaso = await Alimentacion_casoReversion(), ObjDb = BaseDatos_obtenerCliente();
  await ObjDb.$executeRaw`UPDATE dbo.inventario_existencias_lotes SET existencia_actual=99 WHERE existencia_lote_id=${ObjCaso.ObjConfirmada.datos.existenciaDestinoId}`;
  const ObjAntes = await Alimentacion_foto();
  await assert.rejects(V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Inconsistencia temporal" }, { IntUsuarioId }), Obj => Obj instanceof V.AlimentacionReversionBloqueada && Obj.ObjDiagnostico.bloqueos.some(ObjB => ObjB.codigo === "ELABORACION_LOTE_NO_DISPONIBLE"));
  assert.deepEqual(await Alimentacion_foto(), ObjAntes);
});
test("3C simultáneas y reintentos restituyen una sola vez y conservan primer motivo", async () => {
  const ObjCaso = await Alimentacion_casoReversion();
  const Arr = await Promise.all([V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Primero" }, { IntUsuarioId }), V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Segundo" }, { IntUsuarioId })]);
  assert.deepEqual(Arr.map(Obj => Obj.reutilizada).sort(), [false, true]); assert.deepEqual(Arr[0]!.datos, Arr[1]!.datos);
  assert.deepEqual(Arr[0]!.movimientosReversion, Arr[1]!.movimientosReversion);
  const ObjAntes = await Alimentacion_foto();
  const ObjReintento = await V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Otro motivo no sobrescribe" }, { IntUsuarioId });
  assert.equal(ObjReintento.reutilizada, true); assert.deepEqual(ObjReintento.datos, Arr[0]!.datos); assert.deepEqual(await Alimentacion_foto(), ObjAntes);
});
test("3C fallo SQL durante restitución revierte retirada, restituciones, bitácoras y estado", async () => {
  const ObjCaso = await Alimentacion_casoReversion(), ObjDb = BaseDatos_obtenerCliente();
  const IntFallo = ObjCaso.ObjConfirmada.datos.detalles[0]!.fuentes[1]!.transaccionConsumoId;
  await BaseDatos_exigirBaseActual(ObjBase!.StrNombre);
  await ObjDb.$executeRawUnsafe(`CREATE TRIGGER dbo.prueba_3c_fallo ON dbo.inventario_transacciones AFTER INSERT AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted WHERE transaccion_revertida_id=${IntFallo}) THROW 51000,N'FALLO_RESTITUCION_3C',1; END`);
  try {
    const ObjAntes = await Alimentacion_foto();
    await assert.rejects(V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Prueba fallo" }, { IntUsuarioId }), /FALLO_RESTITUCION_3C/);
    assert.deepEqual(await Alimentacion_foto(), ObjAntes);
  } finally { await BaseDatos_exigirBaseActual(ObjBase!.StrNombre); await ObjDb.$executeRaw`DROP TRIGGER dbo.prueba_3c_fallo`; }
  assert.equal((await V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Reintento válido" }, { IntUsuarioId })).datos.estado, "REVERTIDA");
});
test("3C materias primas vencidas e inactivas recuperan saldo sin habilitarse", async () => {
  const ObjCaso = await Alimentacion_casoReversion(), ObjDb = BaseDatos_obtenerCliente();
  await ObjDb.inventarioLote.updateMany({ where: { productoId: ObjCaso.ObjMateria.productoId }, data: { fechaVencimiento: Fecha_parsearFechaCivil("2000-01-01"), activo: false } });
  await V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Restituir manteniendo restricciones" }, { IntUsuarioId });
  const Arr = await ObjDb.inventarioLote.findMany({ where: { productoId: ObjCaso.ObjMateria.productoId } });
  assert.equal(Arr.every(Obj => !Obj.activo && Obj.fechaVencimiento?.getUTCFullYear() === 2000), true);
  assert.equal((await S.Alimentacion_previsualizarElaboracion(ObjCaso.ObjEntrada)).disponible, false);
});
test("3C concurrencia entre retirada del lote y consumo no deja movimientos parciales", async () => {
  const ObjCaso = await Alimentacion_casoReversion(), ObjDb = BaseDatos_obtenerCliente();
  const Arr = await Promise.allSettled([V.Alimentacion_revertirElaboracion(ObjCaso.IntId, { motivo: "Competencia" }, { IntUsuarioId }),
    I.Inventario_registrarSalida({ subtipo: "MERMA", productoId: ObjCaso.ObjProducto.productoId, inventarioId: IntAlmacenId, loteInventarioId: ObjCaso.ObjConfirmada.datos.loteInventarioId, cantidad: "1", motivo: "Competencia", IntUsuarioId })]);
  assert.equal(Arr.filter(Obj => Obj.status === "fulfilled").length, 1);
  const ObjEstado = await ObjDb.alimentacionElaboracion.findUniqueOrThrow({ where: { elaboracionId: ObjCaso.IntId } });
  const IntCompensaciones = await ObjDb.inventarioTransaccion.count({ where: { documentoReferencia: `ELABORACION-REVERSION-${ObjCaso.IntId}` } });
  assert.equal(IntCompensaciones, ObjEstado.estado === "REVERTIDA" ? 4 : 0);
  assert.equal(await ObjDb.inventarioExistenciaLote.count({ where: { existenciaActual: { lt: 0 } } }), 0);
});
test("3C diagnóstico acotado reproduce SQL Server 1205 en una tabla temporal aislada", async () => {
  const ObjDb = BaseDatos_obtenerCliente();
  await BaseDatos_exigirBaseActual(ObjBase!.StrNombre);
  await ObjDb.$executeRaw`CREATE TABLE dbo.prueba_3c_deadlock (id INT PRIMARY KEY, valor INT NOT NULL)`;
  await ObjDb.$executeRaw`INSERT INTO dbo.prueba_3c_deadlock(id,valor) VALUES(1,0),(2,0)`;
  try {
    const Alimentacion_ciclo = (IntPrimero: number, IntSegundo: number) => ObjDb.$queryRaw<Array<{ numero: number }>>`
      BEGIN TRY
        BEGIN TRAN;
        UPDATE dbo.prueba_3c_deadlock WITH (ROWLOCK) SET valor=valor+1 WHERE id=${IntPrimero};
        WAITFOR DELAY '00:00:01';
        UPDATE dbo.prueba_3c_deadlock WITH (ROWLOCK) SET valor=valor+1 WHERE id=${IntSegundo};
        COMMIT; SELECT 0 numero;
      END TRY BEGIN CATCH
        IF @@TRANCOUNT>0 ROLLBACK;
        SELECT ERROR_NUMBER() numero;
      END CATCH`;
    const Arr = await Promise.all([Alimentacion_ciclo(1, 2), Alimentacion_ciclo(2, 1)]);
    assert.deepEqual(Arr.flat().map(Obj => Obj.numero).sort((IntA, IntB) => IntA - IntB), [0, 1205]);
    const ArrSaldos = await ObjDb.$queryRaw<Array<{ valor: number }>>`SELECT valor FROM dbo.prueba_3c_deadlock ORDER BY id`;
    assert.deepEqual(ArrSaldos.map(Obj => Obj.valor), [1, 1]);
  } finally { await BaseDatos_exigirBaseActual(ObjBase!.StrNombre); await ObjDb.$executeRaw`DROP TABLE dbo.prueba_3c_deadlock`; }
});
