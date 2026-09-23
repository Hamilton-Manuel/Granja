import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../../generated/prisma/client.js";
import { BaseDatos_desconectar } from "../database/prisma.js";
import { Autenticacion_hashearContrasena } from "../auth/autenticacion.js";
import { Configuracion_obtenerEntorno } from "../config/configuracion-entorno.js";

const ObjEjecutar = promisify(execFile);
export async function PruebasBaseDatos_crearTemporalInternaConcentrados() {
  const StrId = process.env.CONCENTRADOS_CONTENEDOR_ID;
  const StrPassword = process.env.DB_SA_PASSWORD;
  if (process.platform !== "linux" || process.env.CONCENTRADOS_PRUEBAS_INTERNAS !== "1" || !StrId || !/^[a-f0-9]{64}$/.test(StrId) || !StrPassword || /[;{}\r\n]/.test(StrPassword)) throw new Error("PRUEBAS_INTERNAS_NO_AUTORIZADAS");
  const StrNombre = `granja_test_concentrados_${randomBytes(12).toString("hex")}`;
  const Pruebas_url = (StrBase: string) => `sqlserver://127.0.0.1:1433;database=${StrBase};user=sa;password=${StrPassword};encrypt=true;trustServerCertificate=true`;
  const ObjAdmin = new PrismaClient({ adapter: new PrismaMssql(Pruebas_url("master")) });
  const ObjTemporal = new PrismaClient({ adapter: new PrismaMssql(Pruebas_url(StrNombre)) });
  let BoolCreada = false, BoolEliminada = false;
  let StrDirectorio: string | undefined;
  const StrUrlAnterior = process.env.DATABASE_URL, StrEsperadaAnterior = process.env.BASE_DATOS_ESPERADA;
  // La app puede haber leído y cacheado el entorno antes del hook de la suite.
  const ObjEntornoPruebas = Configuracion_obtenerEntorno();
  const StrUrlCacheAnterior = ObjEntornoPruebas.DATABASE_URL;
  async function Pruebas_verificarServidor() {
    const ArrServidor = await ObjAdmin.$queryRaw<Array<{ equipo: string; edicion: number; base: string }>>`
      SELECT CONVERT(NVARCHAR(128),SERVERPROPERTY('MachineName')) equipo,
      CONVERT(INT,SERVERPROPERTY('EngineEdition')) edicion, DB_NAME() base`;
    assert.equal(ArrServidor[0]?.equipo, StrId!.slice(0, 12));
    assert.equal(ArrServidor[0]?.edicion, 3); // SQL Server Developer local, no Azure SQL.
    assert.equal(ArrServidor[0]?.base, "master");
    assert.match(StrNombre, /^granja_test_concentrados_[a-f0-9]{24}$/);
  }
  async function eliminar() {
    if (BoolEliminada) return;
    await BaseDatos_desconectar();
    await ObjTemporal.$disconnect();
    await Pruebas_verificarServidor();
    if (BoolCreada) {
      const ArrBase = await ObjAdmin.$queryRaw<Array<{ nombre: string }>>`SELECT name nombre FROM sys.databases WHERE name=${StrNombre}`;
      assert.equal(ArrBase[0]?.nombre, StrNombre);
      await ObjAdmin.$executeRawUnsafe(`ALTER DATABASE [${StrNombre}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${StrNombre}]`);
      console.log(`Base temporal eliminada y servidor reverificado: ${StrNombre}`);
    }
    await ObjAdmin.$disconnect();
    if (StrDirectorio && path.dirname(StrDirectorio) === process.cwd() && path.basename(StrDirectorio).startsWith(".concentrados-test-")) await rm(StrDirectorio, { recursive: true });
    if (StrUrlAnterior === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = StrUrlAnterior;
    ObjEntornoPruebas.DATABASE_URL = StrUrlCacheAnterior;
    if (StrEsperadaAnterior === undefined) delete process.env.BASE_DATOS_ESPERADA; else process.env.BASE_DATOS_ESPERADA = StrEsperadaAnterior;
    BoolEliminada = true;
  }
  async function Pruebas_migrar(StrConfiguracion: string) {
    await Pruebas_verificarServidor();
    const ArrActual = await ObjTemporal.$queryRaw<Array<{ base: string }>>`SELECT DB_NAME() base`;
    assert.equal(ArrActual[0]?.base, StrNombre);
    await ObjEjecutar(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", StrConfiguracion], { env: { ...process.env }, maxBuffer: 1024 * 1024 });
  }
  try {
    await Pruebas_verificarServidor();
    await ObjAdmin.$executeRawUnsafe(`CREATE DATABASE [${StrNombre}]`);
    BoolCreada = true;
    // Algunas suites importan la app antes del hook y ya construyeron el cliente.
    await BaseDatos_desconectar();
    process.env.DATABASE_URL = Pruebas_url(StrNombre);
    ObjEntornoPruebas.DATABASE_URL = Pruebas_url(StrNombre);
    process.env.BASE_DATOS_ESPERADA = StrNombre;
    StrDirectorio = await mkdtemp(path.join(process.cwd(), ".concentrados-test-"));
    const StrMigraciones = path.join(StrDirectorio, "migrations");
    await mkdir(StrMigraciones);
    const ArrDirectorios = (await readdir("prisma/migrations", { withFileTypes: true })).filter(Obj => Obj.isDirectory()).map(Obj => Obj.name).sort();
    await cp("prisma/migrations/migration_lock.toml", path.join(StrMigraciones, "migration_lock.toml"), { recursive: true });
    for (const StrMigracion of ArrDirectorios.filter(Str => Str < "20260922120000_concentrados_fase1")) await cp(path.join("prisma/migrations", StrMigracion), path.join(StrMigraciones, StrMigracion), { recursive: true });
    const StrConfig = path.join(StrDirectorio, "prisma.config.ts");
    await writeFile(StrConfig, `import { defineConfig } from 'prisma/config'; export default defineConfig({schema:${JSON.stringify(path.resolve("prisma/schema.prisma"))}, migrations:{path:${JSON.stringify(StrMigraciones)}},datasource:{url:process.env.DATABASE_URL!}});`);
    await Pruebas_migrar(StrConfig);
    console.log("Historial previo aplicado en", StrNombre);
    // Historia sintética sobre el esquema previo, con costo de 18 decimales.
    const ObjRol = await ObjTemporal.usuarioRol.create({ data: { nombre: "PRUEBA_MIGRACION" } });
    const ObjUsuario = await ObjTemporal.usuarioCuenta.create({ data: { rolId: ObjRol.rolId, nombreCompleto: "Temporal", nombreUsuario: "historia_temporal", correo: "historia@example.invalid", contrasenaHash: await Autenticacion_hashearContrasena(randomBytes(24).toString("hex")) } });
    const ObjCategoria = await ObjTemporal.inventarioCategoria.create({ data: { nombre: "Historia temporal" } });
    const ObjProducto = await ObjTemporal.inventarioProducto.create({ data: { codigo: "HIST-TEMP", nombre: "Historia temporal", categoriaId: ObjCategoria.categoriaId, unidadMedida: "lb" } });
    const ObjAlmacen = await ObjTemporal.inventarioAlmacen.create({ data: { codigo: "HIST-ALM", nombre: "Historia temporal" } });
    const ObjExistencia = await ObjTemporal.inventarioExistencia.create({ data: { productoId: ObjProducto.productoId, inventarioId: ObjAlmacen.inventarioId, existenciaActual: "3" } });
    const ObjLote = await ObjTemporal.inventarioLote.create({ data: { productoId: ObjProducto.productoId, unidadBaseSnapshot: "lb", costoUnitario: "0.123456789123456789" } });
    const ObjSaldo = await ObjTemporal.inventarioExistenciaLote.create({ data: { productoId: ObjProducto.productoId, inventarioProductoId: ObjExistencia.inventarioProductoId, loteInventarioId: ObjLote.loteInventarioId, existenciaActual: "3" } });
    const ObjMovimiento = await ObjTemporal.inventarioTransaccion.create({ data: { inventarioProductoId: ObjExistencia.inventarioProductoId, existenciaLoteId: ObjSaldo.existenciaLoteId, usuarioId: ObjUsuario.usuarioId, tipoTransaccion: "INGRESO", subtipoTransaccion: "INVENTARIO_INICIAL", cantidad: "3", unidadBaseSnapshot: "lb", costoUnitario: "0.123456789123456789" } });
    await ObjTemporal.inventarioLote.update({ where: { loteInventarioId: ObjLote.loteInventarioId }, data: { transaccionOrigenId: ObjMovimiento.transaccionInventarioId } });
    await ObjTemporal.$executeRaw`UPDATE dbo.inventario_lotes SET costo_unitario=CAST('0.123456789123456789' AS DECIMAL(38,18)) WHERE lote_inventario_id=${ObjLote.loteInventarioId}`;
    await ObjTemporal.$executeRaw`UPDATE dbo.inventario_transacciones SET costo_unitario=CAST('0.123456789123456789' AS DECIMAL(38,18)) WHERE transaccion_inventario_id=${ObjMovimiento.transaccionInventarioId}`;
    const Pruebas_historia = () => ObjTemporal.$queryRaw<Array<{ movimientos: string; lotes: string; saldos: string; saldosLotes: string }>>`
      SELECT (SELECT * FROM dbo.inventario_transacciones ORDER BY transaccion_inventario_id FOR JSON PATH) movimientos,
      (SELECT * FROM dbo.inventario_lotes ORDER BY lote_inventario_id FOR JSON PATH) lotes,
      (SELECT * FROM dbo.inventario_existencias ORDER BY inventario_producto_id FOR JSON PATH) saldos,
      (SELECT * FROM dbo.inventario_existencias_lotes ORDER BY existencia_lote_id FOR JSON PATH) saldosLotes`;
    const ArrAntes = await Pruebas_historia();
    for (const StrMigracion of ArrDirectorios.filter(Str => Str >= "20260922120000_concentrados_fase1")) {
      await cp(path.join("prisma/migrations", StrMigracion), path.join(StrMigraciones, StrMigracion), { recursive: true });
      await Pruebas_migrar(StrConfig);
      assert.deepEqual(await Pruebas_historia(), ArrAntes);
      console.log("Migración aplicada; historia y costos intactos:", StrMigracion);
    }
    const ObjEstado = await ObjEjecutar(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "status", "--config", StrConfig], { env: { ...process.env } });
    console.log(ObjEstado.stdout.trim());
    return { StrNombre, eliminar };
  } catch (ObjError) {
    await eliminar();
    // No propagar cmd/env de errores de procesos; los mensajes de Prisma omiten claves.
    if (ObjError instanceof Error && "cmd" in ObjError) throw new Error("MIGRACION_TEMPORAL_FALLO: " + ("stderr" in ObjError ? String(ObjError.stderr) : ObjError.message));
    throw ObjError;
  }
}
