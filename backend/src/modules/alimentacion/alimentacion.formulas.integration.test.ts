import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { randomBytes } from "node:crypto";
import { BaseDatos_exigirBaseActual, BaseDatos_obtenerCliente } from "../../database/prisma.js";
import { Fecha_formatearFechaCivil, Fecha_obtenerAhoraGuatemala } from "../../datetime/fecha.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import { Usuarios_ejecutarBootstrap } from "../../scripts/bootstrap-usuarios.js";
import { PruebasBaseDatos_crearTemporal, type BaseDatosTemporalPruebas } from "../../testing/base-datos-temporal.js";
import * as Inventario from "../inventario/inventario.service.js";
import * as Produccion from "../produccion/produccion.service.js";
import * as Alimentacion from "./alimentacion.service.js";

let ObjBase:BaseDatosTemporalPruebas;
let IntUsuarioId:number,IntAnimalId:number,IntAlmacenId:number,IntCategoriaId:number;
let IntCaso=0;
const StrFecha=Fecha_formatearFechaCivil(Fecha_obtenerAhoraGuatemala())+"T08:00:00.000-06:00";
before(async()=>{
 ObjBase=await PruebasBaseDatos_crearTemporal("alimentacion_formulas");
 await BaseDatos_exigirBaseActual(ObjBase.StrNombre);
 process.env.BOOTSTRAP_WEBMASTER_NOMBRE_COMPLETO="Pruebas Alimentacion";
 process.env.BOOTSTRAP_WEBMASTER_USUARIO="alimentacion_test";
 process.env.BOOTSTRAP_WEBMASTER_CORREO="alimentacion@example.invalid";
 process.env.BOOTSTRAP_WEBMASTER_CONTRASENA=randomBytes(24).toString("base64url");
 await Usuarios_ejecutarBootstrap();
 IntUsuarioId=(await BaseDatos_obtenerCliente().usuarioCuenta.findUniqueOrThrow({where:{nombreUsuario:"alimentacion_test"}})).usuarioId;
 IntCategoriaId=(await Inventario.Inventario_crearCategoria({nombre:"Alimentos prueba",IntUsuarioId})).categoriaId;
 IntAlmacenId=(await Inventario.Inventario_crearAlmacen({codigo:"ALI-TEST",nombre:"Central",IntUsuarioId})).inventarioId;
 const ObjTipo=await Produccion.Produccion_crearTipo({nombre:"Bovino prueba",IntUsuarioId});
 const ObjLote=await Produccion.Produccion_crearLote({tipoAnimalId:ObjTipo.tipoAnimalId,codigo:"ALI-PROD",nombre:"Destino",IntUsuarioId});
 const ObjInicial=await Produccion.Produccion_registrarInicial({loteDestinoId:ObjLote.loteProduccionId,animales:[{identificacion:"ALI-ANIMAL",tipoAnimalId:ObjTipo.tipoAnimalId,sexo:"HEMBRA"}],IntUsuarioId});
 IntAnimalId=ObjInicial.animales[0]!.animalId;
});
after(async()=>{await ObjBase?.eliminar();});

async function Alimentacion_ingresar(IntProductoId:number,StrCantidad:string,IntInventarioId=IntAlmacenId,StrVencimiento?:string){
 return Inventario.Inventario_registrarEntrada({subtipo:"INVENTARIO_INICIAL",productoId:IntProductoId,inventarioId:IntInventarioId,cantidadComercial:StrCantidad,unidadComercial:"lb",precioTotalIngreso:StrCantidad,...(StrVencimiento?{fechaVencimiento:StrVencimiento}:{}),IntUsuarioId});
}
async function Alimentacion_preparar(ArrCantidades:string[],ArrSaldos:string[]){
 const IntEscenario=++IntCaso;
 const ArrDetalles:Array<{productoId:number;cantidad:string}>=[];
 for(const [IntIndice,StrCantidad] of ArrCantidades.entries()){
  const ObjProducto=await Inventario.Inventario_crearProducto({categoriaId:IntCategoriaId,codigo:`ALI-${IntEscenario}-${IntIndice}`,nombre:`Ingrediente ${IntEscenario}-${IntIndice}`,unidadMedida:"lb",manejaLotes:true,IntUsuarioId});
  await Alimentacion.Alimentacion_gestionarProducto(ObjProducto.productoId,true);
  ArrDetalles.push({productoId:ObjProducto.productoId,cantidad:StrCantidad});
  if(ArrSaldos[IntIndice]&&ArrSaldos[IntIndice]!=="0")await Alimentacion_ingresar(ObjProducto.productoId,ArrSaldos[IntIndice]!);
 }
 const ObjFormula=await Alimentacion.Alimentacion_guardarFormula(null,{nombre:`Formula ${IntEscenario}`,cantidadBase:"1",unidadBase:"lb",detalles:ArrDetalles});
 return {formulaId:ObjFormula.formulaId,fechaEfectiva:StrFecha,destino:{tipo:"ANIMAL" as const,animalId:IntAnimalId},detalles:ArrDetalles,IntUsuarioId};
}
async function Alimentacion_snapshot(){
 const ObjDb=BaseDatos_obtenerCliente();
 return {registros:await ObjDb.alimentacionRegistro.count(),detalles:await ObjDb.alimentacionDetalle.count(),movimientos:await ObjDb.inventarioTransaccion.count(),eventos:await ObjDb.produccionEvento.count(),bitacoras:await ObjDb.usuarioBitacora.count(),saldos:await ObjDb.inventarioExistencia.findMany({orderBy:{inventarioProductoId:"asc"}}),lotes:await ObjDb.inventarioExistenciaLote.findMany({orderBy:{existenciaLoteId:"asc"}})};
}

test("cinco productos: fuentes reales, costos, fórmula intacta y reversión",async()=>{
 const ObjEntrada=await Alimentacion_preparar(["6","2.5","10","4","1"],["100","100","100","100","100"]);
 const ObjDb=BaseDatos_obtenerCliente();
 const ObjFormula=await ObjDb.alimentacionFormula.findUnique({where:{formulaId:ObjEntrada.formulaId},include:{detalles:true}});
 const ObjRegistro=await Alimentacion.Alimentacion_registrar(ObjEntrada);
 assert.equal(ObjRegistro.detalles.length,5);
 assert.equal(ObjRegistro.costoTotal,"23.5");
 for(const ObjDetalle of ObjRegistro.detalles){
  assert.equal(ObjDetalle.existenciaLote.existencia.inventarioId,IntAlmacenId);
  const ObjMovimiento=ObjDetalle.inventarioTransacciones[0]!;
  assert.equal(ObjMovimiento.existenciaLoteId,ObjDetalle.existenciaLoteId);
  assert.equal(ObjMovimiento.inventarioProductoId,ObjDetalle.existenciaLote.inventarioProductoId);
  assert.equal(ObjMovimiento.cantidad.toString(),ObjDetalle.cantidadConsumida.negated().toString());
 }
 assert.deepEqual(await ObjDb.alimentacionFormula.findUnique({where:{formulaId:ObjEntrada.formulaId},include:{detalles:true}}),ObjFormula);
 await Alimentacion.Alimentacion_revertir(ObjRegistro.alimentacionId,"Prueba reversión",IntUsuarioId);
 for(const ObjDetalle of ObjRegistro.detalles)assert.equal((await ObjDb.inventarioExistenciaLote.findUniqueOrThrow({where:{existenciaLoteId:ObjDetalle.existenciaLoteId}})).existenciaActual.toString(),"100");
});

test("saldo exacto, lote agotado y reposición sin modificar fórmula",async()=>{
 const ObjEntrada=await Alimentacion_preparar(["6"],["6"]);
 const ObjPrimero=await Alimentacion.Alimentacion_registrar(ObjEntrada);
 assert.equal(ObjPrimero.detalles[0]!.existenciaLote.existenciaActual.toString(),"0");
 const ObjAntes=await Alimentacion_snapshot();
 await assert.rejects(()=>Alimentacion.Alimentacion_registrar(ObjEntrada),Obj=>Obj instanceof ErrorAplicacion&&Obj.StrCodigo==="ALIMENTACION_INVENTARIO_INSUFICIENTE");
 assert.deepEqual(await Alimentacion_snapshot(),ObjAntes);
 const ObjNuevo=await Alimentacion_ingresar(ObjEntrada.detalles[0]!.productoId,"100");
 const ObjSegundo=await Alimentacion.Alimentacion_registrar(ObjEntrada);
 assert.equal(ObjSegundo.detalles[0]!.existenciaLote.loteInventarioId,ObjNuevo.lote.loteInventarioId);
 assert.notEqual(ObjSegundo.detalles[0]!.existenciaLoteId,ObjPrimero.detalles[0]!.existenciaLoteId);
 assert.equal((await BaseDatos_obtenerCliente().alimentacionFormulaDetalle.findFirstOrThrow({where:{formulaId:ObjEntrada.formulaId}})).cantidad.toString(),"6");
});

test("dos disponibles y un faltante: no persiste consumo parcial",async()=>{
 const ObjEntrada=await Alimentacion_preparar(["6","2.5","4"],["100","100","2"]);
 const ObjAntes=await Alimentacion_snapshot();
 await assert.rejects(()=>Alimentacion.Alimentacion_registrar(ObjEntrada),Obj=>Obj instanceof ErrorAplicacion&&/requerido 4 lb, disponible en una sola fuente 2 lb/.test(Obj.message));
 assert.deepEqual(await Alimentacion_snapshot(),ObjAntes);
});

test("todos los faltantes se devuelven y la consulta no escribe",async()=>{
 const ObjEntrada=await Alimentacion_preparar(["6","4","1"],["2","0","0"]);
 const ObjAntes=await Alimentacion_snapshot();
 const ObjConsulta=await Alimentacion.Alimentacion_consultarDisponibilidad(ObjEntrada);
 assert.equal(ObjConsulta.faltantes.length,3);
 await assert.rejects(()=>Alimentacion.Alimentacion_registrar(ObjEntrada),Obj=>Obj instanceof ErrorAplicacion&&ObjConsulta.faltantes.every(ObjF=>Obj.message.includes(ObjF.nombre)));
 assert.deepEqual(await Alimentacion_snapshot(),ObjAntes);
});

test("orden por almacén y código; no suma fuentes insuficientes",async()=>{
 const ObjEntrada=await Alimentacion_preparar(["6"],["3"]);
 const IntProductoId=ObjEntrada.detalles[0]!.productoId;
 await Alimentacion_ingresar(IntProductoId,"3");
 assert.equal((await Alimentacion.Alimentacion_consultarDisponibilidad(ObjEntrada)).disponible,false);
 const IntOtroAlmacen=(await Inventario.Inventario_crearAlmacen({codigo:"ALI-OTRO",nombre:"Otro",IntUsuarioId})).inventarioId;
 await Alimentacion_ingresar(IntProductoId,"100",IntOtroAlmacen);
 const ObjElegible=await Alimentacion_ingresar(IntProductoId,"6");
 await Alimentacion_ingresar(IntProductoId,"100");
 const ObjRegistro=await Alimentacion.Alimentacion_registrar(ObjEntrada);
 assert.equal(ObjRegistro.detalles[0]!.existenciaLote.loteInventarioId,ObjElegible.lote.loteInventarioId);
});

test("fuentes vencidas o inactivas no están disponibles",async()=>{
 const ObjEntrada=await Alimentacion_preparar(["6"],["0"]);
 const IntProductoId=ObjEntrada.detalles[0]!.productoId;
 await Alimentacion_ingresar(IntProductoId,"10",IntAlmacenId,"2020-01-01");
 const ObjInactivo=await Alimentacion_ingresar(IntProductoId,"10");
 await Inventario.Inventario_cambiarEstado("lote",ObjInactivo.lote.loteInventarioId,false,IntUsuarioId);
 assert.equal((await Alimentacion.Alimentacion_consultarDisponibilidad(ObjEntrada)).disponible,false);
 const ObjValido=await Alimentacion_ingresar(IntProductoId,"6",IntAlmacenId,StrFecha.slice(0,10));
 assert.equal((await Alimentacion.Alimentacion_consultarDisponibilidad(ObjEntrada)).disponible,true);
 await Inventario.Inventario_cambiarEstado("almacen",IntAlmacenId,false,IntUsuarioId);
 assert.equal((await Alimentacion.Alimentacion_consultarDisponibilidad(ObjEntrada)).disponible,false);
 await Inventario.Inventario_cambiarEstado("almacen",IntAlmacenId,true,IntUsuarioId);
 assert.equal((await Alimentacion.Alimentacion_registrar(ObjEntrada)).detalles[0]!.existenciaLote.loteInventarioId,ObjValido.lote.loteInventarioId);
});

test("rechaza composición alterada y conserva consumo directo",async()=>{
 const ObjEntrada=await Alimentacion_preparar(["6"],["100"]);
 await assert.rejects(()=>Alimentacion.Alimentacion_registrar({...ObjEntrada,detalles:[{...ObjEntrada.detalles[0]!,cantidad:"1"}]}),Obj=>Obj instanceof ErrorAplicacion&&Obj.StrCodigo==="ALIMENTACION_FORMULA_CAMBIADA");
 const ObjFuente=await BaseDatos_obtenerCliente().inventarioExistenciaLote.findFirstOrThrow({where:{productoId:ObjEntrada.detalles[0]!.productoId}});
 const ObjRegistro=await Alimentacion.Alimentacion_registrar({...ObjEntrada,formulaId:null,detalles:[{...ObjEntrada.detalles[0]!,inventarioId:IntAlmacenId,loteInventarioId:ObjFuente.loteInventarioId,cantidad:"0.125"}]});
 assert.equal(ObjRegistro.detalles[0]!.cantidadConsumida.toString(),"0.125");
});

test("fallo después de la primera salida revierte registros, saldos y bitácoras",async()=>{
 const ObjEntrada=await Alimentacion_preparar(["6","4"],["100","2"]);
 const ArrFuentes=await BaseDatos_obtenerCliente().inventarioExistenciaLote.findMany({where:{productoId:{in:ObjEntrada.detalles.map(Obj=>Obj.productoId)}}});
 const ObjAntes=await Alimentacion_snapshot();
 await assert.rejects(()=>Alimentacion.Alimentacion_registrar({...ObjEntrada,formulaId:null,detalles:ObjEntrada.detalles.map(Obj=>({...Obj,inventarioId:IntAlmacenId,loteInventarioId:ArrFuentes.find(ObjF=>ObjF.productoId===Obj.productoId)!.loteInventarioId}))}));
 assert.deepEqual(await Alimentacion_snapshot(),ObjAntes);
});

test("dos consumos simultáneos: un éxito, un faltante, nunca saldo negativo",async()=>{
 const ObjEntrada=await Alimentacion_preparar(["6"],["6"]);
 const ArrResultados=await Promise.allSettled([Alimentacion.Alimentacion_registrar(ObjEntrada),Alimentacion.Alimentacion_registrar(ObjEntrada)]);
 assert.equal(ArrResultados.filter(Obj=>Obj.status==="fulfilled").length,1);
 const ObjFallo=ArrResultados.find(Obj=>Obj.status==="rejected");
 assert.ok(ObjFallo?.status==="rejected"&&ObjFallo.reason instanceof ErrorAplicacion);
 assert.equal(ObjFallo.reason.StrCodigo,"ALIMENTACION_INVENTARIO_INSUFICIENTE");
 const ObjDb=BaseDatos_obtenerCliente();
 assert.equal(await ObjDb.alimentacionRegistro.count({where:{formulaId:ObjEntrada.formulaId}}),1);
 const ObjSaldo=await ObjDb.inventarioExistencia.findUniqueOrThrow({where:{inventarioId_productoId:{inventarioId:IntAlmacenId,productoId:ObjEntrada.detalles[0]!.productoId}}});
 assert.equal(ObjSaldo.existenciaActual.toString(),"0");
 assert.equal(await ObjDb.inventarioExistenciaLote.count({where:{existenciaActual:{lt:0}}}),0);
});
