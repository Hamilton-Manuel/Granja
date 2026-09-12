import { Prisma } from "../../../generated/prisma/client.js";
import { Fecha_convertirAlmacenamientoGuatemalaAInstante,Fecha_formatearInstanteGuatemala,Fecha_parsearFechaCivil,Fecha_parsearFechaHoraGuatemala } from "../../datetime/fecha.js";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import type { z } from "zod";
import type { ObjRegistrar } from "./alimentacion.schemas.js";
import { Inventario_buscarFuentesDisponiblesConTx } from "../inventario/inventario.repository.js";
import * as R from "./alimentacion.repository.js";
const ObjErrores:Record<string,[number,string]>={ALIMENTACION_NO_ENCONTRADA:[404,"La alimentación no existe."],ALIMENTACION_YA_REVERTIDA:[409,"La alimentación ya fue revertida."],ALIMENTACION_INCONSISTENTE:[409,"La alimentación no conserva referencias consistentes."],PRODUCTO_NO_HABILITADO:[409,"El producto no está habilitado para alimentación."],PRODUCTO_INACTIVO:[409,"El producto está inactivo."],FUENTE_INVENTARIO_INCONSISTENTE:[409,"La fuente física seleccionada no es coherente."],LOTE_INACTIVO:[409,"El lote de inventario está inactivo."],LOTE_VENCIDO:[409,"El lote estaba vencido en la fecha efectiva."],STOCK_INSUFICIENTE:[409,"No existe stock suficiente."]};
function Alimentacion_error(ObjError:unknown):never{if(ObjError instanceof Prisma.PrismaClientKnownRequestError&&ObjError.code==="P2034")throw new ErrorAplicacion(409,"ALIMENTACION_CONFLICTO_CONCURRENCIA","El inventario cambió durante el registro. Intente nuevamente.");if(ObjError instanceof Error&&ObjErrores[ObjError.message]){const[IntEstado,StrMensaje]=ObjErrores[ObjError.message]!;throw new ErrorAplicacion(IntEstado,ObjError.message,StrMensaje);}if(ObjError instanceof Prisma.PrismaClientKnownRequestError&&ObjError.code==="P2002")throw new ErrorAplicacion(409,"REGISTRO_DUPLICADO","Ya existe un registro con esos datos.");throw ObjError;}
export function Alimentacion_formatearRespuesta<T>(Obj:T):T{if(Obj instanceof Date)return Fecha_formatearInstanteGuatemala(Fecha_convertirAlmacenamientoGuatemalaAInstante(Obj)) as T;if(Array.isArray(Obj))return Obj.map(Alimentacion_formatearRespuesta) as T;if(Obj&&typeof Obj==="object"&&!(Obj instanceof Prisma.Decimal))return Object.fromEntries(Object.entries(Obj).map(([k,v])=>[k,Alimentacion_formatearRespuesta(v)])) as T;return Obj;}
export function Alimentacion_listar(Obj:{IntPagina:number;IntLimite:number;StrBusqueda?:string;StrEstado?:string;StrDestino?:string;IntAnimalId?:number;IntLoteId?:number;IntFormulaId?:number;StrDesde?:string;StrHasta?:string}){return R.Alimentacion_listar({...Obj,...(Obj.StrDesde?{DtDesde:Fecha_parsearFechaCivil(Obj.StrDesde)}:{}),...(Obj.StrHasta?{DtHasta:Fecha_parsearFechaCivil(Obj.StrHasta)}:{})});}
export const Alimentacion_obtener=R.Alimentacion_obtener;
type AlimentacionEntrada = z.infer<typeof ObjRegistrar> & {IntUsuarioId:number;StrIp?:string};
type AlimentacionFormulaActual = NonNullable<Awaited<ReturnType<typeof R.Alimentacion_obtenerFormulaConTx>>>;

async function Alimentacion_exigirFormula(ObjTx:Prisma.TransactionClient,IntId:number) {
  const ObjFormula=await R.Alimentacion_obtenerFormulaConTx(ObjTx,IntId);
  if(!ObjFormula?.activo || ObjFormula.detalles.length===0) throw new ErrorAplicacion(409,"ALIMENTACION_FORMULA_NO_DISPONIBLE","La fórmula no está disponible. Recargue las fórmulas.");
  return ObjFormula;
}

function Alimentacion_validarComposicion(ObjFormula:AlimentacionFormulaActual,ArrDetalles:Array<{productoId:number;cantidad:string}>) {
  if(ArrDetalles.length!==ObjFormula.detalles.length || new Set(ArrDetalles.map(Obj=>Obj.productoId)).size!==ArrDetalles.length || ObjFormula.detalles.some(Obj=>{
    const ObjEnviado=ArrDetalles.find(ObjDetalle=>ObjDetalle.productoId===Obj.productoId);
    return !ObjEnviado || !Obj.cantidad.equals(ObjEnviado.cantidad);
  })) throw new ErrorAplicacion(409,"ALIMENTACION_FORMULA_CAMBIADA","La composición de la fórmula cambió o no coincide. Recargue las fórmulas y revise nuevamente.");
}

async function Alimentacion_resolverFormulaConTx(ObjTx:Prisma.TransactionClient,ObjFormula:AlimentacionFormulaActual,DtFecha:Date) {
  const ArrDetalles:R.AlimentacionDetalleEntrada[]=[];
  const ArrIngredientes:Array<{productoId:number;nombre:string;cantidad:string;unidadMedida:string;disponible:string;atendible:boolean}>=[];
  // La fecha de vencimiento es DATE; conservar el día civil efectivo, sin hora.
  const DtDia=Fecha_parsearFechaCivil(Fecha_formatearInstanteGuatemala(Fecha_convertirAlmacenamientoGuatemalaAInstante(DtFecha)).slice(0,10));
  for(const ObjDetalle of ObjFormula.detalles) {
    const ObjProducto=ObjDetalle.producto;
    const ArrFuentes=ObjProducto.activo&&ObjProducto.habilitacionAlimentacion?.activo ? await Inventario_buscarFuentesDisponiblesConTx(ObjTx,ObjDetalle.productoId,DtDia) : [];
    const ObjFuente=ArrFuentes.find(Obj=>Obj.existenciaActual.gte(ObjDetalle.cantidad)&&Obj.existencia.existenciaActual.gte(ObjDetalle.cantidad));
    const DecDisponible=ArrFuentes.reduce((DecMax,Obj)=>Prisma.Decimal.max(DecMax,Prisma.Decimal.min(Obj.existenciaActual,Obj.existencia.existenciaActual)),new Prisma.Decimal(0));
    ArrIngredientes.push({productoId:ObjDetalle.productoId,nombre:ObjProducto.nombre,cantidad:ObjDetalle.cantidad.toString(),unidadMedida:ObjProducto.unidadMedida,disponible:DecDisponible.toString(),atendible:!!ObjFuente});
    if(ObjFuente) ArrDetalles.push({productoId:ObjDetalle.productoId,inventarioId:ObjFuente.existencia.inventarioId,loteInventarioId:ObjFuente.loteInventarioId,cantidad:ObjDetalle.cantidad});
  }
  const ArrFaltantes=ArrIngredientes.filter(Obj=>!Obj.atendible);
  const StrMensaje=ArrFaltantes.length ? "No se puede registrar la alimentación porque no existe inventario suficiente para los siguientes productos:\n"+ArrFaltantes.map(Obj=>`- ${Obj.nombre}: requerido ${Obj.cantidad} ${Obj.unidadMedida}, disponible en una sola fuente ${Obj.disponible} ${Obj.unidadMedida}.`).join("\n")+"\nRevise o reabastezca los productos en Inventario y vuelva a comprobar disponibilidad." : null;
  return {ArrDetalles,ObjDisponibilidad:{formulaId:ObjFormula.formulaId,ingredientes:ArrIngredientes,faltantes:ArrFaltantes,disponible:ArrFaltantes.length===0,mensaje:StrMensaje}};
}

export async function Alimentacion_consultarDisponibilidad(Obj:{formulaId:number;fechaEfectiva:string}) {
  try {return await R.Alimentacion_ejecutarTransaccion(async ObjTx=>(await Alimentacion_resolverFormulaConTx(ObjTx,await Alimentacion_exigirFormula(ObjTx,Obj.formulaId),Fecha_parsearFechaHoraGuatemala(Obj.fechaEfectiva))).ObjDisponibilidad);}
  catch(ObjError){Alimentacion_error(ObjError);}
}

export async function Alimentacion_registrar(Obj:AlimentacionEntrada) {
  const DtFecha=Fecha_parsearFechaHoraGuatemala(Obj.fechaEfectiva);
  try {return await R.Alimentacion_ejecutarTransaccion(async ObjTx=>{
    if(Obj.destino.tipo==="ANIMAL") {
      const ObjAnimal=await R.Alimentacion_obtenerAnimalConTx(ObjTx,Obj.destino.animalId);
      if(!ObjAnimal||ObjAnimal.estadoActual!=="ACTIVO"||ObjAnimal.asignaciones.length!==1)throw new ErrorAplicacion(409,"DESTINO_ANIMAL_INVALIDO","El animal no está activo con asignación vigente.");
    } else {
      const ObjLote=await R.Alimentacion_obtenerLoteConTx(ObjTx,Obj.destino.loteProduccionId);
      if(!ObjLote||ObjLote.estado!=="ACTIVO"||ObjLote.asignaciones.length===0)throw new ErrorAplicacion(409,"DESTINO_LOTE_INVALIDO","El lote no está activo o no tiene animales vigentes.");
    }
    let ArrDetalles:R.AlimentacionDetalleEntrada[];
    if(Obj.formulaId!=null) {
      const ObjFormula=await Alimentacion_exigirFormula(ObjTx,Obj.formulaId);
      Alimentacion_validarComposicion(ObjFormula,Obj.detalles);
      const ObjResolucion=await Alimentacion_resolverFormulaConTx(ObjTx,ObjFormula,DtFecha);
      if(!ObjResolucion.ObjDisponibilidad.disponible) throw new ErrorAplicacion(409,"ALIMENTACION_INVENTARIO_INSUFICIENTE",ObjResolucion.ObjDisponibilidad.mensaje!);
      ArrDetalles=ObjResolucion.ArrDetalles;
    } else {
      ArrDetalles=Obj.detalles.map(ObjDetalle=>({...ObjDetalle,cantidad:new Prisma.Decimal(ObjDetalle.cantidad)}));
    }
    return R.Alimentacion_registrarConTx(ObjTx,{formulaId:Obj.formulaId,fechaEfectiva:DtFecha,...(Obj.destino.tipo==="ANIMAL"?{animalId:Obj.destino.animalId}:{loteProduccionId:Obj.destino.loteProduccionId}),observaciones:Obj.observaciones,detalles:ArrDetalles,IntUsuarioId:Obj.IntUsuarioId,StrIp:Obj.StrIp});
  });}catch(ObjError){Alimentacion_error(ObjError);}
}

export async function Alimentacion_revertir(...Arr:Parameters<typeof R.Alimentacion_revertir>){try{return await R.Alimentacion_revertir(...Arr);}catch(e){Alimentacion_error(e);}}
export const Alimentacion_listarProductos=R.Alimentacion_listarProductos;export const Alimentacion_gestionarProducto=R.Alimentacion_gestionarProducto;export const Alimentacion_listarFormulas=R.Alimentacion_listarFormulas;export const Alimentacion_estadoFormula=R.Alimentacion_estadoFormula;export const Alimentacion_diagnosticar=R.Alimentacion_diagnosticar;
export const Alimentacion_buscarDestinosAnimales=R.Alimentacion_buscarDestinosAnimales;
export const Alimentacion_buscarDestinosLotes=R.Alimentacion_buscarDestinosLotes;
export const Alimentacion_buscarAlmacenes=R.Alimentacion_buscarAlmacenes;
export const Alimentacion_buscarExistencias=R.Alimentacion_buscarExistencias;
export function Alimentacion_buscarLotesInventario(IntProductoId:number,IntInventarioId:number,StrFecha?:string){return R.Alimentacion_buscarLotesInventario(IntProductoId,IntInventarioId,StrFecha?Fecha_parsearFechaCivil(StrFecha.slice(0,10)):undefined);}
export function Alimentacion_guardarFormula(IntId:number|null,Obj:{nombre:string;descripcion?:string|null;cantidadBase?:string;unidadBase?:string;detalles?:Array<{productoId:number;cantidad:string}>}){if(!Obj.cantidadBase||!Obj.unidadBase||!Obj.detalles)throw new ErrorAplicacion(400,"VALIDACION_INVALIDA","La fórmula debe enviarse completa.");return R.Alimentacion_guardarFormula(IntId,{nombre:Obj.nombre,...(Obj.descripcion===undefined?{}:{descripcion:Obj.descripcion}),cantidadBase:new Prisma.Decimal(Obj.cantidadBase),unidadBase:Obj.unidadBase,detalles:Obj.detalles.map(d=>({...d,cantidad:new Prisma.Decimal(d.cantidad)}))});}
