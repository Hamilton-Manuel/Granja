import { Api_solicitar } from "./api.service";
import type * as T from "../types/concentrados.types";
const StrBase = "/api/alimentacion/concentrados";
type Dato<T> = { datos: T };
function Alimentacion_consulta(Obj: T.ConsultaConcentrados) {
  const ObjParametros = new URLSearchParams();
  Object.entries(Obj).forEach(([StrClave, ObjValor]) => { if (ObjValor !== undefined && ObjValor !== "") ObjParametros.set(StrClave, String(ObjValor)); });
  return ObjParametros.toString();
}
export const Alimentacion_concentrados = (Obj: T.ConsultaConcentrados) => Api_solicitar<T.ListaConcentrados<T.Concentrado>>(`${StrBase}?${Alimentacion_consulta(Obj)}`);
export const Alimentacion_concentrado = (IntId: number) => Api_solicitar<Dato<T.Concentrado>>(`${StrBase}/${IntId}`).then(Obj => Obj.datos);
export const Alimentacion_clasificar = (IntProducto: number) => Api_solicitar<Dato<unknown>>(StrBase, { method: "POST", ObjCuerpo: { productoId: IntProducto } });
export const Alimentacion_estadoConcentrado = (IntId: number, BoolActivo: boolean) => Api_solicitar<Dato<unknown>>(`${StrBase}/${IntId}/estado`, { method: "PATCH", ObjCuerpo: { activo: BoolActivo } });
export const Alimentacion_catalogosConcentrados = () => Api_solicitar<Dato<T.CatalogosConcentrados>>(`${StrBase}/catalogos`).then(Obj => Obj.datos);
export const Alimentacion_productosConcentrados = (StrBusqueda: string) => Api_solicitar<Dato<T.ProductoConcentrado[]>>(`${StrBase}/productos?busqueda=${encodeURIComponent(StrBusqueda)}`).then(Obj => Obj.datos);
export const Alimentacion_recetasConcentrado = (Obj: T.ConsultaConcentrados) => Api_solicitar<T.ListaConcentrados<T.RecetaConcentrado>>(`${StrBase}/recetas?${Alimentacion_consulta(Obj)}`);
export const Alimentacion_recetaConcentrado = (IntId: number) => Api_solicitar<Dato<T.RecetaConcentrado>>(`${StrBase}/recetas/${IntId}`).then(Obj => Obj.datos);
export const Alimentacion_guardarRecetaConcentrado = (Obj: T.DatosRecetaConcentrado, ObjEdicion?: { recetaId: number; version: number }) => Api_solicitar<Dato<unknown>>(`${StrBase}/recetas${ObjEdicion ? `/${ObjEdicion.recetaId}` : ""}`, { method: ObjEdicion ? "PATCH" : "POST", ObjCuerpo: { ...Obj, ...(ObjEdicion ? { versionEsperada: ObjEdicion.version } : {}) } });
export const Alimentacion_estadoRecetaConcentrado = (Obj: T.RecetaConcentrado) => Api_solicitar<Dato<unknown>>(`${StrBase}/recetas/${Obj.recetaId}/estado`, { method: "PATCH", ObjCuerpo: { activo: !Obj.activo, versionEsperada: Obj.version } });
export const Alimentacion_previsualizarConcentrado = (Obj: T.DatosPreviaConcentrado) => Api_solicitar<Dato<T.PreviaConcentrado>>(`${StrBase}/elaboraciones/previsualizar`, { method: "POST", ObjCuerpo: Obj }).then(Obj => Obj.datos);
export const Alimentacion_confirmarConcentrado = (Obj: T.DatosConfirmacionConcentrado) => Api_solicitar<Dato<T.ElaboracionConcentrado> & { reutilizada: boolean }>(`${StrBase}/elaboraciones`, { method: "POST", ObjCuerpo: Obj });
export const Alimentacion_historialConcentrados = (Obj: T.ConsultaConcentrados) => Api_solicitar<T.ListaConcentrados<T.ResumenElaboracion>>(`${StrBase}/elaboraciones?${Alimentacion_consulta(Obj)}`);
export const Alimentacion_detalleConcentrado = (IntId: number) => Api_solicitar<Dato<T.ElaboracionConcentrado>>(`${StrBase}/elaboraciones/${IntId}`).then(Obj => Obj.datos);
export const Alimentacion_dependenciasConcentrado = (IntId: number) => Api_solicitar<Dato<T.DependenciasConcentrado>>(`${StrBase}/elaboraciones/${IntId}/dependencias`).then(Obj => Obj.datos);
export const Alimentacion_revertirConcentrado = (IntId: number, StrMotivo: string) => Api_solicitar<Dato<T.ElaboracionConcentrado> & { reutilizada: boolean }>(`${StrBase}/elaboraciones/${IntId}/revertir`, { method: "POST", ObjCuerpo: { motivo: StrMotivo } });
