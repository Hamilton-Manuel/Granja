import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GraficaBarras } from "../components/dashboard/GraficaBarras";
import { MensajeError } from "../components/ui/MensajeError";
import { useSesion } from "../hooks/useSesion";
import { Dashboard_consultar } from "../services/dashboard.service";
import type { CategoriaDashboard, RespuestaDashboard } from "../types/dashboard.types";
import { Inventario_formatearDecimal, Inventario_formatearFechaCivil } from "../utils/inventario";
import { Ventas_formatearMoneda } from "../utils/ventas";
import { Fecha_formatearMesCivil } from "../utils/fecha";

const ObjPermisos:Record<CategoriaDashboard,string>={produccion:"REPORTES_PRODUCCION_CONSULTAR",inventario:"REPORTES_INVENTARIO_CONSULTAR",ventas:"REPORTES_VENTAS_CONSULTAR",sanidad:"REPORTES_SANIDAD_CONSULTAR",costos:"REPORTES_COSTOS_CONSULTAR"};
const ObjRutas:Record<CategoriaDashboard,string>={produccion:"/reportes/produccion/censo",inventario:"/reportes/inventario/existencias",ventas:"/reportes/ventas",sanidad:"/reportes/sanidad/aplicaciones",costos:"/reportes/costos"};
function Dashboard_saludo(){const StrHora=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Guatemala",hour:"2-digit",hourCycle:"h23"}).format(new Date());const IntHora=Number(StrHora);return IntHora<12?"Buenos días":IntHora<19?"Buenas tardes":"Buenas noches";}
function Dashboard_lotes(Arr:Array<{codigo:string|null;cantidad:number}>){const ArrVisibles=Arr.slice(0,6).map(Obj=>({StrEtiqueta:Obj.codigo??"Sin lote vigente",IntValor:Obj.cantidad}));const IntOtros=Arr.slice(6).reduce((IntSuma,Obj)=>IntSuma+Obj.cantidad,0);return IntOtros>0?[...ArrVisibles,{StrEtiqueta:"Otros",IntValor:IntOtros}]:ArrVisibles;}
function SkeletonDashboard({StrNombre}:{StrNombre:string}){return <section className="dashboard-panel dashboard-skeleton" role="status" aria-label={`Cargando ${StrNombre}`}><span/><span/><span/></section>}
function TarjetaKpi({StrTitulo,StrValor,StrDetalle,StrRuta}:{StrTitulo:string;StrValor:string|number;StrDetalle?:string;StrRuta:string}){return <Link className="dashboard-kpi" to={StrRuta}><span>{StrTitulo}</span><strong>{StrValor}</strong>{StrDetalle&&<small>{StrDetalle}</small>}</Link>}

export function PaginaInicio(){
 const{ObjUsuario,Autenticacion_tienePermiso,Autenticacion_manejarErrorProtegido}=useSesion();const[ObjRespuesta,establecerRespuesta]=useState<RespuestaDashboard["datos"]|null>(null);const[StrError,establecerError]=useState<string|null>(null);
 const ArrCategorias=useMemo(()=>(Object.keys(ObjPermisos)as CategoriaDashboard[]).filter(C=>Autenticacion_tienePermiso(ObjPermisos[C])),[Autenticacion_tienePermiso]);
 useEffect(()=>{if(ArrCategorias.length===0)return;let BoolActivo=true;Dashboard_consultar().then(R=>{if(BoolActivo)establecerRespuesta(R.datos)}).catch(E=>{if(BoolActivo&&!Autenticacion_manejarErrorProtegido(E))establecerError(E instanceof Error?E.message:"No fue posible cargar el Dashboard.")});return()=>{BoolActivo=false}},[ArrCategorias,Autenticacion_manejarErrorProtegido]);
 const P=ObjRespuesta?.bloques.produccion,I=ObjRespuesta?.bloques.inventario,V=ObjRespuesta?.bloques.ventas,S=ObjRespuesta?.bloques.sanidad,C=ObjRespuesta?.bloques.costos;
 const ArrAccesos=[["INVENTARIO_CONSULTAR","Inventario","/inventario"],["PRODUCCION_CONSULTAR","Producción","/produccion"],["ALIMENTACION_CONSULTAR","Alimentación","/alimentacion"],["SANIDAD_CONSULTAR","Sanidad","/sanidad"],["VENTAS_CONSULTAR","Ventas","/ventas"]].filter(([Permiso])=>Autenticacion_tienePermiso(Permiso));
 return <section className="pagina-inicio dashboard">
  <header className="encabezado-pagina dashboard-encabezado"><p className="etiqueta">Panel principal</p><h1>{Dashboard_saludo()}, {ObjUsuario?.nombreCompleto.split(" ")[0]}</h1><p>Resumen de la granja{ObjRespuesta?` · ${Inventario_formatearFechaCivil(ObjRespuesta.periodo.fechaDesde)} al ${Inventario_formatearFechaCivil(ObjRespuesta.periodo.fechaHasta)}`:""}</p></header>
  {StrError&&<MensajeError StrTitulo="No fue posible cargar el resumen" StrMensaje={StrError}/>}
  {ArrCategorias.length===0&&<section className="dashboard-bienvenida"><h2>Bienvenido a Granja El Chiflón</h2><p>Utilice los accesos disponibles para continuar con la operación diaria.</p>{ArrAccesos.length>0?<nav aria-label="Accesos operativos">{ArrAccesos.map(([,Texto,Ruta])=><Link className="boton-secundario enlace-boton" to={Ruta} key={Ruta}>{Texto}</Link>)}</nav>:<p>Su sesión está activa. No tiene módulos operativos asignados actualmente.</p>}</section>}
  {!ObjRespuesta&&!StrError&&ArrCategorias.length>0&&<div className="dashboard-carga">{ArrCategorias.map(Cat=><SkeletonDashboard StrNombre={Cat} key={Cat}/>)}</div>}
  {ObjRespuesta&&<>
   {ArrCategorias.some(Cat=>ObjRespuesta.errores?.[Cat])&&<div className="dashboard-errores">{ArrCategorias.flatMap(Cat=>ObjRespuesta.errores?.[Cat]?[<MensajeError key={Cat} StrTitulo={`Resumen de ${Cat} no disponible`} StrMensaje={ObjRespuesta.errores[Cat]!.mensaje}/>]:[])}</div>}
   <section className="dashboard-kpis" aria-label="Indicadores principales">
    {P&&<><TarjetaKpi StrTitulo="Animales activos" StrValor={P.animalesActivos} StrRuta={ObjRutas.produccion}/><TarjetaKpi StrTitulo="Lotes productivos activos" StrValor={P.lotesActivos} StrRuta={ObjRutas.produccion}/></>}
    {I&&<><TarjetaKpi StrTitulo="Productos con existencia" StrValor={I.productosConExistencia} StrRuta={ObjRutas.inventario}/><TarjetaKpi StrTitulo="Lotes con saldo" StrValor={I.lotesConSaldo} StrRuta={ObjRutas.inventario}/></>}
    {V&&<><TarjetaKpi StrTitulo="Ventas confirmadas" StrValor={V.ventasConfirmadas} StrDetalle="Este mes" StrRuta={ObjRutas.ventas}/><TarjetaKpi StrTitulo="Animales vendidos" StrValor={V.animalesVendidos} StrDetalle="Este mes" StrRuta={ObjRutas.ventas}/><TarjetaKpi StrTitulo="Ingreso" StrValor={Ventas_formatearMoneda(V.ingresoMes)} StrDetalle="Este mes" StrRuta={ObjRutas.ventas}/></>}
    {S&&<TarjetaKpi StrTitulo="Aplicaciones sanitarias" StrValor={S.aplicacionesConfirmadas} StrDetalle={`${S.aplicacionesDirectas} directas · ${S.aplicacionesGlobales} globales · Este mes`} StrRuta={ObjRutas.sanidad}/>}
    {C&&<><TarjetaKpi StrTitulo="Costo de Alimentación" StrValor={Ventas_formatearMoneda(C.costoAlimentacion)} StrDetalle="Este mes" StrRuta={ObjRutas.costos}/><TarjetaKpi StrTitulo="Costo de Sanidad" StrValor={Ventas_formatearMoneda(C.costoSanidad)} StrDetalle="Este mes" StrRuta={ObjRutas.costos}/></>}
   </section>
   <div className="dashboard-visualizaciones">
    {P&&<GraficaBarras StrTitulo="Animales por estado" ArrDatos={P.animalesPorEstado.map(X=>({StrEtiqueta:X.estado.replaceAll("_"," "),IntValor:X.cantidad}))}/>}
    {P&&<GraficaBarras StrTitulo="Animales activos por lote" ArrDatos={Dashboard_lotes(P.animalesPorLote)}/>}
    {V&&<GraficaBarras StrTitulo="Ventas por mes" ArrDatos={V.tendencia.map(X=>({StrEtiqueta:Fecha_formatearMesCivil(X.mes),IntValor:X.cantidad,StrDetalle:Ventas_formatearMoneda(X.ingreso)}))}/>}
   </div>
   {I&&<section className="dashboard-panel dashboard-alertas"><header><div><p className="etiqueta">Inventario</p><h2>Alertas y próximos vencimientos</h2></div><Link to={ObjRutas.inventario}>Ver existencias</Link></header><div className="dashboard-alertas-resumen"><span><strong>{I.lotesVencidos}</strong> lotes vencidos</span><span><strong>{I.lotesProximosVencer}</strong> próximos a vencer</span><span><strong>{I.existenciasBajoMinimo}</strong> existencias bajo mínimo</span></div>{I.proximosVencimientos.length===0?<p className="dashboard-vacio">Sin vencimientos próximos</p>:<ul>{I.proximosVencimientos.map(L=><li key={L.loteInventarioId}><div><strong>{L.producto.codigo} · {L.producto.nombre}</strong><span>Lote {L.codigoLote}</span></div><div><strong>{Inventario_formatearDecimal(L.saldo)} {L.unidadMedida}</strong><time dateTime={L.fechaVencimiento??undefined}>{Inventario_formatearFechaCivil(L.fechaVencimiento)}</time></div></li>)}</ul>}</section>}
  </>}
 </section>;
}
