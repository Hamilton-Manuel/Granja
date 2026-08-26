import { Prisma } from "../../../generated/prisma/client.js";
import { BaseDatos_obtenerCliente } from "../../database/prisma.js";
import { Fecha_obtenerAhoraGuatemala } from "../../datetime/fecha.js";
import { Produccion_revertirVentaConTx, Produccion_venderAnimalesConTx, type ProduccionAnimalVentaConTx } from "../produccion/produccion.repository.js";
import { StrSerieInicialVentas } from "./ventas.constants.js";

const ObjVentaInclude = {
  cliente: { select: { clienteId: true, codigo: true, nombreCompleto: true, nit: true } },
  usuario: { select: { usuarioId: true, nombreCompleto: true } },
  usuarioAnulacion: { select: { usuarioId: true, nombreCompleto: true } },
  recibo: { select: { serie: true, numero: true, estado: true } },
  detalles: { include: {
    lote: { select: { loteProduccionId: true, codigo: true, nombre: true, tipoAnimal: { select: { tipoAnimalId: true, nombre: true } } } },
    animales: { include: { animal: { select: { animalId: true, identificacion: true, sexo: true, tipoAnimal: { select: { tipoAnimalId: true, nombre: true } }, raza: { select: { razaId: true, nombre: true } } } }, asignacion: { select: { asignacionLoteId: true, fechaInicio: true, fechaFin: true } } } },
    produccionTransacciones: true,
  } },
  operacionProduccion: { select: { operacionProduccionId: true, reversion: { select: { operacionProduccionId: true } } } },
  operacionAnulacion: { select: { operacionProduccionId: true } },
} satisfies Prisma.VentaRegistroInclude;

export type VentasRegistrarEntrada = { clienteId:number; fechaVenta:Date; formaPago:"EFECTIVO"|"TRANSFERENCIA"|"DEPOSITO"|"CREDITO"; documentoReferencia?:string|null|undefined; observaciones?:string|null|undefined; animales:Array<{animalId:number;precioVenta:Prisma.Decimal}>; IntUsuarioId:number; StrIp?:string|undefined };

async function Ventas_ejecutarSerializable<T>(Ventas_operacion:(ObjTx:Prisma.TransactionClient)=>Promise<T>):Promise<T> {
  let ObjUltimoError: unknown;
  for (let IntIntento = 1; IntIntento <= 3; IntIntento += 1) {
    try { return await BaseDatos_obtenerCliente().$transaction(Ventas_operacion, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (ObjError) {
      ObjUltimoError = ObjError;
      if (!(ObjError instanceof Prisma.PrismaClientKnownRequestError) || ObjError.code !== "P2034" || IntIntento === 3) throw ObjError;
    }
  }
  throw ObjUltimoError;
}

export async function Ventas_listar(Obj:{IntPagina:number;IntLimite:number;StrBusqueda?:string|undefined;StrEstado?:string|undefined;IntClienteId?:number|undefined;StrAnimalIdentificacion?:string|undefined;IntLoteProduccionId?:number|undefined;StrFormaPago?:string|undefined;DtDesde?:Date|undefined;DtHasta?:Date|undefined}) {
  const where: Prisma.VentaRegistroWhereInput = {
    ...(Obj.StrBusqueda ? { OR: [{ clienteCodigo: { contains: Obj.StrBusqueda } }, { clienteNombre: { contains: Obj.StrBusqueda } }, { clienteNit: { contains: Obj.StrBusqueda } }, { documentoReferencia: { contains: Obj.StrBusqueda } }, { recibo: { serie: { contains: Obj.StrBusqueda } } }, ...(/^\d+$/.test(Obj.StrBusqueda) ? [{ recibo: { numero: Number(Obj.StrBusqueda) } }] : [])] } : {}),
    ...(Obj.StrEstado ? { estado: Obj.StrEstado } : {}), ...(Obj.IntClienteId ? { clienteId: Obj.IntClienteId } : {}),
    ...(Obj.StrAnimalIdentificacion ? { detalles: { some: { animales: { some: { animal: { identificacion: { contains: Obj.StrAnimalIdentificacion } } } } } } } : {}),
    ...(Obj.IntLoteProduccionId ? { detalles: { some: { loteProduccionId: Obj.IntLoteProduccionId } } } : {}), ...(Obj.StrFormaPago ? { formaPago: Obj.StrFormaPago } : {}),
    ...((Obj.DtDesde || Obj.DtHasta) ? { fechaVenta: { ...(Obj.DtDesde ? { gte: Obj.DtDesde } : {}), ...(Obj.DtHasta ? { lte: Obj.DtHasta } : {}) } } : {}),
  };
  const ObjPrisma = BaseDatos_obtenerCliente();
  const [ArrDatos, IntTotal] = await ObjPrisma.$transaction([ObjPrisma.ventaRegistro.findMany({ where, include: ObjVentaInclude, orderBy: { ventaId: "desc" }, skip: (Obj.IntPagina - 1) * Obj.IntLimite, take: Obj.IntLimite }), ObjPrisma.ventaRegistro.count({ where })]);
  return { datos: ArrDatos, total: IntTotal };
}

export const Ventas_obtener = (IntVentaId:number) => BaseDatos_obtenerCliente().ventaRegistro.findUnique({ where:{ventaId:IntVentaId}, include:ObjVentaInclude });

export async function Ventas_buscarClientes(Obj:{StrBusqueda?:string;IntPagina:number;IntLimite:number}) {
  const ObjPrisma=BaseDatos_obtenerCliente(); const where:Prisma.ClienteRegistroWhereInput={activo:true,...(Obj.StrBusqueda?{OR:[{codigo:{contains:Obj.StrBusqueda}},{nombreCompleto:{contains:Obj.StrBusqueda}},{nit:{contains:Obj.StrBusqueda}}]}:{})};
  const [ArrDatos,IntTotal]=await ObjPrisma.$transaction([ObjPrisma.clienteRegistro.findMany({where,select:{clienteId:true,codigo:true,nombreCompleto:true,nit:true,activo:true},orderBy:{codigo:"asc"},skip:(Obj.IntPagina-1)*Obj.IntLimite,take:Obj.IntLimite}),ObjPrisma.clienteRegistro.count({where})]); return{datos:ArrDatos,total:IntTotal};
}

export async function Ventas_buscarLotes(Obj:{StrBusqueda?:string;IntPagina:number;IntLimite:number}) {
  const ObjPrisma=BaseDatos_obtenerCliente(); const where:Prisma.ProduccionLoteWhereInput={estado:"ACTIVO",...(Obj.StrBusqueda?{OR:[{codigo:{contains:Obj.StrBusqueda}},{nombre:{contains:Obj.StrBusqueda}}]}:{}),asignaciones:{some:{estado:"VIGENTE",animal:{estadoActual:"ACTIVO"}}}};
  const select={loteProduccionId:true,codigo:true,nombre:true,tipoAnimal:{select:{tipoAnimalId:true,nombre:true}},_count:{select:{asignaciones:{where:{estado:"VIGENTE",animal:{estadoActual:"ACTIVO"}}}}}} satisfies Prisma.ProduccionLoteSelect;
  const [ArrDatos,IntTotal]=await ObjPrisma.$transaction([ObjPrisma.produccionLote.findMany({where,select,orderBy:{codigo:"asc"},skip:(Obj.IntPagina-1)*Obj.IntLimite,take:Obj.IntLimite}),ObjPrisma.produccionLote.count({where})]); return{datos:ArrDatos.map(({_count,...ObjLote})=>({...ObjLote,cantidadAnimalesVigentes:_count.asignaciones})),total:IntTotal};
}

export async function Ventas_buscarAnimales(Obj:{StrBusqueda?:string;IntLoteProduccionId?:number;IntPagina:number;IntLimite:number}) {
  const ObjPrisma=BaseDatos_obtenerCliente(); const where:Prisma.ProduccionAnimalWhereInput={estadoActual:"ACTIVO",...(Obj.StrBusqueda?{identificacion:{contains:Obj.StrBusqueda}}:{}),asignaciones:{some:{estado:"VIGENTE",...(Obj.IntLoteProduccionId?{loteProduccionId:Obj.IntLoteProduccionId}:{}),lote:{estado:"ACTIVO"}}}};
  const select={animalId:true,identificacion:true,sexo:true,tipoAnimal:{select:{tipoAnimalId:true,nombre:true}},raza:{select:{razaId:true,nombre:true}},asignaciones:{where:{estado:"VIGENTE",lote:{estado:"ACTIVO"}},take:1,select:{asignacionLoteId:true,fechaInicio:true,lote:{select:{loteProduccionId:true,codigo:true,nombre:true}}}}} satisfies Prisma.ProduccionAnimalSelect;
  const [ArrDatos,IntTotal]=await ObjPrisma.$transaction([ObjPrisma.produccionAnimal.findMany({where,select,orderBy:{identificacion:"asc"},skip:(Obj.IntPagina-1)*Obj.IntLimite,take:Obj.IntLimite}),ObjPrisma.produccionAnimal.count({where})]); return{datos:ArrDatos.map(({asignaciones,...ObjAnimal})=>({...ObjAnimal,asignacionVigente:asignaciones[0]})),total:IntTotal};
}

export async function Ventas_registrar(Obj:VentasRegistrarEntrada) {
  return Ventas_ejecutarSerializable(async ObjTx => {
    const ObjCliente=await ObjTx.clienteRegistro.findUnique({where:{clienteId:Obj.clienteId}}); if(!ObjCliente)throw new Error("CLIENTE_NO_ENCONTRADO"); if(!ObjCliente.activo)throw new Error("CLIENTE_INACTIVO");
    const ArrIds=Obj.animales.map(ObjAnimal=>ObjAnimal.animalId); if(new Set(ArrIds).size!==ArrIds.length)throw new Error("ANIMAL_DUPLICADO_EN_VENTA");
    const ArrAnimales:Array<ProduccionAnimalVentaConTx&{precioVenta:Prisma.Decimal}>=[];
    for(const ObjEntrada of Obj.animales){const ObjAnimal=await ObjTx.produccionAnimal.findUnique({where:{animalId:ObjEntrada.animalId},include:{asignaciones:{where:{estado:"VIGENTE"},include:{lote:true},take:1}}}); if(!ObjAnimal)throw new Error("ANIMAL_NO_ENCONTRADO"); if(ObjAnimal.estadoActual!=="ACTIVO")throw new Error("ANIMAL_NO_ACTIVO"); const ObjAsignacion=ObjAnimal.asignaciones[0]; if(!ObjAsignacion)throw new Error("ANIMAL_SIN_ASIGNACION_VIGENTE"); if(ObjAsignacion.lote.estado!=="ACTIVO")throw new Error("LOTE_INACTIVO"); if(Obj.fechaVenta<ObjAsignacion.fechaInicio)throw new Error("FECHA_VENTA_ANTERIOR_ASIGNACION"); if(await ObjTx.produccionEvento.count({where:{fechaEvento:{gt:Obj.fechaVenta},OR:[{animalId:ObjAnimal.animalId},{loteProduccionId:ObjAsignacion.loteProduccionId}]}})>0)throw new Error("ACTIVIDAD_POSTERIOR_INCOMPATIBLE"); ArrAnimales.push({animalId:ObjAnimal.animalId,asignacionLoteId:ObjAsignacion.asignacionLoteId,loteProduccionId:ObjAsignacion.loteProduccionId,tipoAnimalId:ObjAnimal.tipoAnimalId,precioVenta:ObjEntrada.precioVenta});}
    const ObjTotal=ArrAnimales.reduce((ObjSuma,ObjAnimal)=>ObjSuma.plus(ObjAnimal.precioVenta),new Prisma.Decimal(0));
    const ObjResultado=await Produccion_venderAnimalesConTx(ObjTx,{ArrAnimales,DtFechaVenta:Obj.fechaVenta,IntUsuarioId:Obj.IntUsuarioId,StrDocumentoReferencia:Obj.documentoReferencia,StrObservaciones:Obj.observaciones,StrIp:Obj.StrIp,Produccion_crearVenta:async IntOperacionProduccionId=>{
      const ObjVenta=await ObjTx.ventaRegistro.create({data:{clienteId:ObjCliente.clienteId,usuarioId:Obj.IntUsuarioId,operacionProduccionId:IntOperacionProduccionId,fechaVenta:Obj.fechaVenta,clienteCodigo:ObjCliente.codigo,clienteNombre:ObjCliente.nombreCompleto,clienteNit:ObjCliente.nit,subtotal:ObjTotal,total:ObjTotal,formaPago:Obj.formaPago,documentoReferencia:Obj.documentoReferencia??null,observaciones:Obj.observaciones??null}}); const ObjDetallePorLote=new Map<number,number>();
      for(const IntLoteId of new Set(ArrAnimales.map(ObjAnimal=>ObjAnimal.loteProduccionId))){const ArrLote=ArrAnimales.filter(ObjAnimal=>ObjAnimal.loteProduccionId===IntLoteId);const ObjSubtotal=ArrLote.reduce((ObjSuma,ObjAnimal)=>ObjSuma.plus(ObjAnimal.precioVenta),new Prisma.Decimal(0));const ObjDetalle=await ObjTx.ventaDetalle.create({data:{ventaId:ObjVenta.ventaId,loteProduccionId:IntLoteId,cantidadAnimales:ArrLote.length,subtotal:ObjSubtotal}});ObjDetallePorLote.set(IntLoteId,ObjDetalle.detalleVentaId);await ObjTx.ventaDetalleAnimal.createMany({data:ArrLote.map(ObjAnimal=>({detalleVentaId:ObjDetalle.detalleVentaId,animalId:ObjAnimal.animalId,asignacionLoteId:ObjAnimal.asignacionLoteId,loteProduccionId:ObjAnimal.loteProduccionId,precioVenta:ObjAnimal.precioVenta}))});}
      await ObjTx.ventaRecibo.create({data:{ventaId:ObjVenta.ventaId,serie:StrSerieInicialVentas,monto:ObjTotal,concepto:`Venta ${ObjVenta.ventaId}`}}); return{ObjResultado:ObjVenta,ObjDetallePorLote};
    }});
    await ObjTx.usuarioBitacora.create({data:{usuarioId:Obj.IntUsuarioId,modulo:"VENTAS",accion:"VENTA_CONFIRMADA",descripcion:`Venta ${ObjResultado.ObjResultado.ventaId}; animales ${ArrAnimales.length}; total ${ObjTotal.toFixed(2)}.`,resultado:"EXITO",direccionIp:Obj.StrIp??null}});
    return ObjTx.ventaRegistro.findUniqueOrThrow({where:{ventaId:ObjResultado.ObjResultado.ventaId},include:ObjVentaInclude});
  });
}

export async function Ventas_revertir(IntVentaId:number,StrMotivo:string,IntUsuarioId:number,StrIp?:string) {
  return Ventas_ejecutarSerializable(async ObjTx=>{
    const ObjVenta=await ObjTx.ventaRegistro.findUnique({where:{ventaId:IntVentaId},include:{recibo:true,operacionProduccion:{include:{reversion:true}},detalles:{include:{animales:{include:{animal:true,asignacion:true}}}}}}); if(!ObjVenta)throw new Error("VENTA_NO_ENCONTRADA"); if(ObjVenta.estado==="ANULADA"||ObjVenta.operacionProduccion.reversion)throw new Error("VENTA_YA_ANULADA");
    for(const ObjDetalle of ObjVenta.detalles)for(const ObjItem of ObjDetalle.animales)if(ObjItem.animal.estadoActual!=="VENDIDO"||await ObjTx.produccionEvento.count({where:{animalId:ObjItem.animalId,fechaEvento:{gt:ObjVenta.fechaVenta},operacionProduccionId:{not:ObjVenta.operacionProduccionId}}})>0)throw new Error("REVERSION_VENTA_NO_PERMITIDA");
    const DtAhora=Fecha_obtenerAhoraGuatemala(); const ArrAnimales=ObjVenta.detalles.flatMap(ObjDetalle=>ObjDetalle.animales.map(ObjItem=>({animalId:ObjItem.animalId,asignacionLoteId:ObjItem.asignacionLoteId,loteProduccionId:ObjItem.loteProduccionId,tipoAnimalId:ObjItem.animal.tipoAnimalId})));
    const IntOperacionAnulacionId=await Produccion_revertirVentaConTx(ObjTx,{IntOperacionProduccionId:ObjVenta.operacionProduccionId,ArrAnimales,IntUsuarioId,StrMotivo,DtAhora,StrIp});
    await ObjTx.ventaRegistro.update({where:{ventaId:IntVentaId},data:{estado:"ANULADA",operacionAnulacionId:IntOperacionAnulacionId,usuarioAnulacionId:IntUsuarioId,fechaAnulacion:DtAhora,motivoAnulacion:StrMotivo,fechaActualizacion:DtAhora}}); await ObjTx.ventaRecibo.update({where:{ventaId:IntVentaId},data:{estado:"ANULADO"}}); await ObjTx.usuarioBitacora.create({data:{usuarioId:IntUsuarioId,modulo:"VENTAS",accion:"VENTA_ANULADA",descripcion:`Venta ${IntVentaId}; recibo ${ObjVenta.recibo?.serie}-${ObjVenta.recibo?.numero}.`,resultado:"EXITO",direccionIp:StrIp??null}});
    return ObjTx.ventaRegistro.findUniqueOrThrow({where:{ventaId:IntVentaId},include:ObjVentaInclude});
  });
}

export async function Ventas_diagnosticar(IntUsuarioId:number,StrIp?:string) {
  const ObjPrisma=BaseDatos_obtenerCliente(); const ArrResultados=await ObjPrisma.$queryRaw<Array<{tipo:string;cantidad:number}>>(Prisma.sql`SELECT N'DETALLE_CANTIDAD' tipo, COUNT(*) cantidad FROM dbo.ventas_detalles d WHERE d.cantidad_animales<>(SELECT COUNT(*) FROM dbo.ventas_detalles_animales a WHERE a.detalle_venta_id=d.detalle_venta_id) UNION ALL SELECT N'DETALLE_SUBTOTAL',COUNT(*) FROM dbo.ventas_detalles d WHERE d.subtotal<>(SELECT COALESCE(SUM(a.precio_venta),0) FROM dbo.ventas_detalles_animales a WHERE a.detalle_venta_id=d.detalle_venta_id) UNION ALL SELECT N'VENTA_TOTAL',COUNT(*) FROM dbo.ventas_registros v WHERE v.total<>(SELECT COALESCE(SUM(a.precio_venta),0) FROM dbo.ventas_detalles d JOIN dbo.ventas_detalles_animales a ON a.detalle_venta_id=d.detalle_venta_id WHERE d.venta_id=v.venta_id) UNION ALL SELECT N'RECIBO',COUNT(*) FROM dbo.ventas_registros v LEFT JOIN dbo.ventas_recibos r ON r.venta_id=v.venta_id WHERE r.recibo_id IS NULL OR r.monto<>v.total OR (v.estado=N'ANULADA' AND r.estado<>N'ANULADO') UNION ALL SELECT N'ANIMAL_ESTADO',COUNT(*) FROM dbo.ventas_detalles_animales va JOIN dbo.ventas_detalles vd ON vd.detalle_venta_id=va.detalle_venta_id JOIN dbo.ventas_registros v ON v.venta_id=vd.venta_id JOIN dbo.produccion_animales a ON a.animal_id=va.animal_id WHERE (v.estado=N'CONFIRMADA' AND a.estado_actual<>N'VENDIDO')`); const ArrDiferencias=ArrResultados.filter(ObjResultado=>Number(ObjResultado.cantidad)>0);
  await ObjPrisma.usuarioBitacora.create({data:{usuarioId:IntUsuarioId,modulo:"VENTAS",accion:"VENTAS_RECONCILIACION_EJECUTADA",descripcion:`Diagnostico; diferencias ${ArrDiferencias.reduce((IntSuma,ObjResultado)=>IntSuma+Number(ObjResultado.cantidad),0)}.`,resultado:"EXITO",direccionIp:StrIp??null}}); return{consistente:ArrDiferencias.length===0,ventasRevisadas:await ObjPrisma.ventaRegistro.count(),detallesRevisados:await ObjPrisma.ventaDetalle.count(),animalesRevisados:await ObjPrisma.ventaDetalleAnimal.count(),diferencias:ArrDiferencias};
}
