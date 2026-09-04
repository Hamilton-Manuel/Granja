import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FichaTecnicaAnimal } from "../types/produccion.types";
import { Fecha_formatearTimestampGuatemala } from "./fecha";
import { Produccion_etiquetaMetodo, Produccion_formatearDecimal } from "./produccion";

const Produccion_texto = (StrValor:string|null|undefined) => StrValor?.trim() || "—";
const Produccion_fechaCivilFicha = (StrFecha:string|null) => StrFecha ? new Intl.DateTimeFormat("es-GT",{timeZone:"UTC"}).format(new Date(`${StrFecha.slice(0,10)}T00:00:00Z`)) : "—";
const Produccion_fechaHoraFicha = (StrFecha:string) => Fecha_formatearTimestampGuatemala(StrFecha);

export function Produccion_crearModeloFicha(ObjFicha:FichaTecnicaAnimal){
  return {
    identificacion:ObjFicha.identificacion,
    estado:ObjFicha.estadoActual,
    tipo:ObjFicha.tipo,
    raza:Produccion_texto(ObjFicha.raza),
    sexo:ObjFicha.sexo.replaceAll("_"," "),
    nacimiento:Produccion_fechaCivilFicha(ObjFicha.fechaNacimiento),
    ingreso:Produccion_fechaHoraFicha(ObjFicha.fechaIngreso),
    madre:Produccion_texto(ObjFicha.madre),
    loteActual:ObjFicha.loteActual?`${ObjFicha.loteActual.codigo} · ${ObjFicha.loteActual.nombre}`:"—",
    origen:ObjFicha.origen?ObjFicha.origen.tipo.replaceAll("_"," "):"—",
    fechaOrigen:ObjFicha.origen?Produccion_fechaHoraFicha(ObjFicha.origen.fecha):"—",
    salida:ObjFicha.salida?`${ObjFicha.salida.estado} · ${Produccion_fechaHoraFicha(ObjFicha.salida.fecha)}`:null,
    observaciones:Produccion_texto(ObjFicha.observaciones),
    asignaciones:ObjFicha.asignaciones.map(Obj=>({lote:`${Obj.lote.codigo} · ${Obj.lote.nombre}`,inicio:Produccion_fechaHoraFicha(Obj.fechaInicio),fin:Obj.fechaFin?Produccion_fechaHoraFicha(Obj.fechaFin):"Vigente",motivo:Produccion_texto(Obj.motivoCambio)})),
    mediciones:ObjFicha.mediciones.map(Obj=>({fecha:Produccion_fechaHoraFicha(Obj.fechaMedicion),medicion:`${Obj.metodoObtencion==="ESTIMACION_SCHAEFFER"?"Peso estimado":Obj.metodoObtencion==="BASCULA"?"Peso medido":"Peso histórico"}: ${Produccion_formatearDecimal(Obj.valor)} kg / ${Produccion_formatearDecimal(Obj.pesoLb)} lb`,metodo:Produccion_etiquetaMetodo(Obj.metodoObtencion),medidas:Obj.metodoObtencion==="ESTIMACION_SCHAEFFER"?`PT: ${Obj.perimetroToracicoCm} cm · LC: ${Obj.longitudCorporalCm} cm`:"—",observacion:Produccion_texto(Obj.observaciones)})),
    sanidad:ObjFicha.sanidad.map(Obj=>({fecha:Produccion_fechaHoraFicha(Obj.fecha),alcance:Obj.etiquetaAlcance,tipo:Obj.tipo,lote:Obj.lote?`${Obj.lote.codigo} · ${Obj.lote.nombre}`:"—",motivo:Obj.motivo,diagnostico:Produccion_texto(Obj.diagnostico),observaciones:Produccion_texto(Obj.observaciones),detalles:Obj.detalles.map(Det=>({producto:Det.producto,via:Det.via,dosis:Det.dosisClinica!==undefined?`${Det.dosisClinica} ${Det.unidadClinica??""}`.trim():Det.dosisIndicadaPorAnimal!==undefined?`${Det.dosisIndicadaPorAnimal} ${Det.unidadClinica??""} (dosis indicada por animal)`.trim():"—"}))})),
    estados:ObjFicha.historialEstados.map(Obj=>({fecha:Produccion_fechaHoraFicha(Obj.fechaCambio),cambio:`${Obj.estadoAnterior??"REGISTRO"} → ${Obj.estadoNuevo}`,motivo:Produccion_texto(Obj.motivo)})),
    trazabilidad:ObjFicha.trazabilidad.map(Obj=>({fecha:Produccion_fechaHoraFicha(Obj.fecha),descripcion:Obj.descripcion})),
  };
}

function Produccion_blobADataUrl(ObjBlob:Blob):Promise<string>{return new Promise((Resolver,Rechazar)=>{const ObjLector=new FileReader();ObjLector.onload=()=>Resolver(String(ObjLector.result));ObjLector.onerror=()=>Rechazar(ObjLector.error);ObjLector.readAsDataURL(ObjBlob);});}
function Produccion_dimensionesImagen(StrDataUrl:string):Promise<{IntAncho:number;IntAlto:number}>{return new Promise((Resolver,Rechazar)=>{const ObjImagen=new Image();ObjImagen.onload=()=>Resolver({IntAncho:ObjImagen.naturalWidth,IntAlto:ObjImagen.naturalHeight});ObjImagen.onerror=()=>Rechazar(new Error("No fue posible preparar la fotografía."));ObjImagen.src=StrDataUrl;});}

export async function Produccion_generarFichaPdf(ObjFicha:FichaTecnicaAnimal,ObjFoto:Blob|null):Promise<void>{
  const ObjModelo=Produccion_crearModeloFicha(ObjFicha);const ObjPdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  ObjPdf.setFont("helvetica","bold");ObjPdf.setFontSize(17);ObjPdf.text("GRANJA EL CHIFLÓN",105,15,{align:"center"});ObjPdf.setFontSize(14);ObjPdf.text("FICHA TÉCNICA DEL ANIMAL",105,23,{align:"center"});
  let DecY=31,IntXTexto=15,BoolFotoAgregada=false;if(ObjFoto){try{const StrDataUrl=await Produccion_blobADataUrl(ObjFoto),ObjDimensiones=await Produccion_dimensionesImagen(StrDataUrl);const DecMaxAncho=52,DecMaxAlto=42,DecEscala=Math.min(DecMaxAncho/ObjDimensiones.IntAncho,DecMaxAlto/ObjDimensiones.IntAlto),DecAncho=ObjDimensiones.IntAncho*DecEscala,DecAlto=ObjDimensiones.IntAlto*DecEscala;ObjPdf.addImage(StrDataUrl,"WEBP",15+(DecMaxAncho-DecAncho)/2,DecY+(DecMaxAlto-DecAlto)/2,DecAncho,DecAlto);IntXTexto=73;BoolFotoAgregada=true;}catch{}}
  ObjPdf.setFontSize(16);ObjPdf.text(ObjModelo.identificacion,IntXTexto,DecY+6);ObjPdf.setFontSize(10.5);ObjPdf.setFont("helvetica","normal");ObjPdf.text(`Estado: ${ObjModelo.estado}`,IntXTexto,DecY+14);ObjPdf.text(`Tipo / raza: ${ObjModelo.tipo} / ${ObjModelo.raza}`,IntXTexto,DecY+21);ObjPdf.text(`Sexo: ${ObjModelo.sexo}`,IntXTexto,DecY+28);ObjPdf.text(`Lote actual: ${ObjModelo.loteActual}`,IntXTexto,DecY+35);DecY+=BoolFotoAgregada?48:41;
  const Tabla=(StrTitulo:string,ArrCabeceras:string[],ArrFilas:string[][])=>{if(!ArrFilas.length)return;ObjPdf.setFont("helvetica","bold");ObjPdf.setFontSize(11);ObjPdf.text(StrTitulo,15,DecY);autoTable(ObjPdf,{startY:DecY+3,head:[ArrCabeceras],body:ArrFilas,margin:{left:15,right:15},theme:"grid",styles:{font:"helvetica",fontSize:8,cellPadding:2,overflow:"linebreak"},headStyles:{fillColor:[49,95,67],textColor:255},showHead:"everyPage",rowPageBreak:"avoid"});DecY=((ObjPdf as jsPDF&{lastAutoTable?:{finalY:number}}).lastAutoTable?.finalY??DecY)+8;if(DecY>270){ObjPdf.addPage();DecY=18;}};
  Tabla("Información general",["Sexo","Nacimiento","Ingreso","Madre","Origen","Fecha origen"],[[ObjModelo.sexo,ObjModelo.nacimiento,ObjModelo.ingreso,ObjModelo.madre,ObjModelo.origen,ObjModelo.fechaOrigen]]);
  Tabla("Ubicación e historial de lotes",["Lote","Inicio","Fin","Motivo"],ObjModelo.asignaciones.map(Obj=>[Obj.lote,Obj.inicio,Obj.fin,Obj.motivo]));
  Tabla("Pesos y mediciones",["Fecha","Medición","Método y medidas","Observación"],ObjModelo.mediciones.map(Obj=>[Obj.fecha,Obj.medicion,`${Obj.metodo}\n${Obj.medidas}`,Obj.observacion]));
  Tabla("Historial sanitario",["Fecha","Alcance","Tipo","Lote","Motivo / diagnóstico","Detalle clínico"],ObjModelo.sanidad.flatMap(Obj=>Obj.detalles.length?Obj.detalles.map(Det=>[Obj.fecha,Obj.alcance,Obj.tipo,Obj.lote,`${Obj.motivo} / ${Obj.diagnostico}`,`${Det.producto} · ${Det.via} · ${Det.dosis}`]):[[Obj.fecha,Obj.alcance,Obj.tipo,Obj.lote,`${Obj.motivo} / ${Obj.diagnostico}`,"Sin detalle clínico"]]));
  Tabla("Historial de estados",["Fecha","Cambio","Motivo"],ObjModelo.estados.map(Obj=>[Obj.fecha,Obj.cambio,Obj.motivo]));
  Tabla("Trazabilidad",["Fecha","Acontecimiento"],ObjModelo.trazabilidad.map(Obj=>[Obj.fecha,Obj.descripcion]));
  if(DecY>255){ObjPdf.addPage();DecY=18;}ObjPdf.setFont("helvetica","bold");ObjPdf.text("Observaciones",15,DecY);ObjPdf.setFont("helvetica","normal");ObjPdf.setFontSize(9);ObjPdf.text(ObjPdf.splitTextToSize(ObjModelo.observaciones,180) as string[],15,DecY+5);
  ObjPdf.save(`ficha-tecnica-${ObjFicha.identificacion.replace(/[^A-Za-z0-9_-]+/g,"-")}.pdf`);
}
