import assert from "node:assert/strict";
import { Prisma } from "./generated/prisma/client.js";
import { BaseDatos_obtenerCliente, BaseDatos_desconectar } from "./src/database/prisma.js";
import { Usuarios_resolverCodigos } from "./src/modules/usuarios/usuarios-accesos.js";
import { Inventario_calcularConversion, Inventario_crearUnidad, Inventario_listarUnidades } from "./src/modules/inventario/inventario.service.js";
import { ObjCrearUnidad } from "./src/modules/inventario/inventario.schemas.js";
import { Inventario_agruparUnidades, Inventario_unidadesCompatibles } from "../frontend/src/utils/unidadesInventario.js";
import type { DimensionUnidadInventario } from "../frontend/src/types/inventario.types.js";

async function Inventario_catalogoCompleto() {
  const ObjPrimera = await Inventario_listarUnidades({ IntPagina: 1, IntLimite: 100 });
  const ArrUnidades = [...ObjPrimera.datos];
  for (let IntPagina = 2; ArrUnidades.length < ObjPrimera.total; IntPagina++) {
    const ObjPagina = await Inventario_listarUnidades({ IntPagina, IntLimite: 100 });
    assert.ok(ObjPagina.datos.length); ArrUnidades.push(...ObjPagina.datos);
  }
  return ArrUnidades;
}

try {
  const StrUsuario = process.argv[2];
  assert.ok(StrUsuario, "Debe indicarse el usuario confirmado para la bitácora.");
  const ObjDb = BaseDatos_obtenerCliente();
  const ObjCuenta = await ObjDb.usuarioCuenta.findFirst({ where: { nombreUsuario: StrUsuario, estado: "ACTIVO", rol: { activo: true } }, select: { usuarioId: true, nombreUsuario: true, rol: { select: { rolesPermisos: { select: { permiso: { select: { codigo: true, activo: true } } } } } }, permisosDirectos: { select: { efecto: true, permiso: { select: { codigo: true, activo: true } } } } } });
  assert.ok(ObjCuenta && Usuarios_resolverCodigos(ObjCuenta).includes("INVENTARIO_PRODUCTOS_CREAR"), "Usuario no habilitado.");
  const ArrNuevas = [
    ObjCrearUnidad.parse({ codigo: "gal", nombre: "Galón", dimension: "VOLUMEN", factorReferencia: "3785.411784" }),
    ObjCrearUnidad.parse({ codigo: "caneca", nombre: "Caneca", dimension: "VOLUMEN", factorReferencia: "18927.05892" }),
  ];
  const ArrAntes = await Inventario_catalogoCompleto();
  // Verificar las dos antes de escribir; nunca modificar una unidad existente.
  for (const ObjNueva of ArrNuevas) {
    const ObjActual = ArrAntes.find((Obj) => Obj.codigo.toLowerCase() === ObjNueva.codigo);
    if (ObjActual) {
      assert.equal(ObjActual.codigo, ObjNueva.codigo); assert.equal(ObjActual.nombre, ObjNueva.nombre);
      assert.equal(ObjActual.dimension, ObjNueva.dimension); assert.equal(ObjActual.activo, true);
      assert.ok(new Prisma.Decimal(ObjActual.factorReferencia).equals(ObjNueva.factorReferencia));
    }
  }
  for (const ObjNueva of ArrNuevas) {
    if (!ArrAntes.some((Obj) => Obj.codigo === ObjNueva.codigo)) await Inventario_crearUnidad({ ...ObjNueva, IntUsuarioId: ObjCuenta.usuarioId });
  }
  const ArrDespues = await Inventario_catalogoCompleto();
  for (const ObjAnterior of ArrAntes) assert.deepEqual(ArrDespues.find((Obj) => Obj.unidadMedidaId === ObjAnterior.unidadMedidaId), ObjAnterior);
  const ObjGalon = ArrDespues.find((Obj) => Obj.codigo === "gal")!;
  const ObjCaneca = ArrDespues.find((Obj) => Obj.codigo === "caneca")!;
  assert.equal(ObjGalon.factorReferencia, "3785.411784000000000");
  assert.equal(ObjCaneca.factorReferencia, "18927.058920000000000");
  const ObjConversion = Inventario_calcularConversion(new Prisma.Decimal(1), new Prisma.Decimal(ObjCaneca.factorReferencia), new Prisma.Decimal(ObjGalon.factorReferencia), new Prisma.Decimal(1));
  assert.equal(ObjConversion.DecFactorConversion.toFixed(12), "5.000000000000");
  assert.equal(ObjConversion.DecCantidadBase.toFixed(6), "5.000000");
  const ArrFrontend = ArrDespues.map((Obj) => ({ ...Obj, dimension: Obj.dimension as DimensionUnidadInventario }));
  for (const StrCodigo of ["gal", "caneca"]) {
    assert.ok(Inventario_agruparUnidades(ArrFrontend).find((Obj) => Obj.StrGrupo === "Volumen")?.ArrUnidades.some((Obj) => Obj.StrValor === StrCodigo));
    assert.ok(Inventario_unidadesCompatibles("L", ArrFrontend).some((Obj) => Obj.StrValor === StrCodigo));
    assert.ok(!Inventario_unidadesCompatibles("kg", ArrFrontend).some((Obj) => Obj.StrValor === StrCodigo));
  }
  console.log(JSON.stringify({ usuarioBitacora: ObjCuenta.nombreUsuario, unidades: [ObjGalon, ObjCaneca], factorCanecaAGalones: ObjConversion.DecFactorConversion.toFixed(12), cantidadGalones: ObjConversion.DecCantidadBase.toFixed(6), unidadesPreviasSinCambios: ArrAntes.length, selectoresVolumen: "verificados con los datos guardados y los helpers reales del frontend" }));
} catch { console.error("Registro o verificación de unidades no completado. No se modifican factores existentes; puede reintentarse tras revisar la causa."); process.exitCode = 1; }
finally { await BaseDatos_desconectar(); }
