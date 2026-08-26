import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Venta } from "../types/ventas.types";
import { Fecha_formatearTimestampGuatemala } from "./fecha";
import { Ventas_etiquetaFormaPago, Ventas_formatearMoneda, Ventas_formatearRecibo } from "./ventas";

export interface FilaReciboVenta { identificacion:string; tipo:string; raza:string; lote:string; precio:string }
export interface ModeloReciboVenta { numero:string; anulado:boolean; fecha:string; cliente:string; codigoCliente:string; nit:string; formaPago:string; referencia:string|null; observaciones:string|null; responsable:string; filas:FilaReciboVenta[]; total:string }

export function Ventas_crearModeloRecibo(ObjVenta:Venta):ModeloReciboVenta {
  if(!ObjVenta.recibo)throw new RangeError("La venta no tiene recibo asociado.");
  return {numero:Ventas_formatearRecibo(ObjVenta.recibo.serie,ObjVenta.recibo.numero),anulado:ObjVenta.estado==="ANULADA"||ObjVenta.recibo.estado==="ANULADO",fecha:Fecha_formatearTimestampGuatemala(ObjVenta.fechaVenta),cliente:ObjVenta.clienteNombre,codigoCliente:ObjVenta.clienteCodigo,nit:ObjVenta.clienteNit??"—",formaPago:Ventas_etiquetaFormaPago(ObjVenta.formaPago),referencia:ObjVenta.documentoReferencia,observaciones:ObjVenta.observaciones,responsable:ObjVenta.usuario.nombreCompleto,filas:ObjVenta.detalles.flatMap(ObjDetalle=>ObjDetalle.animales.map(ObjAnimal=>({identificacion:ObjAnimal.animal.identificacion,tipo:ObjAnimal.animal.tipoAnimal.nombre,raza:ObjAnimal.animal.raza?.nombre??"—",lote:ObjDetalle.lote.codigo,precio:Ventas_formatearMoneda(ObjAnimal.precioVenta)}))),total:Ventas_formatearMoneda(ObjVenta.total)};
}

export function Ventas_generarReciboPdf(ObjVenta:Venta):void {
  const ObjModelo=Ventas_crearModeloRecibo(ObjVenta);const ObjPdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  ObjPdf.setFont("helvetica","bold");ObjPdf.setFontSize(17);ObjPdf.text("GRANJA EL CHIFLÓN",105,18,{align:"center"});ObjPdf.setFontSize(13);ObjPdf.text("RECIBO",105,26,{align:"center"});ObjPdf.setFontSize(16);ObjPdf.text(ObjModelo.numero,105,35,{align:"center"});
  let DecY=43;if(ObjModelo.anulado){ObjPdf.setTextColor(170,35,35);ObjPdf.setFontSize(15);ObjPdf.text("RECIBO ANULADO",105,DecY,{align:"center"});ObjPdf.setTextColor(0,0,0);DecY+=9;}
  ObjPdf.setFont("helvetica","normal");ObjPdf.setFontSize(10);const ArrDatos=[`Fecha: ${ObjModelo.fecha}`,`Cliente: ${ObjModelo.cliente}`,`Código: ${ObjModelo.codigoCliente}`,`NIT: ${ObjModelo.nit}`,`Forma de pago: ${ObjModelo.formaPago}`,...(ObjModelo.referencia?[`Referencia: ${ObjModelo.referencia}`]:[])];for(const StrDato of ArrDatos){ObjPdf.text(StrDato,15,DecY);DecY+=6;}
  autoTable(ObjPdf,{startY:DecY+2,head:[["Código / identificación","Tipo","Raza","Lote origen","Precio"]],body:ObjModelo.filas.map(ObjFila=>[ObjFila.identificacion,ObjFila.tipo,ObjFila.raza,ObjFila.lote,ObjFila.precio]),margin:{left:15,right:15},theme:"grid",styles:{font:"helvetica",fontSize:9,cellPadding:2.5,overflow:"linebreak"},headStyles:{fillColor:[49,95,67],textColor:255},columnStyles:{4:{halign:"right"}},showHead:"everyPage",rowPageBreak:"avoid"});
  const ObjPdfTabla=ObjPdf as jsPDF&{lastAutoTable?:{finalY:number}};DecY=(ObjPdfTabla.lastAutoTable?.finalY??DecY)+9;if(DecY>270){ObjPdf.addPage();DecY=20;}ObjPdf.setFont("helvetica","bold");ObjPdf.setFontSize(13);ObjPdf.text(`TOTAL: ${ObjModelo.total}`,195,DecY,{align:"right"});DecY+=8;ObjPdf.setFont("helvetica","normal");ObjPdf.setFontSize(9);if(ObjModelo.observaciones){const ArrLineas=ObjPdf.splitTextToSize(`Observaciones: ${ObjModelo.observaciones}`,180) as string[];ObjPdf.text(ArrLineas,15,DecY);DecY+=ArrLineas.length*5+3;}ObjPdf.text(`Responsable: ${ObjModelo.responsable}`,15,DecY);
  ObjPdf.save(`Recibo-${ObjModelo.numero}.pdf`);
}
