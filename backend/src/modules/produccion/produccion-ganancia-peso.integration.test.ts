import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { randomBytes } from "node:crypto";
import { BaseDatos_exigirBaseActual, BaseDatos_obtenerCliente } from "../../database/prisma.js";
import { Usuarios_ejecutarBootstrap } from "../../scripts/bootstrap-usuarios.js";
import { PruebasBaseDatos_crearTemporal, type BaseDatosTemporalPruebas } from "../../testing/base-datos-temporal.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Usuarios_iniciarSesion } from "../usuarios/usuarios.service.js";
import { Autenticacion_crearCookieSesion } from "../../auth/autenticacion.js";
import { Middleware_manejarErrores } from "../../middleware/manejo-errores.middleware.js";
import { Produccion_crearRouter } from "./produccion.routes.js";
import * as S from "./produccion.service.js";

let ObjBase: BaseDatosTemporalPruebas;
let ObjServidor: Server | undefined;
let StrUrl: string, StrCookie: string;
let IntUsuarioId: number, IntAnimalId: number, IntAnimalSinDatosId: number, IntLoteId: number, IntAsignacionId: number, IntReingresoId: number;
before(async () => {
  ObjBase = await PruebasBaseDatos_crearTemporal("produccion_ganancia");
  await BaseDatos_exigirBaseActual(ObjBase.StrNombre);
  process.env.BOOTSTRAP_WEBMASTER_NOMBRE_COMPLETO = "Pruebas Ganancia";
  process.env.BOOTSTRAP_WEBMASTER_USUARIO = "ganancia_test";
  process.env.BOOTSTRAP_WEBMASTER_CORREO = "ganancia@example.invalid";
  process.env.BOOTSTRAP_WEBMASTER_CONTRASENA = randomBytes(24).toString("base64url");
  await Usuarios_ejecutarBootstrap();
  const ObjDb = BaseDatos_obtenerCliente();
  IntUsuarioId = (await ObjDb.usuarioCuenta.findUniqueOrThrow({ where: { nombreUsuario: "ganancia_test" } })).usuarioId;
  const ObjTipo = await S.Produccion_crearTipo({ nombre: "Bovino ganancia", IntUsuarioId });
  const ObjLote = await S.Produccion_crearLote({ tipoAnimalId: ObjTipo.tipoAnimalId, codigo: "GAN-A", nombre: "Lote A", IntUsuarioId });
  const ObjOtro = await S.Produccion_crearLote({ tipoAnimalId: ObjTipo.tipoAnimalId, codigo: "GAN-B", nombre: "Lote B", IntUsuarioId });
  IntLoteId = ObjLote.loteProduccionId;
  const ObjAnimal = await ObjDb.produccionAnimal.create({ data: { tipoAnimalId: ObjTipo.tipoAnimalId, identificacion: "GAN-1", sexo: "HEMBRA" } });
  IntAnimalId = ObjAnimal.animalId;
  IntAnimalSinDatosId = (await ObjDb.produccionAnimal.create({ data: { tipoAnimalId: ObjTipo.tipoAnimalId, identificacion: "GAN-2", sexo: "HEMBRA" } })).animalId;
  const ObjAsignacionBase = { animalId: IntAnimalId, tipoAnimalId: ObjTipo.tipoAnimalId, usuarioId: IntUsuarioId };
  IntAsignacionId = (await ObjDb.produccionAsignacionLote.create({ data: { ...ObjAsignacionBase, loteProduccionId: IntLoteId, fechaInicio: new Date("2026-09-11T00:00:00Z"), fechaFin: new Date("2026-09-12T12:00:00Z"), estado: "FINALIZADA" } })).asignacionLoteId;
  await ObjDb.produccionAsignacionLote.create({ data: { ...ObjAsignacionBase, loteProduccionId: ObjOtro.loteProduccionId, fechaInicio: new Date("2026-09-12T12:00:00Z"), fechaFin: new Date("2026-09-14T00:00:00Z"), estado: "FINALIZADA" } });
  IntReingresoId = (await ObjDb.produccionAsignacionLote.create({ data: { ...ObjAsignacionBase, loteProduccionId: IntLoteId, fechaInicio: new Date("2026-09-14T00:00:00Z"), estado: "VIGENTE" } })).asignacionLoteId;
  await ObjDb.produccionAsignacionLote.create({ data: { ...ObjAsignacionBase, animalId: IntAnimalSinDatosId, loteProduccionId: IntLoteId, fechaInicio: new Date("2026-09-11T00:00:00Z") } });
  for (const [StrFecha, StrPeso] of [["2026-09-15T08:00:00", "115"], ["2026-09-11T20:32:00", "100"], ["2026-09-12T08:32:00", "102"], ["2026-09-12T12:00:00", "103"], ["2026-09-14T08:00:00", "110"]]) {
    await ObjDb.produccionMedicion.create({ data: { animalId: IntAnimalId, usuarioId: IntUsuarioId, tipoMedicion: "PESO", unidadMedida: "KG", valor: StrPeso!, fechaMedicion: new Date(`${StrFecha}Z`), metodoObtencion: "BASCULA" } });
  }
  const ObjSesion = await Usuarios_iniciarSesion("ganancia_test", process.env.BOOTSTRAP_WEBMASTER_CONTRASENA!, undefined);
  StrCookie = Autenticacion_crearCookieSesion(ObjSesion.StrToken, ObjSesion.DtFechaExpiracion, false).split(";")[0]!;
  const ObjApp = express();
  ObjApp.use("/api/produccion", Produccion_crearRouter());
  ObjApp.use(Middleware_manejarErrores);
  await new Promise<void>((ObjResolver, ObjRechazar) => {
    ObjServidor = ObjApp.listen(0, "127.0.0.1", ObjError => ObjError ? ObjRechazar(ObjError) : ObjResolver());
  });
  StrUrl = `http://127.0.0.1:${(ObjServidor!.address() as AddressInfo).port}/api/produccion/mediciones/ganancia`;
});
after(async () => {
  if (ObjServidor) await new Promise<void>((ObjResolver, ObjRechazar) => ObjServidor!.close(ObjError => ObjError ? ObjRechazar(ObjError) : ObjResolver()));
  await ObjBase?.eliminar();
});

test("ganancia SQL: animal, fechas civiles inclusivas y base filtrada", async () => {
  const Obj = await S.Produccion_analizarGananciaAnimal(IntAnimalId, { fechaDesde: "2026-09-11", fechaHasta: "2026-09-12" });
  assert.equal(Obj.evolucion.length, 3);
  assert.equal(Obj.evolucion[1]!.gpdPeriodoKg, "4");
  assert.equal(S.Produccion_formatearRespuesta(Obj).evolucion[0]!.fechaMedicion as unknown as string, "2026-09-11T20:32:00.000-06:00");
  const ObjFiltrado = await S.Produccion_analizarGananciaAnimal(IntAnimalId, { fechaDesde: "2026-09-14", fechaHasta: "2026-09-15" });
  assert.equal(ObjFiltrado.resumen.gananciaTotalKg, "5");
  assert.equal(ObjFiltrado.resumen.gpdAcumuladaKg, "5");
});

test("ganancia SQL: lote separa reingresos y animales sin datos", async () => {
  const Obj = await S.Produccion_analizarGananciaLote(IntLoteId, {});
  assert.deepEqual(Obj.cantidades, { animales: 2, permanencias: 3, conDatosSuficientes: 2, sinDatosSuficientes: 1 });
  assert.equal(Obj.permanencias.find(Obj => Obj.asignacionLoteId === IntAsignacionId)!.resumen.gananciaTotalKg, "2");
  assert.equal(Obj.permanencias.find(Obj => Obj.asignacionLoteId === IntReingresoId)!.resumen.gananciaTotalKg, "5");
  const ObjDetalle = await S.Produccion_analizarGananciaAsignacion(IntAsignacionId, {});
  assert.equal(ObjDetalle.evolucion.length, 2);
  assert.equal(ObjDetalle.resumen.gpdAcumuladaKg, "4");
  const ObjDia = await S.Produccion_analizarGananciaLote(IntLoteId, { fechaHasta: "2026-09-11" });
  assert.equal(ObjDia.cantidades.permanencias, 2);
  assert.equal(ObjDia.cantidades.conDatosSuficientes, 0);
});

test("ganancia SQL: animal sin mediciones, filtros vacíos y 404", async () => {
  assert.equal((await S.Produccion_analizarGananciaAnimal(IntAnimalSinDatosId, {})).resumen.estado, "SIN_MEDICIONES");
  assert.equal((await S.Produccion_analizarGananciaAnimal(IntAnimalId, { fechaHasta: "2026-09-10" })).resumen.estado, "SIN_MEDICIONES");
  for (const Produccion_Consultar of [S.Produccion_analizarGananciaAnimal, S.Produccion_analizarGananciaLote, S.Produccion_analizarGananciaAsignacion]) await assert.rejects(() => Produccion_Consultar(2147483647, {}), Obj => Obj instanceof ErrorAplicacion && Obj.IntEstadoHttp === 404);
});

test("ganancia HTTP: endpoints autenticados, serialización Decimal y fechas, 400 y 401", async () => {
  for (const StrRuta of [`/animales/${IntAnimalId}`, `/lotes/${IntLoteId}`, `/asignaciones/${IntAsignacionId}`]) {
    assert.equal((await fetch(StrUrl + StrRuta)).status, 401);
    assert.equal((await fetch(StrUrl + StrRuta, { headers: { cookie: StrCookie } })).status, 200);
  }
  const ObjRespuesta = await fetch(`${StrUrl}/asignaciones/${IntAsignacionId}`, { headers: { cookie: StrCookie } });
  const ObjJson = await ObjRespuesta.json() as { datos: { resumen: { gpdAcumuladaKg: string }; evolucion: Array<{ fechaMedicion: string; pesoKg: string }> } };
  assert.equal(ObjJson.datos.resumen.gpdAcumuladaKg, "4");
  assert.equal(ObjJson.datos.evolucion[0]!.pesoKg, "100");
  assert.equal(ObjJson.datos.evolucion[0]!.fechaMedicion, "2026-09-11T20:32:00.000-06:00");
  for (const StrConsulta of ["fechaDesde=2026-02-30", "fechaDesde=2026-09-12&fechaHasta=2026-09-11"]) {
    assert.equal((await fetch(`${StrUrl}/animales/${IntAnimalId}?${StrConsulta}`, { headers: { cookie: StrCookie } })).status, 400);
  }
});

test("ganancia SQL: lote vacío y permanencias superpuestas no producen métricas", async () => {
  const ObjDb = BaseDatos_obtenerCliente();
  const ObjAsignacion = await ObjDb.produccionAsignacionLote.findFirstOrThrow({ where: { animalId: IntAnimalSinDatosId } });
  const ObjVacio = await S.Produccion_crearLote({ tipoAnimalId: ObjAsignacion.tipoAnimalId, codigo: "GAN-VACIO", nombre: "Vacío", IntUsuarioId });
  await S.Produccion_cambiarEstadoLote(ObjVacio.loteProduccionId, "CERRADO", IntUsuarioId);
  assert.equal((await S.Produccion_analizarGananciaLote(ObjVacio.loteProduccionId, {})).cantidades.permanencias, 0);
  const ObjSuperpuesta = await ObjDb.produccionAsignacionLote.create({ data: { animalId: IntAnimalSinDatosId, tipoAnimalId: ObjAsignacion.tipoAnimalId, loteProduccionId: IntLoteId, usuarioId: IntUsuarioId,
    fechaInicio: new Date("2026-09-11T08:00:00Z"), fechaFin: new Date("2026-09-12T08:00:00Z"), estado: "FINALIZADA" } });
  const ObjDetalle = await S.Produccion_analizarGananciaAsignacion(ObjSuperpuesta.asignacionLoteId, {});
  assert.equal(ObjDetalle.resumen.estado, "INCONSISTENTE");
  assert.equal(ObjDetalle.evolucion.length, 0);
  assert.equal(ObjDetalle.incidencias.length, 1);
  const ObjLote = await S.Produccion_analizarGananciaLote(IntLoteId, {});
  assert.equal(ObjLote.permanencias.filter(Obj => Obj.resumen.estado === "INCONSISTENTE").length, 2);
});
