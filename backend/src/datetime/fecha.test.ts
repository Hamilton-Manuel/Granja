import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Fecha_calcularExpiracionGuatemala,
  Fecha_compararInstantes,
  Fecha_crearRangoDiaGuatemala,
  Fecha_convertirAlmacenamientoGuatemalaAInstante,
  Fecha_convertirInstanteAAlmacenamientoGuatemala,
  Fecha_formatearFechaCivil,
  Fecha_formatearInstanteGuatemala,
  Fecha_parsearFechaCivil,
  Fecha_parsearFechaHoraGuatemala,
} from "./fecha.js";

test("convierte el instante crítico a componentes Guatemala y conserva milisegundos", () => {
  const DtOriginal = new Date("2026-08-20T03:29:51.123Z");
  const DtAlmacenada = Fecha_convertirInstanteAAlmacenamientoGuatemala(DtOriginal);
  const DtResultado = Fecha_convertirAlmacenamientoGuatemalaAInstante(DtAlmacenada);

  assert.equal(DtAlmacenada.toISOString(), "2026-08-19T21:29:51.123Z");
  assert.equal(DtResultado.getTime(), DtOriginal.getTime());
  assert.equal(
    Fecha_formatearInstanteGuatemala(DtResultado),
    "2026-08-19T21:29:51.123-06:00",
  );
});

test("calcula una expiración de ocho horas sobre el instante real", () => {
  const DtInicio = new Date("2026-08-20T03:29:51.123Z");
  const ObjExpiracion = Fecha_calcularExpiracionGuatemala(DtInicio, 8);

  assert.equal(
    ObjExpiracion.DtExpiracionInstante.getTime() - DtInicio.getTime(),
    8 * 60 * 60 * 1_000,
  );
  assert.equal(
    ObjExpiracion.DtExpiracionAlmacenamiento.toISOString(),
    "2026-08-20T05:29:51.123Z",
  );
});

test("compara instantes y valida entradas", () => {
  assert.equal(
    Fecha_compararInstantes(new Date("2026-01-01T00:00:00Z"), new Date("2026-01-01T00:00:01Z")),
    -1,
  );
  assert.throws(() => Fecha_calcularExpiracionGuatemala(new Date(), 0), RangeError);
  assert.throws(() => Fecha_convertirInstanteAAlmacenamientoGuatemala(new Date("inválida")), RangeError);
});

test("mantiene fechas civiles sin conversión de zona", () => {
  const DtFecha = Fecha_parsearFechaCivil("2028-02-29");
  assert.equal(Fecha_formatearFechaCivil(DtFecha), "2028-02-29");
  assert.throws(() => Fecha_parsearFechaCivil("2027-02-29"), RangeError);
});

test("crea rangos diarios Guatemala con límite final exclusivo", () => {
  const ObjRango = Fecha_crearRangoDiaGuatemala("2026-08-19");
  assert.equal(ObjRango.DtInicioAlmacenamiento.toISOString(), "2026-08-19T00:00:00.000Z");
  assert.equal(ObjRango.DtFinExclusivoAlmacenamiento.toISOString(), "2026-08-20T00:00:00.000Z");
  assert.equal(ObjRango.DtInicioInstante.toISOString(), "2026-08-19T06:00:00.000Z");
  assert.equal(ObjRango.DtFinExclusivoInstante.toISOString(), "2026-08-20T06:00:00.000Z");
});

test("parsea exclusivamente fecha y hora ISO de Guatemala", () => {
  const DtInstante = Fecha_parsearFechaHoraGuatemala(
    "2026-08-19T21:29:51.123-06:00",
  );
  assert.equal(DtInstante.toISOString(), "2026-08-20T03:29:51.123Z");
  assert.throws(
    () => Fecha_parsearFechaHoraGuatemala("2026-08-20T03:29:51.123Z"),
    RangeError,
  );
});
