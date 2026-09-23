import assert from "node:assert/strict";
import test from "node:test";
import { Alimentacion_prepararConfirmacion, Alimentacion_exigirIdempotencia, Alimentacion_exigirPreviaVigente, Alimentacion_esConflictoConfirmacion } from "./concentrados.confirmacion.js";
import { Prisma } from "../../../../generated/prisma/client.js";
const ObjDatos = { recetaId: 1, versionReceta: 1, fechaEfectiva: "2026-09-22T12:00:00.000-06:00",
  cantidadTeorica: "100", cantidadReal: "100", unidadCaptura: "lb", inventarioDestinoId: 1,
  claveIdempotencia: "12345678-abcd-4234-8234-123456789abc", huellaPrevisualizacion: "a".repeat(64) };
test("confirmación normaliza orden HTTP y mayúsculas de UUID para reintentos", () => {
  const ObjA = Alimentacion_prepararConfirmacion(ObjDatos, 1);
  const ObjB = Alimentacion_prepararConfirmacion({ ...Object.fromEntries(Object.entries(ObjDatos).reverse()), claveIdempotencia: ObjDatos.claveIdempotencia.toUpperCase() }, 1);
  assert.equal(ObjA.StrHash, ObjB.StrHash);
  assert.equal(ObjA.StrClave, ObjB.StrClave);
});
test("confirmación exige UUID, huella y no acepta costos o fuentes externos", () => {
  for (const ObjCambio of [{ claveIdempotencia: "mala" }, { huellaPrevisualizacion: "" }, { costoTotal: "0" }, { fuentes: [] }, { movimientos: [] }]) {
    assert.throws(() => Alimentacion_prepararConfirmacion({ ...ObjDatos, ...ObjCambio }, 1), /requiere/);
  }
});
test("idempotencia liga la clave al usuario y al contenido íntegro", () => {
  const ObjA = Alimentacion_prepararConfirmacion(ObjDatos, 1);
  const ObjAnterior = { usuarioId: 1, hashSolicitud: ObjA.StrHash };
  assert.doesNotThrow(() => Alimentacion_exigirIdempotencia(ObjAnterior, 1, ObjA.StrHash));
  for (const ObjCambio of [{ observaciones: "Otro contenido" }, { cantidadReal: "99", motivoDiferencia: "Merma" }, { huellaPrevisualizacion: "b".repeat(64) }]) {
    const ObjB = Alimentacion_prepararConfirmacion({ ...ObjDatos, ...ObjCambio }, 1);
    assert.throws(() => Alimentacion_exigirIdempotencia(ObjAnterior, 1, ObjB.StrHash), /otra solicitud/);
  }
  assert.throws(() => Alimentacion_exigirIdempotencia(ObjAnterior, 2, ObjA.StrHash), /otra solicitud/);
});
test("confirmación exige disponibilidad y coincidencia íntegra de huella", () => {
  assert.doesNotThrow(() => Alimentacion_exigirPreviaVigente(true, "a", "a"));
  assert.throws(() => Alimentacion_exigirPreviaVigente(false, "a", "a"), /nueva vista previa/);
  assert.throws(() => Alimentacion_exigirPreviaVigente(true, "b", "a"), /nueva vista previa/);
});
test("confirmación identifica deadlock MSSQL raw sin ocultar otros errores SQL", () => {
  const Alimentacion_error = (StrCodigo: string, StrMensaje: string) => new Prisma.PrismaClientKnownRequestError("Raw query failed", {
    code: "P2010", clientVersion: "7.9.1", meta: { code: StrCodigo, message: StrMensaje },
  });
  assert.equal(Alimentacion_esConflictoConfirmacion(Alimentacion_error("EREQUEST", "Transaction (Process ID 65) was deadlocked on lock resources with another process and has been chosen as the deadlock victim. Rerun the transaction.")), true);
  assert.equal(Alimentacion_esConflictoConfirmacion(Alimentacion_error("1205", "Víctima del interbloqueo")), true);
  assert.equal(Alimentacion_esConflictoConfirmacion(new Prisma.PrismaClientKnownRequestError("Raw query failed. Transaction has been chosen as the deadlock victim.", { code: "P2010", clientVersion: "7.9.1", meta: {} })), true);
  assert.equal(Alimentacion_esConflictoConfirmacion(new Prisma.PrismaClientKnownRequestError("Raw query failed", { code: "P2010", clientVersion: "7.9.1", meta: { driverAdapterError: { cause: { kind: "TransactionWriteConflict" } } } })), true);
  assert.equal(Alimentacion_esConflictoConfirmacion(Alimentacion_error("EREQUEST", "FALLO_SQL_3B")), false);
  assert.equal(Alimentacion_esConflictoConfirmacion(new Error("Fallo desconocido")), false);
});
