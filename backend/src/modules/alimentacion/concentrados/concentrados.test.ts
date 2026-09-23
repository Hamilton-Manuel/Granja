import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "../../../../generated/prisma/client.js";
import * as E from "./concentrados.schemas.js";
import { Alimentacion_calcularValoracionElaboracion } from "./concentrados.calculos.js";
import { Alimentacion_leerCostoConsumoConTx } from "./concentrados.repository.js";
import { Inventario_convertirCantidadSinCuantizar } from "../../inventario/inventario.precision.js";
import { PruebasBaseDatos_validarServidorConcentrados } from "../../../testing/concentrados-base-temporal.js";
import { Alimentacion_exigirGrafoSinCiclos } from "./concentrados.politicas.js";
import { ArrCatalogoPermisosConcentrados } from "./concentrados.constants.js";

const Alimentacion_decimal = (StrValor: string) => new Prisma.Decimal(StrValor);
const ObjReceta = { concentradoId: 1, nombre: "Crecimiento", cantidadBase: "100", unidadBase: "lb",
  detalles: [{ productoId: 2, cantidad: "100", unidadMedida: "lb" }] };
const ObjElaboracion = { recetaId: 1, versionReceta: 1, fechaEfectiva: "2026-09-22T10:00:00.000-06:00",
  cantidadTeorica: "100", cantidadReal: "100", unidadCaptura: "lb", inventarioDestinoId: 1 };

test("grafo rechaza ciclos directos, indirectos y la unión de varias recetas", () => {
  assert.throws(() => Alimentacion_exigirGrafoSinCiclos([{ IntProductoTerminadoId: 1, ArrIngredientesIds: [1] }]), /circulares/);
  assert.throws(() => Alimentacion_exigirGrafoSinCiclos([
    { IntProductoTerminadoId: 1, ArrIngredientesIds: [2] },
    { IntProductoTerminadoId: 2, ArrIngredientesIds: [3] },
    { IntProductoTerminadoId: 3, ArrIngredientesIds: [1] },
  ]), /circulares/);
  assert.doesNotThrow(() => Alimentacion_exigirGrafoSinCiclos([
    { IntProductoTerminadoId: 1, ArrIngredientesIds: [2, 3] },
    { IntProductoTerminadoId: 1, ArrIngredientesIds: [2] },
    { IntProductoTerminadoId: 3, ArrIngredientesIds: [2] },
  ]));
});
test("grafo procesa cadenas largas sin recursión", () => {
  assert.doesNotThrow(() => Alimentacion_exigirGrafoSinCiclos(Array.from({ length: 12000 }, (_, IntIndice) => ({ IntProductoTerminadoId: IntIndice, ArrIngredientesIds: [IntIndice + 1] }))));
});
test("los cinco permisos nuevos son únicos y el estado de receta exige versión", () => {
  assert.equal(new Set(ArrCatalogoPermisosConcentrados.map(Obj => Obj.StrCodigo)).size, 5);
  assert.equal(E.ObjConcentradoRecetaEstado.safeParse({ activo: true }).success, false);
  assert.equal(E.ObjConcentradoRecetaEstado.safeParse({ activo: true, versionEsperada: 2 }).success, true);
});

test("recetas: cantidades estrictas, unidades de peso e ingredientes únicos", () => {
  assert.equal(E.ObjConcentradoRecetaCrear.safeParse(ObjReceta).success, true);
  for (const StrCantidad of ["0", "-1", "1e3", "0.0000001", "1000000000000000000", "NaN"]) {
    assert.equal(E.ObjConcentradoRecetaCrear.safeParse({ ...ObjReceta, cantidadBase: StrCantidad }).success, false);
  }
  assert.equal(E.ObjConcentradoRecetaCrear.safeParse({ ...ObjReceta, unidadBase: "L" }).success, false);
  assert.equal(E.ObjConcentradoRecetaCrear.safeParse({ ...ObjReceta, detalles: [...ObjReceta.detalles, ...ObjReceta.detalles] }).success, false);
  assert.equal(E.ObjConcentradoRecetaEditar.safeParse(ObjReceta).success, false);
  assert.equal(E.ObjConcentradoRecetaEditar.safeParse({ ...ObjReceta, versionEsperada: 1 }).success, true);
});

test("contrato de confirmación exige huella y UUID; rechaza costos y actor del navegador", () => {
  const ObjConfirmacion = { ...ObjElaboracion, claveIdempotencia: "12345678-1234-4234-8234-123456789abc", huellaPrevisualizacion: "a".repeat(64) };
  assert.equal(E.ObjConcentradoPrevisualizar.safeParse(ObjElaboracion).success, true);
  assert.equal(E.ObjConcentradoConfirmar.safeParse(ObjElaboracion).success, false);
  assert.equal(E.ObjConcentradoConfirmar.safeParse(ObjConfirmacion).success, true);
  for (const ObjExtra of [{ costoTotal: "1" }, { usuarioId: 1 }, { fuentes: [] }]) {
    assert.equal(E.ObjConcentradoConfirmar.safeParse({ ...ObjConfirmacion, ...ObjExtra }).success, false);
  }
  for (const StrFecha of ["2026-02-30T10:00:00.000-06:00", "2026-09-22T10:00:00.000Z"]) {
    assert.equal(E.ObjConcentradoPrevisualizar.safeParse({ ...ObjElaboracion, fechaEfectiva: StrFecha }).success, false);
  }
});

test("conversiones: quintal regional, tonelada métrica y cuantización única al final", () => {
  assert.equal(Inventario_convertirCantidadSinCuantizar(Alimentacion_decimal("1"), Alimentacion_decimal("45359.237"), Alimentacion_decimal("453.59237")).toString(), "100");
  assert.equal(Inventario_convertirCantidadSinCuantizar(Alimentacion_decimal("1"), Alimentacion_decimal("1000000"), Alimentacion_decimal("1000")).toString(), "1000");
  const DecCantidad = Inventario_convertirCantidadSinCuantizar(Alimentacion_decimal("1000000"), Alimentacion_decimal("1"), Alimentacion_decimal("3"));
  assert.equal(DecCantidad.toDecimalPlaces(6).toFixed(6), "333333.333333");
  assert.throws(() => Inventario_convertirCantidadSinCuantizar(Alimentacion_decimal("1"), Alimentacion_decimal("0"), Alimentacion_decimal("1")));
});

test("valoración concilia fuentes exactas y conserva residual firmado", () => {
  const ObjValor = Alimentacion_calcularValoracionElaboracion([
    { IntTransaccionId: 1, DecCantidadDescontada: Alimentacion_decimal("200"), DecCostoUnitarioHistorico: Alimentacion_decimal("4") },
    { IntTransaccionId: 2, DecCantidadDescontada: Alimentacion_decimal("100"), DecCostoUnitarioHistorico: Alimentacion_decimal("4") },
  ], Alimentacion_decimal("500"));
  assert.equal(ObjValor.StrCostoTotal, "1200.000000000000000000000000");
  assert.equal(ObjValor.StrCostoUnitario, "2.400000000000000000");
  assert.equal(ObjValor.StrResidualValoracion, "0.000000000000000000000000");
  const DecimalExacto = Prisma.Decimal.clone({ precision: 100 });
  for (const StrCosto of ["1", "2", "0.123456789123456789"]) {
    const ObjResultado = Alimentacion_calcularValoracionElaboracion([
      { IntTransaccionId: 1, DecCantidadDescontada: Alimentacion_decimal("1.000001"), DecCostoUnitarioHistorico: Alimentacion_decimal(StrCosto) },
    ], Alimentacion_decimal("3"));
    assert.equal(new DecimalExacto(ObjResultado.StrCostoUnitario).mul(3).add(ObjResultado.StrResidualValoracion).toFixed(24), ObjResultado.StrCostoTotal);
    assert.equal(ObjResultado.ArrImportesFuentes[0], ObjResultado.StrCostoTotal);
  }
});

test("rendimiento exige motivo y rechaza vencimiento anterior", () => {
  assert.equal(E.ObjConcentradoPrevisualizar.safeParse({ ...ObjElaboracion, cantidadReal: "abc" }).success, false);
  assert.equal(E.ObjConcentradoPrevisualizar.safeParse({ ...ObjElaboracion, cantidadReal: "95" }).success, false);
  assert.equal(E.ObjConcentradoPrevisualizar.safeParse({ ...ObjElaboracion, cantidadReal: "95", motivoDiferencia: "Merma de proceso" }).success, true);
  assert.equal(E.ObjConcentradoPrevisualizar.safeParse({ ...ObjElaboracion, fechaVencimiento: "2026-09-21" }).success, false);
  assert.equal(E.ObjConcentradoPrevisualizar.safeParse({ ...ObjElaboracion, cantidadReal: "100.000000" }).success, true);
});

test("valoración rechaza exceso de escala, duplicados y desbordamiento", () => {
  const ObjFuente = { IntTransaccionId: 1, DecCantidadDescontada: Alimentacion_decimal("1"), DecCostoUnitarioHistorico: Alimentacion_decimal("1") };
  assert.throws(() => Alimentacion_calcularValoracionElaboracion([ObjFuente], Alimentacion_decimal("0")));
  assert.throws(() => Alimentacion_calcularValoracionElaboracion([ObjFuente, ObjFuente], Alimentacion_decimal("1")));
  assert.throws(() => Alimentacion_calcularValoracionElaboracion([{ ...ObjFuente, DecCantidadDescontada: Alimentacion_decimal("1.0000001") }], Alimentacion_decimal("1")));
  assert.throws(() => Alimentacion_calcularValoracionElaboracion([{ ...ObjFuente, DecCostoUnitarioHistorico: Alimentacion_decimal("100000000000000") }], Alimentacion_decimal("1")));
});

test("costos se leen como texto desde el movimiento y se exige su fuente y unidad", async () => {
  const ArrParametros: unknown[] = [];
  const ObjTx = { $queryRaw: async (_ArrSql: TemplateStringsArray, ...ArrValores: unknown[]) => {
    ArrParametros.push(...ArrValores);
    return [{ cantidad: "-1.000001", costo: "0.123456789123456789" }];
  } } as unknown as Prisma.TransactionClient;
  const ObjCosto = await Alimentacion_leerCostoConsumoConTx(ObjTx, 7, 8, "lb");
  assert.equal(ObjCosto.DecCantidadDescontada.toString(), "1.000001");
  assert.equal(ObjCosto.DecCostoUnitarioHistorico.toString(), "0.123456789123456789");
  assert.deepEqual(ArrParametros, [7, 8, "lb", 7]);
  const ObjVacio = { $queryRaw: async () => [] } as unknown as Prisma.TransactionClient;
  await assert.rejects(Alimentacion_leerCostoConsumoConTx(ObjVacio, 7, 8, "lb"), /INCONSISTENTE/);
});

test("integración requiere contenedor local verificado y puerto publicado", () => {
  const ObjDocker = { State: { Running: true }, Config: { Labels: {
    "com.docker.compose.project": "granja-el-chiflon", "com.docker.compose.service": "database",
  } }, NetworkSettings: { Ports: { "1433/tcp": [{ HostIp: "0.0.0.0", HostPort: "1433" }] } } };
  assert.doesNotThrow(() => PruebasBaseDatos_validarServidorConcentrados("sqlserver://127.0.0.1:1433;database=test", ObjDocker));
  for (const StrUrl of ["sqlserver://example.database.windows.net:1433;database=test", "sqlserver://localhost:1444;database=test", "sqlserver://localhost:1433;server=remote;database=test"]) {
    assert.throws(() => PruebasBaseDatos_validarServidorConcentrados(StrUrl, ObjDocker));
  }
  assert.throws(() => PruebasBaseDatos_validarServidorConcentrados("sqlserver://localhost:1433;database=test", { ...ObjDocker, NetworkSettings: { Ports: { "1433/tcp": [] } } }));
});
