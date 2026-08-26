import { Api_solicitar } from "./api.service";
import type { AnimalVentaLookup, ClienteVenta, ConsultaVentas, DiagnosticoVentas, LoteVenta, RegistroVenta, RespuestaDatoVentas, RespuestaListaVentas, Venta } from "../types/ventas.types";
import { Ventas_normalizarBusquedaRecibo } from "../utils/ventas";

function Ventas_parametros(ObjConsulta: object): string { const ObjParametros=new URLSearchParams(); for(const [StrClave,ObjValor] of Object.entries(ObjConsulta))if(ObjValor!==undefined&&ObjValor!=="")ObjParametros.set(StrClave,String(ObjValor)); return ObjParametros.toString(); }
export const Ventas_listar=(ObjConsulta:ConsultaVentas)=>Api_solicitar<RespuestaListaVentas<Venta>>(`/api/ventas?${Ventas_parametros({...ObjConsulta,...(ObjConsulta.busqueda?{busqueda:Ventas_normalizarBusquedaRecibo(ObjConsulta.busqueda)}:{})})}`);
export const Ventas_obtener=(IntVentaId:number)=>Api_solicitar<RespuestaDatoVentas<Venta>>(`/api/ventas/${IntVentaId}`);
export const Ventas_registrar=(ObjDatos:RegistroVenta)=>Api_solicitar<RespuestaDatoVentas<Venta>>("/api/ventas",{method:"POST",ObjCuerpo:ObjDatos});
export const Ventas_anular=(IntVentaId:number,StrMotivo:string)=>Api_solicitar<RespuestaDatoVentas<Venta>>(`/api/ventas/${IntVentaId}/revertir`,{method:"POST",ObjCuerpo:{motivo:StrMotivo}});
export const Ventas_buscarClientes=(StrBusqueda:string)=>Api_solicitar<RespuestaListaVentas<ClienteVenta>>(`/api/ventas/clientes?${Ventas_parametros({busqueda:StrBusqueda,pagina:1,limite:20})}`).then(ObjRespuesta=>ObjRespuesta.datos);
export const Ventas_buscarLotes=(StrBusqueda:string)=>Api_solicitar<RespuestaListaVentas<LoteVenta>>(`/api/ventas/lotes?${Ventas_parametros({busqueda:StrBusqueda,pagina:1,limite:20})}`).then(ObjRespuesta=>ObjRespuesta.datos);
export const Ventas_buscarAnimales=(StrBusqueda:string,IntLoteProduccionId?:number)=>Api_solicitar<RespuestaListaVentas<AnimalVentaLookup>>(`/api/ventas/animales?${Ventas_parametros({busqueda:StrBusqueda,loteProduccionId:IntLoteProduccionId,pagina:1,limite:20})}`).then(ObjRespuesta=>ObjRespuesta.datos);
export async function Ventas_buscarTodosAnimalesLote(IntLoteProduccionId:number):Promise<AnimalVentaLookup[]>{const ArrResultado:AnimalVentaLookup[]=[];let IntPagina=1;let IntTotal=0;do{const ObjRespuesta=await Api_solicitar<RespuestaListaVentas<AnimalVentaLookup>>(`/api/ventas/animales?${Ventas_parametros({loteProduccionId:IntLoteProduccionId,pagina:IntPagina,limite:100})}`);ArrResultado.push(...ObjRespuesta.datos);IntTotal=ObjRespuesta.paginacion.total;IntPagina+=1;}while(ArrResultado.length<IntTotal);return ArrResultado;}
export const Ventas_diagnosticar=()=>Api_solicitar<RespuestaDatoVentas<DiagnosticoVentas>>("/api/ventas/diagnosticos/reconciliacion",{method:"POST",ObjCuerpo:{}});
