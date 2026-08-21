import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after } from "node:test";

import ObjAplicacion from "../../app.js";
import { Autenticacion_generarTokenSesion, Autenticacion_hashearTokenSesion } from "../../auth/autenticacion.js";
import { BaseDatos_desconectar, BaseDatos_obtenerCliente } from "../../database/prisma.js";
import { Fecha_calcularExpiracionGuatemala, Fecha_obtenerInstanteActual } from "../../datetime/fecha.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import * as Inventario from "./inventario.service.js";

const StrBaseEsperada = "granja_inventario_fase0_pruebas";
const BoolEjecutar = process.env.BASE_DATOS_ESPERADA === StrBaseEsperada;

after(async () => { if (BoolEjecutar) await BaseDatos_desconectar(); });

test("Fase 0 de Inventario integra contratos, saldos y reversiones", { skip: !BoolEjecutar }, async () => {
  const ObjPrisma = BaseDatos_obtenerCliente();
  const ObjUsuario = await ObjPrisma.usuarioCuenta.findUnique({ where: { nombreUsuario: "webmaster_fase0" } });
  assert.ok(ObjUsuario);
  const IntUsuarioId = ObjUsuario.usuarioId;
  const ObjTipoProveedor = await ObjPrisma.proveedorTipo.findUnique({ where: { codigo: "PERSONA_JURIDICA" } });
  assert.ok(ObjTipoProveedor);

  const ObjProveedor = await ObjPrisma.proveedorRegistro.create({ data: { tipoProveedorId: ObjTipoProveedor.tipoProveedorId, nombre: "Proveedor temporal Fase 0" } });
  const ObjProveedorAlterno = await ObjPrisma.proveedorRegistro.create({ data: { tipoProveedorId: ObjTipoProveedor.tipoProveedorId, nombre: "Proveedor alterno Fase 0" } });
  const ObjCategoria = await Inventario.Inventario_crearCategoria({ nombre: "Categoría temporal Fase 0", IntUsuarioId });
  const ObjAlmacenOrigen = await Inventario.Inventario_crearAlmacen({ codigo: " fase 0 origen ", nombre: "Origen temporal", IntUsuarioId });
  const ObjAlmacenDestino = await Inventario.Inventario_crearAlmacen({ codigo: "fase 0 destino", nombre: "Destino temporal", IntUsuarioId });
  const ObjProducto = await Inventario.Inventario_crearProducto({ categoriaId: ObjCategoria.categoriaId, codigo: " ins fase 0 ", nombre: "Insumo temporal Fase 0", unidadMedida: "kg", manejaLotes: true, IntUsuarioId });
  await assert.rejects(() => Inventario.Inventario_crearCategoria({ nombre: ObjCategoria.nombre, IntUsuarioId }), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "CATEGORIA_DUPLICADA");
  await assert.rejects(() => Inventario.Inventario_crearAlmacen({ codigo: ObjAlmacenOrigen.codigo, nombre: "Duplicado", IntUsuarioId }), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "CODIGO_ALMACEN_DUPLICADO");
  await assert.rejects(() => Inventario.Inventario_crearProducto({ categoriaId: ObjCategoria.categoriaId, codigo: ObjProducto.codigo, nombre: "Duplicado", unidadMedida: "kg", manejaLotes: false, IntUsuarioId }), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "CODIGO_PRODUCTO_DUPLICADO");
  await Inventario.Inventario_gestionarProveedorProducto({ proveedorId: ObjProveedor.proveedorId, productoId: ObjProducto.productoId, precioReferencia: "5.0000", IntUsuarioId });
  await Inventario.Inventario_gestionarProveedorProducto({ proveedorId: ObjProveedorAlterno.proveedorId, productoId: ObjProducto.productoId, precioReferencia: "5.0000", IntUsuarioId });

  await Inventario.Inventario_registrarEntrada({ subtipo: "COMPRA", productoId: ObjProducto.productoId, inventarioId: ObjAlmacenOrigen.inventarioId, proveedorId: ObjProveedor.proveedorId, codigoLote: "LOTE-FASE-0", cantidad: "10.0000", costoUnitario: "5.0000", fechaVencimiento: null, IntUsuarioId });
  const ObjLote = await ObjPrisma.inventarioLote.findFirstOrThrow({ where: { productoId: ObjProducto.productoId, codigoLote: "LOTE-FASE-0" } });
  await assert.rejects(() => Inventario.Inventario_registrarEntrada({ subtipo: "COMPRA", productoId: ObjProducto.productoId, inventarioId: ObjAlmacenOrigen.inventarioId, proveedorId: ObjProveedor.proveedorId, codigoLote: ObjLote.codigoLote, cantidad: "1.0000", costoUnitario: "5.0000", IntUsuarioId }), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "LOTE_DUPLICADO");

  await assert.rejects(() => Inventario.Inventario_registrarEntrada({ subtipo: "COMPRA", productoId: ObjProducto.productoId, inventarioId: ObjAlmacenOrigen.inventarioId, proveedorId: ObjProveedorAlterno.proveedorId, loteInventarioId: ObjLote.loteInventarioId, cantidad: "1.0000", costoUnitario: "5.0000", IntUsuarioId }), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "PROVEEDOR_LOTE_NO_COINCIDE");
  await assert.rejects(() => Inventario.Inventario_registrarAjuste({ subtipo: "CONTEO_FISICO", productoId: ObjProducto.productoId, inventarioId: ObjAlmacenOrigen.inventarioId, cantidad: "1.0000", motivo: "Conteo temporal", IntUsuarioId }), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "LOTE_REQUERIDO");
  await assert.rejects(() => Inventario.Inventario_editarProducto(ObjProducto.productoId, { manejaLotes: false }, IntUsuarioId), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "MANEJO_LOTES_NO_MODIFICABLE");

  const ObjTransferencia = await Inventario.Inventario_registrarTransferencia({ productoId: ObjProducto.productoId, inventarioOrigenId: ObjAlmacenOrigen.inventarioId, inventarioDestinoId: ObjAlmacenDestino.inventarioId, loteInventarioId: ObjLote.loteInventarioId, cantidad: "4.0000", motivo: "Prueba Fase 0", IntUsuarioId });
  const ObjListadoTransferencias = await Inventario.Inventario_listarTransferencias({ IntPagina: 1, IntLimite: 20, IntProductoId: ObjProducto.productoId });
  const ObjTransferenciaListada = ObjListadoTransferencias.datos.find((ObjDato) => ObjDato.transferenciaId === ObjTransferencia.transferenciaId);
  assert.ok(ObjTransferenciaListada);
  assert.equal(ObjTransferenciaListada.revertida, false);
  assert.equal(ObjTransferenciaListada.origen.inventarioId, ObjAlmacenOrigen.inventarioId);
  assert.equal(ObjTransferenciaListada.destino.inventarioId, ObjAlmacenDestino.inventarioId);

  const StrToken = Autenticacion_generarTokenSesion();
  const ObjExpiracion = Fecha_calcularExpiracionGuatemala(Fecha_obtenerInstanteActual(), 8);
  await ObjPrisma.usuarioSesion.create({ data: { usuarioId: IntUsuarioId, token: Autenticacion_hashearTokenSesion(StrToken), fechaExpiracion: ObjExpiracion.DtExpiracionAlmacenamiento, estado: "ACTIVA" } });
  const ObjServidor = await new Promise<Server>((ObjResolver) => { const ObjServidorLocal = ObjAplicacion.listen(0, "127.0.0.1", () => ObjResolver(ObjServidorLocal)); });
  const ObjDireccion = ObjServidor.address() as AddressInfo;
  const StrUrl = `http://127.0.0.1:${ObjDireccion.port}`;
  const ObjEncabezados = { cookie: `id=${StrToken}`, "content-type": "application/json" };
  let ObjReversion: { transferenciaId: number; movimientosReversion: number[]; movimientosRevertidos: number };
  try {
    for (const StrRuta of ["resumen", "proveedores", "existencias", "transacciones", "transferencias"]) {
      const ObjRespuesta = await fetch(`${StrUrl}/api/inventario/${StrRuta}`, { headers: ObjEncabezados });
      assert.equal(ObjRespuesta.status, 200, StrRuta);
    }
    const ObjRespuestaIndividual = await fetch(`${StrUrl}/api/inventario/transacciones/${ObjTransferenciaListada.movimientosOriginales.salidaId}/revertir`, { method: "POST", headers: ObjEncabezados, body: "{}" });
    assert.equal(ObjRespuestaIndividual.status, 409);
    assert.equal(((await ObjRespuestaIndividual.json()) as { error: { codigo: string } }).error.codigo, "REVERSION_TRANSFERENCIA_REQUIERE_ENDPOINT");
    const ObjRespuestaReversion = await fetch(`${StrUrl}/api/inventario/transferencias/${ObjTransferencia.transferenciaId}/revertir`, { method: "POST", headers: ObjEncabezados, body: "{}" });
    assert.equal(ObjRespuestaReversion.status, 201);
    ObjReversion = ((await ObjRespuestaReversion.json()) as { datos: typeof ObjReversion }).datos;
  } finally {
    await new Promise<void>((ObjResolver) => ObjServidor.close(() => ObjResolver()));
  }
  assert.equal(ObjReversion.movimientosRevertidos, 2);
  assert.equal(ObjReversion.movimientosReversion.length, 2);
  await assert.rejects(() => Inventario.Inventario_revertirTransferencia(ObjTransferencia.transferenciaId, IntUsuarioId), (ObjError) => ObjError instanceof ErrorAplicacion && ObjError.StrCodigo === "TRANSFERENCIA_YA_REVERTIDA");

  const ObjTransferenciasRevertidas = await Inventario.Inventario_listarTransferencias({ IntPagina: 1, IntLimite: 20, BoolRevertida: true });
  assert.equal(ObjTransferenciasRevertidas.datos.some((ObjDato) => ObjDato.transferenciaId === ObjTransferencia.transferenciaId && ObjDato.reversion !== null), true);

  const ObjMovimientos = await Inventario.Inventario_listarMovimientos({ IntPagina: 1, IntLimite: 100, IntProductoId: ObjProducto.productoId });
  assert.equal(ObjMovimientos.datos.every((ObjDato) => ObjDato.producto.productoId === ObjProducto.productoId), true);
  assert.equal(ObjMovimientos.datos.every((ObjDato) => typeof ObjDato.usuario.nombreCompleto === "string"), true);

  const ObjExistencias = await Inventario.Inventario_listarExistencias({ IntPagina: 1, IntLimite: 20, IntProductoId: ObjProducto.productoId });
  assert.equal(ObjExistencias.total, 2);
  assert.equal(ObjExistencias.datos.every((ObjDato) => ObjDato.producto.productoId === ObjProducto.productoId), true);
  const ObjExistenciaOrigen = ObjExistencias.datos.find((ObjDato) => ObjDato.inventarioId === ObjAlmacenOrigen.inventarioId);
  assert.ok(ObjExistenciaOrigen);
  await Inventario.Inventario_editarMinimo(ObjExistenciaOrigen.inventarioProductoId, "11.0000", IntUsuarioId);
  const ObjBajoMinimo = await Inventario.Inventario_listarExistencias({ IntPagina: 1, IntLimite: 20, BoolBajoMinimo: true });
  assert.equal(ObjBajoMinimo.datos.some((ObjDato) => ObjDato.inventarioProductoId === ObjExistenciaOrigen.inventarioProductoId), true);

  const ObjProveedores = await Inventario.Inventario_listarProveedores({ IntPagina: 1, IntLimite: 20, StrBusqueda: "Fase 0" });
  assert.equal(ObjProveedores.total, 2);
  assert.equal("nit" in ObjProveedores.datos[0]!, false);
  assert.equal("correo" in ObjProveedores.datos[0]!, false);
  const ObjRelaciones = await Inventario.Inventario_listarProveedoresProductos({ IntPagina: 1, IntLimite: 20, IntProductoId: ObjProducto.productoId, BoolActivo: true });
  assert.equal(ObjRelaciones.total, 2);
  assert.equal("numeroDocumento" in ObjRelaciones.datos[0]!.proveedor, false);

  const ObjResumen = await Inventario.Inventario_obtenerResumen();
  assert.equal(ObjResumen.diasProximoVencimiento, 30);
  assert.equal(ObjResumen.existenciasBajoMinimo >= 1, true);
  assert.equal(ObjResumen.movimientosRecientes.length <= 5, true);
  const ObjDiagnostico = await Inventario.Inventario_diagnosticarReconciliacion(IntUsuarioId);
  assert.equal(ObjDiagnostico.consistente, true);
  assert.equal(ObjDiagnostico.totalDiferencias, 0);
});
