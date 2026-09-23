import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { randomBytes } from "node:crypto";
import { Prisma } from "../../../../generated/prisma/client.js";
import { BaseDatos_exigirBaseActual, BaseDatos_obtenerCliente } from "../../../database/prisma.js";
import { PruebasBaseDatos_crearTemporalConcentrados } from "../../../testing/concentrados-base-temporal.js";
import { Usuarios_ejecutarBootstrap } from "../../../scripts/bootstrap-usuarios.js";
import { Fecha_obtenerAhoraGuatemala } from "../../../datetime/fecha.js";
import { Inventario_ejecutarSerializable, Inventario_registrarEntradaConLoteConTx } from "../../inventario/inventario.repository.js";
import * as S from "./concentrados.service.js";
import * as I from "../../inventario/inventario.service.js";
import { ErrorAplicacion } from "../../../errors/error-aplicacion.js";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { Autenticacion_hashearContrasena, Autenticacion_hashearTokenSesion } from "../../../auth/autenticacion.js";
import { Fecha_calcularExpiracionGuatemala, Fecha_obtenerInstanteActual } from "../../../datetime/fecha.js";

let ObjBase: Awaited<ReturnType<typeof PruebasBaseDatos_crearTemporalConcentrados>> | undefined;
let IntUsuarioId: number, IntProductoId: number, IntConcentradoId: number, IntAlmacenId: number;
let IntCaso = 0;
async function Alimentacion_productoPrueba(BoolClasificar = true, StrUnidad = "lb") {
  const ObjDb = BaseDatos_obtenerCliente();
  const ObjCategoria = await ObjDb.inventarioCategoria.findFirstOrThrow({ where: { nombre: "Concentrados prueba" } });
  const ObjProducto = await ObjDb.inventarioProducto.create({ data: { codigo: `CONC-P-${++IntCaso}`, nombre: `Producto ${IntCaso}`, categoriaId: ObjCategoria.categoriaId, unidadMedida: StrUnidad } });
  const ObjConcentrado = BoolClasificar ? await S.Alimentacion_clasificarConcentrado(ObjProducto.productoId, { IntUsuarioId }) : null;
  return { IntProductoId: ObjProducto.productoId, IntConcentradoId: ObjConcentrado?.concentradoId ?? 0 };
}
function Alimentacion_recetaEntrada(IntConcentrado: number, ArrIngredientes: number[]) {
  return { concentradoId: IntConcentrado, nombre: "Receta prueba", cantidadBase: "100", unidadBase: "lb" as const,
    detalles: ArrIngredientes.map(productoId => ({ productoId, cantidad: "50", unidadMedida: "lb" as const })) };
}

before(async () => {
  // Se verifica contenedor y autoridad de la URL ANTES de conectar/crear/migrar.
  ObjBase = await PruebasBaseDatos_crearTemporalConcentrados();
  await BaseDatos_exigirBaseActual(ObjBase.StrNombre);
  process.env.BOOTSTRAP_WEBMASTER_NOMBRE_COMPLETO = "Pruebas Concentrados";
  process.env.BOOTSTRAP_WEBMASTER_USUARIO = "concentrados_test";
  process.env.BOOTSTRAP_WEBMASTER_CORREO = "concentrados@example.invalid";
  process.env.BOOTSTRAP_WEBMASTER_CONTRASENA = randomBytes(24).toString("base64url");
  await Usuarios_ejecutarBootstrap();
  const ObjDb = BaseDatos_obtenerCliente();
  IntUsuarioId = (await ObjDb.usuarioCuenta.findUniqueOrThrow({ where: { nombreUsuario: "concentrados_test" } })).usuarioId;
  const ObjCategoria = await ObjDb.inventarioCategoria.create({ data: { nombre: "Concentrados prueba" } });
  IntProductoId = (await ObjDb.inventarioProducto.create({ data: { codigo: "CONC-TEST", nombre: "Concentrado", categoriaId: ObjCategoria.categoriaId, unidadMedida: "lb" } })).productoId;
  IntAlmacenId = (await ObjDb.inventarioAlmacen.create({ data: { codigo: "CONC-ALM", nombre: "Temporal" } })).inventarioId;
  const DtAhora = Fecha_obtenerAhoraGuatemala();
  IntConcentradoId = (await ObjDb.alimentacionConcentrado.create({ data: { productoId: IntProductoId, usuarioId: IntUsuarioId, fechaCreacion: DtAhora, fechaActualizacion: DtAhora } })).concentradoId;
});
after(async () => { await ObjBase?.eliminar(); });

test("migración crea seis tablas y restricciones habilitadas y verificadas", async () => {
  const ObjDb = BaseDatos_obtenerCliente();
  const ArrTablas = await ObjDb.$queryRaw<Array<{ nombre: string }>>`
    SELECT name nombre FROM sys.tables WHERE name IN (
      N'alimentacion_concentrados',N'alimentacion_recetas_concentrados',N'alimentacion_recetas_concentrados_detalles',
      N'alimentacion_elaboraciones',N'alimentacion_elaboraciones_detalles',N'alimentacion_elaboraciones_fuentes')`;
  assert.equal(ArrTablas.length, 6);
  const ArrInvalidas = await ObjDb.$queryRaw<Array<{ nombre: string }>>`
    SELECT name nombre FROM sys.check_constraints
    WHERE (name LIKE N'CK_concentrados_%' OR name LIKE N'CK_elaboraciones_%')
      AND (is_disabled=1 OR is_not_trusted=1)`;
  assert.equal(ArrInvalidas.length, 0);
  const ArrClaves = await ObjDb.$queryRaw<Array<{ nombre: string; deshabilitada: boolean; noVerificada: boolean }>>`
    SELECT name nombre, is_disabled deshabilitada, is_not_trusted noVerificada FROM sys.foreign_keys
    WHERE parent_object_id IN (SELECT object_id FROM sys.tables WHERE name IN (
      N'alimentacion_concentrados',N'alimentacion_recetas_concentrados',N'alimentacion_recetas_concentrados_detalles',
      N'alimentacion_elaboraciones',N'alimentacion_elaboraciones_detalles',N'alimentacion_elaboraciones_fuentes'))`;
  assert.equal(ArrClaves.length, 20);
  assert.equal(ArrClaves.some(Obj => Obj.deshabilitada || Obj.noVerificada), false);
  const ArrTipos = await ObjDb.$queryRaw<Array<{ columna: string; precision: number; escala: number }>>`
    SELECT name columna, precision, scale escala FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.alimentacion_elaboraciones')
      AND name IN (N'cantidad_real_base',N'costo_total',N'costo_unitario',N'residual_valoracion')`;
  assert.deepEqual(ArrTipos.map(Obj => [Obj.columna, Obj.precision, Obj.escala]).sort(), [
    ["cantidad_real_base",24,6],["costo_total",38,24],["costo_unitario",38,18],["residual_valoracion",38,24],
  ].sort());
  const ArrIndices = await ObjDb.$queryRaw<Array<{ nombre: string }>>`
    SELECT name nombre FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.alimentacion_elaboraciones') AND is_unique=1`;
  for (const StrCampo of ["clave_idempotencia", "transaccion_ingreso_id", "lote_inventario_id"]) assert.ok(ArrIndices.some(Obj => Obj.nombre.includes(StrCampo)));
  const ArrPermisos = await ObjDb.usuarioPermiso.findMany({ where: { codigo: { in: ["ALIMENTACION_CONCENTRADOS_CONSULTAR", "ALIMENTACION_RECETAS_GESTIONAR", "ALIMENTACION_ELABORACIONES_REGISTRAR", "ALIMENTACION_ELABORACIONES_CONSULTAR", "ALIMENTACION_ELABORACIONES_REVERTIR"] } } });
  assert.equal(ArrPermisos.length, 5);
});

test("persistir receta no modifica inventario; SQL impide cantidad cero y producto incongruente", async () => {
  const ObjDb = BaseDatos_obtenerCliente(), DtAhora = Fecha_obtenerAhoraGuatemala();
  const IntAntes = await ObjDb.inventarioTransaccion.count();
  const ObjDatos = { concentradoId: IntConcentradoId, productoId: IntProductoId, nombre: "Receta", cantidadBase: "100", unidadBase: "lb",
    usuarioId: IntUsuarioId, usuarioActualizacionId: IntUsuarioId, fechaCreacion: DtAhora, fechaActualizacion: DtAhora };
  await ObjDb.alimentacionRecetaConcentrado.create({ data: ObjDatos });
  assert.equal(await ObjDb.inventarioTransaccion.count(), IntAntes);
  assert.equal(await ObjDb.inventarioExistencia.count({ where: { productoId: IntProductoId } }), 0);
  await assert.rejects(ObjDb.alimentacionRecetaConcentrado.create({ data: { ...ObjDatos, cantidadBase: "0" } }));
  await assert.rejects(ObjDb.alimentacionRecetaConcentrado.create({ data: { ...ObjDatos, productoId: 2147483647 } }));
  await assert.rejects(ObjDb.alimentacionConcentrado.create({ data: { productoId: IntProductoId, usuarioId: IntUsuarioId, fechaCreacion: DtAhora, fechaActualizacion: DtAhora } }));
});

test("fallo posterior a entrada ConTx revierte lote, saldos, movimiento y bitácora", async () => {
  const ObjDb = BaseDatos_obtenerCliente();
  const ArrAntes = await Promise.all([ObjDb.inventarioLote.count(), ObjDb.inventarioTransaccion.count(), ObjDb.usuarioBitacora.count(), ObjDb.inventarioExistencia.count(), ObjDb.inventarioExistenciaLote.count()]);
  await assert.rejects(Inventario_ejecutarSerializable(async ObjTx => {
    await Inventario_registrarEntradaConLoteConTx(ObjTx, { subtipo: "ELABORACION_INGRESO", productoId: IntProductoId,
      inventarioId: IntAlmacenId, cantidadComercial: new Prisma.Decimal("3"), unidadComercial: "lb",
      cantidadBase: new Prisma.Decimal("3"), unidadBase: "lb", factorConversion: new Prisma.Decimal("1"),
      costoUnitario: new Prisma.Decimal("0.333333333333333333"), precioTotalIngreso: null, IntUsuarioId });
    throw new Error("FALLO_POSTERIOR_CONTROLADO");
  }), /FALLO_POSTERIOR_CONTROLADO/);
  assert.deepEqual(await Promise.all([ObjDb.inventarioLote.count(), ObjDb.inventarioTransaccion.count(), ObjDb.usuarioBitacora.count(), ObjDb.inventarioExistencia.count(), ObjDb.inventarioExistenciaLote.count()]), ArrAntes);
});

test("clasificar conserva historia y bloquea nuevos ingresos incluso estando inactivo", async () => {
  const ObjProducto = await Alimentacion_productoPrueba(false);
  const ObjEntrada = { subtipo: "INVENTARIO_INICIAL" as const, productoId: ObjProducto.IntProductoId, inventarioId: IntAlmacenId,
    cantidadComercial: "10", unidadComercial: "lb", precioTotalIngreso: "25", IntUsuarioId };
  await I.Inventario_registrarEntrada(ObjEntrada);
  const ObjDb = BaseDatos_obtenerCliente();
  const ArrAntes = await ObjDb.inventarioTransaccion.findMany({ where: { existencia: { productoId: ObjProducto.IntProductoId } } });
  const ObjConcentrado = await S.Alimentacion_clasificarConcentrado(ObjProducto.IntProductoId, { IntUsuarioId });
  await assert.rejects(S.Alimentacion_clasificarConcentrado(ObjProducto.IntProductoId, { IntUsuarioId }), /ya está clasificado/);
  await assert.rejects(I.Inventario_registrarEntrada(ObjEntrada), /solo admite/);
  await S.Alimentacion_cambiarEstadoConcentrado(ObjConcentrado.concentradoId, false, { IntUsuarioId });
  await assert.rejects(I.Inventario_registrarEntrada(ObjEntrada), /solo admite/);
  assert.deepEqual(await ObjDb.inventarioTransaccion.findMany({ where: { existencia: { productoId: ObjProducto.IntProductoId } } }), ArrAntes);
  assert.equal((await ObjDb.inventarioExistencia.findUniqueOrThrow({ where: { inventarioId_productoId: { inventarioId: IntAlmacenId, productoId: ObjProducto.IntProductoId } } })).existenciaActual.toString(), "10");
});

test("clasificación rechaza producto ausente, inactivo o sin masa", async () => {
  await assert.rejects(S.Alimentacion_clasificarConcentrado(2147483647, { IntUsuarioId }), /no existe/);
  const ObjVolumen = await Alimentacion_productoPrueba(false, "L");
  await assert.rejects(S.Alimentacion_clasificarConcentrado(ObjVolumen.IntProductoId, { IntUsuarioId }), /masa/);
  const ObjInactivo = await Alimentacion_productoPrueba(false);
  await BaseDatos_obtenerCliente().inventarioProducto.update({ where: { productoId: ObjInactivo.IntProductoId }, data: { activo: false } });
  await assert.rejects(S.Alimentacion_clasificarConcentrado(ObjInactivo.IntProductoId, { IntUsuarioId }), /activo/);
});

test("recetas crean, consultan, editan y cambian estado sin movimientos; versiones obsoletas fallan", async () => {
  const ObjDestino = await Alimentacion_productoPrueba(), ObjIngrediente = await Alimentacion_productoPrueba(false);
  const ObjDb = BaseDatos_obtenerCliente(), IntMovimientos = await ObjDb.inventarioTransaccion.count();
  const ObjEntrada = Alimentacion_recetaEntrada(ObjDestino.IntConcentradoId, [ObjIngrediente.IntProductoId]);
  const ObjReceta = await S.Alimentacion_crearRecetaConcentrado(ObjEntrada, { IntUsuarioId });
  const ObjDetalle = await S.Alimentacion_obtenerReceta(ObjReceta.recetaId);
  assert.equal(ObjDetalle.detalles.length, 1);
  const ObjEditada = await S.Alimentacion_editarRecetaConcentrado(ObjReceta.recetaId, { ...ObjEntrada, nombre: "Editada", versionEsperada: 1 }, { IntUsuarioId });
  assert.equal(ObjEditada.version, 2);
  await assert.rejects(S.Alimentacion_editarRecetaConcentrado(ObjReceta.recetaId, { ...ObjEntrada, versionEsperada: 1 }, { IntUsuarioId }), Obj => Obj instanceof ErrorAplicacion && Obj.IntEstadoHttp === 409);
  await S.Alimentacion_cambiarEstadoReceta(ObjReceta.recetaId, 2, false, { IntUsuarioId });
  const ObjActiva = await S.Alimentacion_cambiarEstadoReceta(ObjReceta.recetaId, 3, true, { IntUsuarioId });
  assert.equal(ObjActiva.version, 4);
  assert.equal((await S.Alimentacion_listarRecetas({ pagina: 1, limite: 20, concentradoId: ObjDestino.IntConcentradoId })).datos.length, 1);
  assert.equal(await ObjDb.inventarioTransaccion.count(), IntMovimientos);
});

test("ciclos directos, indirectos, edición y recetas inactivas se rechazan", async () => {
  const ObjA = await Alimentacion_productoPrueba(), ObjB = await Alimentacion_productoPrueba(), ObjC = await Alimentacion_productoPrueba();
  await assert.rejects(S.Alimentacion_crearRecetaConcentrado(Alimentacion_recetaEntrada(ObjA.IntConcentradoId, [ObjA.IntProductoId]), { IntUsuarioId }), /circulares/);
  const ObjAB = await S.Alimentacion_crearRecetaConcentrado(Alimentacion_recetaEntrada(ObjA.IntConcentradoId, [ObjB.IntProductoId]), { IntUsuarioId });
  await S.Alimentacion_cambiarEstadoReceta(ObjAB.recetaId, 1, false, { IntUsuarioId });
  const ObjBC = await S.Alimentacion_crearRecetaConcentrado(Alimentacion_recetaEntrada(ObjB.IntConcentradoId, [ObjC.IntProductoId]), { IntUsuarioId });
  await assert.rejects(S.Alimentacion_crearRecetaConcentrado(Alimentacion_recetaEntrada(ObjC.IntConcentradoId, [ObjA.IntProductoId]), { IntUsuarioId }), /circulares/);
  await assert.rejects(S.Alimentacion_editarRecetaConcentrado(ObjBC.recetaId, { ...Alimentacion_recetaEntrada(ObjB.IntConcentradoId, [ObjA.IntProductoId]), versionEsperada: 1 }, { IntUsuarioId }), /circulares/);
  assert.equal((await S.Alimentacion_obtenerReceta(ObjBC.recetaId)).version, 1);
});

test("dos recetas concurrentes no pueden completar un ciclo", async () => {
  const ObjA = await Alimentacion_productoPrueba(), ObjB = await Alimentacion_productoPrueba();
  const ArrResultados = await Promise.allSettled([
    S.Alimentacion_crearRecetaConcentrado(Alimentacion_recetaEntrada(ObjA.IntConcentradoId, [ObjB.IntProductoId]), { IntUsuarioId }),
    S.Alimentacion_crearRecetaConcentrado(Alimentacion_recetaEntrada(ObjB.IntConcentradoId, [ObjA.IntProductoId]), { IntUsuarioId }),
  ]);
  assert.equal(ArrResultados.filter(Obj => Obj.status === "fulfilled").length, 1);
  assert.equal(ArrResultados.filter(Obj => Obj.status === "rejected").length, 1);
});

test("dos ediciones con la misma versión solo permiten una confirmación", async () => {
  const ObjA = await Alimentacion_productoPrueba(), ObjB = await Alimentacion_productoPrueba(false);
  const ObjEntrada = Alimentacion_recetaEntrada(ObjA.IntConcentradoId, [ObjB.IntProductoId]);
  const ObjReceta = await S.Alimentacion_crearRecetaConcentrado(ObjEntrada, { IntUsuarioId });
  const ArrResultados = await Promise.allSettled(["Primera", "Segunda"].map(nombre => S.Alimentacion_editarRecetaConcentrado(ObjReceta.recetaId, { ...ObjEntrada, nombre, versionEsperada: 1 }, { IntUsuarioId })));
  assert.equal(ArrResultados.filter(Obj => Obj.status === "fulfilled").length, 1);
  assert.equal((await S.Alimentacion_obtenerReceta(ObjReceta.recetaId)).version, 2);
});

test("recetas preservan los seis decimales incluso por encima de Number seguro", async () => {
  const ObjA = await Alimentacion_productoPrueba(), ObjB = await Alimentacion_productoPrueba(false);
  const ObjEntrada = { ...Alimentacion_recetaEntrada(ObjA.IntConcentradoId, [ObjB.IntProductoId]), cantidadBase: "9007199254740993.123456",
    detalles: [{ productoId: ObjB.IntProductoId, cantidad: "9007199254740993.123456", unidadMedida: "lb" as const }] };
  const ObjReceta = await S.Alimentacion_crearRecetaConcentrado(ObjEntrada, { IntUsuarioId });
  assert.equal(ObjReceta.cantidadBase.toString(), ObjEntrada.cantidadBase);
  const ObjGuardada = await S.Alimentacion_obtenerReceta(ObjReceta.recetaId);
  assert.equal(ObjGuardada.cantidadBase.toString(), ObjEntrada.cantidadBase);
  assert.equal(ObjGuardada.detalles[0]?.cantidad.toString(), ObjEntrada.cantidadBase);
  const StrMaximo = "999999999999999999.999999";
  await S.Alimentacion_editarRecetaConcentrado(ObjReceta.recetaId, { ...ObjEntrada, versionEsperada: 1, cantidadBase: StrMaximo,
    detalles: [{ productoId: ObjB.IntProductoId, cantidad: StrMaximo, unidadMedida: "lb" }] }, { IntUsuarioId });
  const ObjListado = await S.Alimentacion_listarRecetas({ pagina: 1, limite: 20, concentradoId: ObjA.IntConcentradoId });
  assert.equal(ObjListado.datos[0]?.cantidadBase.toString(), StrMaximo);
  assert.equal(ObjListado.datos[0]?.detalles[0]?.cantidad.toString(), StrMaximo);
  assert.equal((await S.Alimentacion_cambiarEstadoReceta(ObjReceta.recetaId, 2, false, { IntUsuarioId })).cantidadBase.toString(), StrMaximo);
});

test("reactivar detecta un ciclo preexistente y no altera estado ni versión", async () => {
  const ObjA = await Alimentacion_productoPrueba(), ObjB = await Alimentacion_productoPrueba(), ObjC = await Alimentacion_productoPrueba(false);
  await S.Alimentacion_crearRecetaConcentrado(Alimentacion_recetaEntrada(ObjA.IntConcentradoId, [ObjB.IntProductoId]), { IntUsuarioId });
  const DtAhora = Fecha_obtenerAhoraGuatemala();
  // Fixture corrupta deliberada, exclusivamente en la base temporal, para probar defensa al reactivar.
  const ObjReceta = await BaseDatos_obtenerCliente().alimentacionRecetaConcentrado.create({ data: {
    concentradoId: ObjB.IntConcentradoId, productoId: ObjB.IntProductoId, nombre: "Fixture inactiva",
    cantidadBase: "1", unidadBase: "lb", activo: false, usuarioId: IntUsuarioId, usuarioActualizacionId: IntUsuarioId,
    fechaCreacion: DtAhora, fechaActualizacion: DtAhora,
    detalles: { create: { productoId: ObjA.IntProductoId, cantidad: "1", unidadMedida: "lb" } },
  } });
  await assert.rejects(S.Alimentacion_cambiarEstadoReceta(ObjReceta.recetaId, 1, true, { IntUsuarioId }), /circulares/);
  const ObjActual = await S.Alimentacion_obtenerReceta(ObjReceta.recetaId);
  assert.equal(ObjActual.activo, false);
  assert.equal(ObjActual.version, 1);
  await S.Alimentacion_editarRecetaConcentrado(ObjReceta.recetaId, { ...Alimentacion_recetaEntrada(ObjB.IntConcentradoId, [ObjC.IntProductoId]), versionEsperada: 1 }, { IntUsuarioId });
});

test("clasificación e ingreso concurrentes se serializan y no habilitan ingresos posteriores", async () => {
  const ObjProducto = await Alimentacion_productoPrueba(false);
  const ObjEntrada = { subtipo: "INVENTARIO_INICIAL" as const, productoId: ObjProducto.IntProductoId, inventarioId: IntAlmacenId,
    cantidadComercial: "1", unidadComercial: "lb", precioTotalIngreso: "1", IntUsuarioId };
  const [ObjClasificacion, ObjIngreso] = await Promise.allSettled([
    S.Alimentacion_clasificarConcentrado(ObjProducto.IntProductoId, { IntUsuarioId }), I.Inventario_registrarEntrada(ObjEntrada),
  ]);
  assert.equal(ObjClasificacion.status, "fulfilled");
  if (ObjIngreso.status === "rejected") assert.ok(ObjIngreso.reason instanceof ErrorAplicacion && ObjIngreso.reason.IntEstadoHttp === 409);
  await assert.rejects(I.Inventario_registrarEntrada(ObjEntrada), /solo admite/);
  assert.ok(await BaseDatos_obtenerCliente().inventarioTransaccion.count({ where: { existencia: { productoId: ObjProducto.IntProductoId } } }) <= 1);
});

test("HTTP usa permisos reales en elaboración, dependencias y reversión; health consulta la base temporal", async () => {
  const { Api_crearAplicacion } = await import("../../../app.js");
  const ObjDb = BaseDatos_obtenerCliente();
  const ObjRol = await ObjDb.usuarioRol.create({ data: { nombre: "CONCENTRADOS_SIN_PERMISOS" } });
  const ObjUsuario = await ObjDb.usuarioCuenta.create({ data: { rolId: ObjRol.rolId, nombreCompleto: "Permisos prueba", nombreUsuario: "permisos_conc", correo: "permisos@example.invalid", contrasenaHash: await Autenticacion_hashearContrasena(randomBytes(24).toString("hex")) } });
  const StrToken = randomBytes(32).toString("hex");
  await ObjDb.usuarioSesion.create({ data: { usuarioId: ObjUsuario.usuarioId, token: Autenticacion_hashearTokenSesion(StrToken), fechaExpiracion: Fecha_calcularExpiracionGuatemala(Fecha_obtenerInstanteActual(), 1).DtExpiracionAlmacenamiento } });
  const ObjServidor = Api_crearAplicacion().listen(0, "127.0.0.1");
  await once(ObjServidor, "listening");
  const StrUrl = `http://127.0.0.1:${(ObjServidor.address() as AddressInfo).port}`;
  const ObjHeaders = { Cookie: `id=${StrToken}`, "Content-Type": "application/json" };
  try {
    assert.equal((await fetch(`${StrUrl}/api/health`)).status, 200);
    assert.equal((await fetch(`${StrUrl}/api/alimentacion/concentrados`)).status, 401);
    assert.equal((await fetch(`${StrUrl}/api/alimentacion/concentrados`, { headers: ObjHeaders })).status, 403);
    assert.equal((await fetch(`${StrUrl}/api/alimentacion/concentrados/catalogos`, { headers: ObjHeaders })).status, 403);
    assert.equal((await fetch(`${StrUrl}/api/alimentacion/concentrados/productos?busqueda=maiz`, { headers: ObjHeaders })).status, 403);
    const ObjConsulta = await ObjDb.usuarioPermiso.findUniqueOrThrow({ where: { codigo: "ALIMENTACION_CONCENTRADOS_CONSULTAR" } });
    await ObjDb.usuarioPermisoDirecto.create({ data: { usuarioId: ObjUsuario.usuarioId, permisoId: ObjConsulta.permisoId, efecto: "ALLOW", asignadoPorUsuarioId: IntUsuarioId } });
    assert.equal((await fetch(`${StrUrl}/api/alimentacion/concentrados`, { headers: ObjHeaders })).status, 200);
    const ObjCatalogos = await fetch(`${StrUrl}/api/alimentacion/concentrados/catalogos`, { headers: ObjHeaders });
    assert.equal(ObjCatalogos.status, 200);
    const ObjCatalogosJson = await ObjCatalogos.json() as { datos: { unidades: Array<{ codigo: string }>; almacenes: Array<{ inventarioId: number }> } };
    assert.ok(ObjCatalogosJson.datos.unidades.some(Obj => Obj.codigo === "lb"));
    assert.ok(!ObjCatalogosJson.datos.unidades.some(Obj => Obj.codigo === "L"));
    assert.ok(ObjCatalogosJson.datos.almacenes.some(Obj => Obj.inventarioId === IntAlmacenId));
    assert.equal((await fetch(`${StrUrl}/api/alimentacion/concentrados/productos?busqueda=`, { headers: ObjHeaders })).status, 200);
    assert.equal((await fetch(`${StrUrl}/api/alimentacion/concentrados`, { method: "POST", headers: ObjHeaders, body: JSON.stringify({ productoId: IntProductoId }) })).status, 403);
    const ObjGestion = await ObjDb.usuarioPermiso.findUniqueOrThrow({ where: { codigo: "ALIMENTACION_RECETAS_GESTIONAR" } });
    await ObjDb.usuarioPermisoDirecto.create({ data: { usuarioId: ObjUsuario.usuarioId, permisoId: ObjGestion.permisoId, efecto: "ALLOW", asignadoPorUsuarioId: IntUsuarioId } });
    const ObjProducto = await Alimentacion_productoPrueba(false);
    assert.equal((await fetch(`${StrUrl}/api/alimentacion/concentrados`, { method: "POST", headers: ObjHeaders, body: JSON.stringify({ productoId: ObjProducto.IntProductoId }) })).status, 201);
    assert.equal((await fetch(`${StrUrl}/api/alimentacion/concentrados/recetas`, { headers: ObjHeaders })).status, 200);
    assert.equal((await fetch(`${StrUrl}/api/alimentacion/concentrados/recetas`, { method: "POST", headers: ObjHeaders, body: JSON.stringify({ ...Alimentacion_recetaEntrada(IntConcentradoId, [IntProductoId]), detalles: [] }) })).status, 400);
    const StrPrevia = `${StrUrl}/api/alimentacion/concentrados/elaboraciones/previsualizar`;
    assert.equal((await fetch(StrPrevia, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 401);
    assert.equal((await fetch(StrPrevia, { method: "POST", headers: ObjHeaders, body: "{}" })).status, 403);
    const StrConfirmar = `${StrUrl}/api/alimentacion/concentrados/elaboraciones`;
    assert.equal((await fetch(StrConfirmar, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 401);
    assert.equal((await fetch(StrConfirmar, { method: "POST", headers: ObjHeaders, body: "{}" })).status, 403);
    const ObjRegistrar = await ObjDb.usuarioPermiso.findUniqueOrThrow({ where: { codigo: "ALIMENTACION_ELABORACIONES_REGISTRAR" } });
    await ObjDb.usuarioPermisoDirecto.create({ data: { usuarioId: ObjUsuario.usuarioId, permisoId: ObjRegistrar.permisoId, efecto: "ALLOW", asignadoPorUsuarioId: IntUsuarioId } });
    assert.equal((await fetch(StrPrevia, { method: "POST", headers: ObjHeaders, body: "{}" })).status, 400);
    const ObjCaso = await Alimentacion_previaPrueba();
    const ObjRespuesta = await fetch(StrPrevia, { method: "POST", headers: ObjHeaders, body: JSON.stringify(ObjCaso.ObjEntrada) });
    assert.equal(ObjRespuesta.status, 200);
    const ObjJson = await ObjRespuesta.json() as { datos: { reservaExistencias: boolean; huellaPrevisualizacion: string } };
    assert.equal(ObjJson.datos.reservaExistencias, false);
    assert.match(ObjJson.datos.huellaPrevisualizacion, /^[a-f0-9]{64}$/);
    assert.equal((await fetch(`${StrUrl}/api/alimentacion/concentrados/elaboraciones`, { method: "POST", headers: ObjHeaders, body: "{}" })).status, 400);
    await Alimentacion_entradaPrevia(ObjCaso.ObjMateria.IntProductoId, IntAlmacenId, "100", "200");
    const ObjDisponible = await S.Alimentacion_previsualizarElaboracion(ObjCaso.ObjEntrada);
    const StrBody = JSON.stringify({ ...ObjCaso.ObjEntrada, claveIdempotencia: "12345678-1234-4234-8234-123456789abc", huellaPrevisualizacion: ObjDisponible.huellaPrevisualizacion });
    const ObjConfirmada = await fetch(StrConfirmar, { method: "POST", headers: ObjHeaders, body: StrBody });
    assert.equal(ObjConfirmada.status, 201);
    const ObjConfirmadaJson = await ObjConfirmada.json() as { datos: { elaboracionId: number; productoId: number; loteInventarioId: number; fechaEfectiva: string; costoTotal: string } };
    assert.equal(ObjConfirmadaJson.datos.fechaEfectiva, ObjCaso.ObjEntrada.fechaEfectiva);
    assert.equal(typeof ObjConfirmadaJson.datos.costoTotal, "string");
    assert.equal((await fetch(StrConfirmar, { method: "POST", headers: ObjHeaders, body: StrBody })).status, 200);
    const StrRevertir = `${StrConfirmar}/${ObjConfirmadaJson.datos.elaboracionId}/revertir`;
    const StrDependencias = `${StrConfirmar}/${ObjConfirmadaJson.datos.elaboracionId}/dependencias`;
    const StrDetalle = `${StrConfirmar}/${ObjConfirmadaJson.datos.elaboracionId}`;
    assert.equal((await fetch(StrConfirmar, { headers: ObjHeaders })).status, 403);
    assert.equal((await fetch(StrDetalle, { headers: ObjHeaders })).status, 403);
    assert.equal((await fetch(StrRevertir, { method: "POST", headers: ObjHeaders, body: "{}" })).status, 403);
    assert.equal((await fetch(StrDependencias, { headers: ObjHeaders })).status, 403);
    for (const codigo of ["ALIMENTACION_ELABORACIONES_CONSULTAR", "ALIMENTACION_ELABORACIONES_REVERTIR"]) {
      const ObjPermiso = await ObjDb.usuarioPermiso.findUniqueOrThrow({ where: { codigo } });
      await ObjDb.usuarioPermisoDirecto.create({ data: { usuarioId: ObjUsuario.usuarioId, permisoId: ObjPermiso.permisoId, efecto: "ALLOW", asignadoPorUsuarioId: IntUsuarioId } });
    }
    assert.equal((await fetch(StrRevertir, { method: "POST", headers: ObjHeaders, body: "{}" })).status, 400);
    assert.equal((await fetch(StrDependencias, { headers: ObjHeaders })).status, 200);
    const ObjFotoConsulta = await Alimentacion_fotografiaPrevia();
    const ObjHistorial = await fetch(`${StrConfirmar}?pagina=1&limite=1`, { headers: ObjHeaders });
    assert.equal(ObjHistorial.status, 200);
    const ObjHistorialJson = await ObjHistorial.json() as { datos: Array<{ costoTotal: string; cantidadRealBase: string }>; paginacion: { total: number } };
    assert.equal(ObjHistorialJson.datos.length, 1);
    assert.equal(typeof ObjHistorialJson.datos[0]!.costoTotal, "string");
    const ObjDetalle = await fetch(StrDetalle, { headers: ObjHeaders });
    assert.equal(ObjDetalle.status, 200);
    const ObjDetalleJson = await ObjDetalle.json() as { datos: { costoTotal: string; fechaEfectiva: string; lote: { codigoLote: string }; almacenDestino: { inventarioId: number }; detalles: Array<{ fuentes: Array<{ lote: { codigoLote: string }; almacen: { inventarioId: number } }> }> } };
    assert.equal(ObjDetalleJson.datos.costoTotal, ObjConfirmadaJson.datos.costoTotal);
    assert.equal(ObjDetalleJson.datos.fechaEfectiva, ObjCaso.ObjEntrada.fechaEfectiva);
    assert.ok(ObjDetalleJson.datos.lote.codigoLote);
    assert.equal(ObjDetalleJson.datos.almacenDestino.inventarioId, IntAlmacenId);
    assert.ok(ObjDetalleJson.datos.detalles[0]!.fuentes[0]!.lote.codigoLote);
    assert.equal((await fetch(`${StrConfirmar}/2147483647`, { headers: ObjHeaders })).status, 404);
    assert.deepEqual(await Alimentacion_fotografiaPrevia(), ObjFotoConsulta);
    const ObjAjuste = await I.Inventario_registrarAjuste({ subtipo: "CONTEO_FISICO", productoId: ObjConfirmadaJson.datos.productoId, inventarioId: IntAlmacenId,
      loteInventarioId: ObjConfirmadaJson.datos.loteInventarioId, cantidad: "1", motivo: "Dependencia HTTP temporal", IntUsuarioId });
    const ObjBloqueo = await fetch(StrRevertir, { method: "POST", headers: ObjHeaders, body: JSON.stringify({ motivo: "Corrección" }) });
    assert.equal(ObjBloqueo.status, 409);
    const ObjBloqueoJson = await ObjBloqueo.json() as { datos: { dependencias: Array<{ transaccionId: number }> } };
    assert.equal(ObjBloqueoJson.datos.dependencias[0]!.transaccionId, ObjAjuste.transaccionInventarioId);
    await I.Inventario_revertirMovimiento(ObjAjuste.transaccionInventarioId, IntUsuarioId);
    const ObjRevertida = await fetch(StrRevertir, { method: "POST", headers: ObjHeaders, body: JSON.stringify({ motivo: "Corrección" }) });
    assert.equal(ObjRevertida.status, 200);
    const ObjRevertidaJson = await ObjRevertida.json() as { datos: { estado: string } };
    assert.equal(ObjRevertidaJson.datos.estado, "REVERTIDA");
  } finally {
    ObjServidor.closeAllConnections();
    await new Promise<void>((ObjResolver, ObjRechazar) => ObjServidor.close(ObjError => ObjError ? ObjRechazar(ObjError) : ObjResolver()));
  }
});

async function Alimentacion_previaPrueba() {
  const ObjMateria = await Alimentacion_productoPrueba(false);
  const ObjReceta = await S.Alimentacion_crearRecetaConcentrado(Alimentacion_recetaEntrada(IntConcentradoId, [ObjMateria.IntProductoId]), { IntUsuarioId });
  return { ObjMateria, ObjReceta, ObjEntrada: { recetaId: ObjReceta.recetaId, versionReceta: ObjReceta.version,
    fechaEfectiva: "2026-09-22T12:00:00.000-06:00", cantidadTeorica: "100", cantidadReal: "100", unidadCaptura: "lb", inventarioDestinoId: IntAlmacenId } };
}
async function Alimentacion_entradaPrevia(IntMateria: number, IntAlmacen = IntAlmacenId, StrCantidad = "30", StrTotal = "60", StrVencimiento?: string) {
  await I.Inventario_registrarEntrada({ subtipo: "INVENTARIO_INICIAL", productoId: IntMateria, inventarioId: IntAlmacen,
    cantidadComercial: StrCantidad, unidadComercial: "lb", precioTotalIngreso: StrTotal, IntUsuarioId,
    ...(StrVencimiento ? { fechaVencimiento: StrVencimiento } : {}) });
}
async function Alimentacion_fotografiaPrevia() {
  return BaseDatos_obtenerCliente().$queryRaw`
    SELECT (SELECT * FROM dbo.inventario_existencias ORDER BY inventario_producto_id FOR JSON PATH) existencias,
      (SELECT * FROM dbo.inventario_existencias_lotes ORDER BY existencia_lote_id FOR JSON PATH) fuentes,
      (SELECT * FROM dbo.inventario_lotes ORDER BY lote_inventario_id FOR JSON PATH) lotes,
      (SELECT * FROM dbo.inventario_transacciones ORDER BY transaccion_inventario_id FOR JSON PATH) movimientos,
      (SELECT * FROM dbo.alimentacion_elaboraciones ORDER BY elaboracion_id FOR JSON PATH) elaboraciones,
      (SELECT * FROM dbo.alimentacion_elaboraciones_detalles FOR JSON PATH) detalles,
      (SELECT * FROM dbo.alimentacion_elaboraciones_fuentes FOR JSON PATH) consumos,
      (SELECT * FROM dbo.alimentacion_recetas_concentrados ORDER BY receta_id FOR JSON PATH) recetas,
      (SELECT * FROM dbo.alimentacion_recetas_concentrados_detalles ORDER BY receta_detalle_id FOR JSON PATH) ingredientes,
      (SELECT * FROM dbo.usuarios_bitacora FOR JSON PATH) bitacora`;
}
test("previa SQL reparte por lotes/almacenes, conserva costo de 18 decimales y no escribe", async () => {
  const { ObjMateria, ObjEntrada } = await Alimentacion_previaPrueba();
  const ObjDb = BaseDatos_obtenerCliente();
  const ObjAlmacen = await ObjDb.inventarioAlmacen.create({ data: { codigo: `PREV-${++IntCaso}`, nombre: "Otro origen" } });
  await Alimentacion_entradaPrevia(ObjMateria.IntProductoId);
  await Alimentacion_entradaPrevia(ObjMateria.IntProductoId, IntAlmacenId, "10", "30");
  await Alimentacion_entradaPrevia(ObjMateria.IntProductoId, ObjAlmacen.inventarioId, "20", "80");
  const ObjLote = await ObjDb.inventarioLote.findFirstOrThrow({ where: { productoId: ObjMateria.IntProductoId }, orderBy: { codigoLote: "asc" } });
  await ObjDb.$executeRaw`UPDATE dbo.inventario_lotes SET costo_unitario=CAST(N'2.123456789012345678' AS DECIMAL(38,18)) WHERE lote_inventario_id=${ObjLote.loteInventarioId}`;
  const ObjAntes = await Alimentacion_fotografiaPrevia();
  const ObjPrevia = await S.Alimentacion_previsualizarElaboracion(ObjEntrada);
  assert.equal(ObjPrevia.disponible, true);
  assert.deepEqual(ObjPrevia.ingredientes[0]!.fuentes.map(Obj => [Obj.inventarioId, Obj.cantidad]), [[IntAlmacenId, "30.000000"], [IntAlmacenId, "10.000000"], [ObjAlmacen.inventarioId, "10.000000"]]);
  assert.equal(ObjPrevia.ingredientes[0]!.fuentes[0]!.costoUnitario, "2.123456789012345678");
  assert.equal(ObjPrevia.costoEstimado?.total, "133.703703670370370340000000");
  assert.equal((await S.Alimentacion_previsualizarElaboracion(ObjEntrada)).huellaPrevisualizacion, ObjPrevia.huellaPrevisualizacion);
  assert.deepEqual(await Alimentacion_fotografiaPrevia(), ObjAntes);
});
test("previa SQL informa todos los faltantes y excluye vencidos, lotes/almacenes/productos inactivos", async () => {
  const { ObjMateria, ObjReceta, ObjEntrada } = await Alimentacion_previaPrueba();
  const ObjOtra = await Alimentacion_productoPrueba(false), ObjDb = BaseDatos_obtenerCliente();
  const ObjEditada = await S.Alimentacion_editarRecetaConcentrado(ObjReceta.recetaId,
    { ...Alimentacion_recetaEntrada(IntConcentradoId, [ObjMateria.IntProductoId, ObjOtra.IntProductoId]), versionEsperada: 1 }, { IntUsuarioId });
  ObjEntrada.versionReceta = ObjEditada.version;
  await Alimentacion_entradaPrevia(ObjMateria.IntProductoId, IntAlmacenId, "100", "100", "2026-09-21");
  await Alimentacion_entradaPrevia(ObjMateria.IntProductoId, IntAlmacenId, "10", "10", "2026-09-22");
  await Alimentacion_entradaPrevia(ObjOtra.IntProductoId, IntAlmacenId, "100", "100");
  await ObjDb.inventarioLote.updateMany({ where: { productoId: ObjOtra.IntProductoId }, data: { activo: false } });
  let ObjPrevia = await S.Alimentacion_previsualizarElaboracion(ObjEntrada);
  assert.deepEqual(ObjPrevia.faltantes.map(Obj => Obj.cantidadFaltante), ["40.000000", "50.000000"]);
  assert.equal(ObjPrevia.costoEstimado, null);
  await ObjDb.inventarioAlmacen.update({ where: { inventarioId: IntAlmacenId }, data: { activo: false } });
  try {
    const ObjDestino = await ObjDb.inventarioAlmacen.create({ data: { codigo: `PREV-${++IntCaso}`, nombre: "Destino activo" } });
    ObjPrevia = await S.Alimentacion_previsualizarElaboracion({ ...ObjEntrada, inventarioDestinoId: ObjDestino.inventarioId });
    assert.deepEqual(ObjPrevia.faltantes.map(Obj => Obj.cantidadFaltante), ["50.000000", "50.000000"]);
  } finally { await ObjDb.inventarioAlmacen.update({ where: { inventarioId: IntAlmacenId }, data: { activo: true } }); }
  await ObjDb.inventarioProducto.update({ where: { productoId: ObjMateria.IntProductoId }, data: { activo: false } });
  ObjPrevia = await S.Alimentacion_previsualizarElaboracion(ObjEntrada);
  assert.equal(ObjPrevia.faltantes[0]!.cantidadFaltante, "50.000000");
});
test("previa SQL valida versión, estado, destino, unidad y datos antes de operar", async () => {
  const { ObjEntrada, ObjReceta } = await Alimentacion_previaPrueba();
  const ObjAntes = await Alimentacion_fotografiaPrevia();
  await assert.rejects(S.Alimentacion_previsualizarElaboracion({ ...ObjEntrada, versionReceta: 999 }), /cambió/);
  await assert.rejects(S.Alimentacion_previsualizarElaboracion({ ...ObjEntrada, inventarioDestinoId: 2147483647 }), /almacén/);
  await assert.rejects(S.Alimentacion_previsualizarElaboracion({ ...ObjEntrada, unidadCaptura: "L" }), /Revise/);
  await assert.rejects(S.Alimentacion_previsualizarElaboracion({ ...ObjEntrada, cantidadReal: "90" }), /Revise/);
  assert.deepEqual(await Alimentacion_fotografiaPrevia(), ObjAntes);
  await S.Alimentacion_cambiarEstadoReceta(ObjReceta.recetaId, 1, false, { IntUsuarioId });
  await assert.rejects(S.Alimentacion_previsualizarElaboracion({ ...ObjEntrada, versionReceta: 2 }), /activa/);
});
test("previa SQL usa factores exactos del catálogo; huella cambia al cambiar stock y costo", async () => {
  const { ObjMateria, ObjEntrada } = await Alimentacion_previaPrueba();
  await Alimentacion_entradaPrevia(ObjMateria.IntProductoId, IntAlmacenId, "2000", "2000");
  const ObjDb = BaseDatos_obtenerCliente();
  const ObjA = await S.Alimentacion_previsualizarElaboracion({ ...ObjEntrada, cantidadTeorica: "1", cantidadReal: "1", unidadCaptura: "t" });
  assert.equal(ObjA.cantidadRealBase, "2204.622622");
  assert.equal(ObjA.ingredientes[0]!.cantidadRequerida, "1102.311311");
  const ObjB = await S.Alimentacion_previsualizarElaboracion({ ...ObjEntrada, cantidadTeorica: "1", cantidadReal: "1", unidadCaptura: "qq" });
  assert.equal(ObjB.cantidadRealBase, "100.000000");
  const ObjFuente = ObjB.ingredientes[0]!.fuentes[0]!;
  await I.Inventario_registrarAjuste({ subtipo: "CONTEO_FISICO", productoId: ObjMateria.IntProductoId, inventarioId: IntAlmacenId,
    loteInventarioId: ObjFuente.loteInventarioId, cantidad: "1", motivo: "Prueba temporal de cambio", IntUsuarioId });
  const ObjC = await S.Alimentacion_previsualizarElaboracion({ ...ObjEntrada, cantidadTeorica: "1", cantidadReal: "1", unidadCaptura: "qq" });
  assert.notEqual(ObjC.huellaPrevisualizacion, ObjB.huellaPrevisualizacion);
  await ObjDb.$executeRaw`UPDATE dbo.inventario_lotes SET costo_unitario=CAST(N'1.000000000000000001' AS DECIMAL(38,18)) WHERE lote_inventario_id=${ObjFuente.loteInventarioId}`;
  const ObjD = await S.Alimentacion_previsualizarElaboracion({ ...ObjEntrada, cantidadTeorica: "1", cantidadReal: "1", unidadCaptura: "qq" });
  assert.notEqual(ObjD.huellaPrevisualizacion, ObjC.huellaPrevisualizacion);
  assert.equal(ObjD.costoEstimado?.total, "50.000000000000000050000000");
});
