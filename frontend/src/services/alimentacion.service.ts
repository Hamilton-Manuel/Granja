import { Api_solicitar } from "./api.service";
import type * as T from "../types/alimentacion.types";
function Alimentacion_parametros(Obj: T.ConsultaAlimentacion) {
  const P = new URLSearchParams({
    pagina: String(Obj.pagina),
    limite: String(Obj.limite),
  });
  if (Obj.busqueda) P.set("busqueda", Obj.busqueda);
  if (Obj.estado) P.set("estado", Obj.estado);
  if (Obj.destino) P.set("destino", Obj.destino);
  if (Obj.formulaId) P.set("formulaId", String(Obj.formulaId));
  if (Obj.fechaDesde) P.set("fechaDesde", Obj.fechaDesde);
  if (Obj.fechaHasta) P.set("fechaHasta", Obj.fechaHasta);
  return P.toString();
}
export const Alimentacion_listar = (Obj: T.ConsultaAlimentacion) =>
  Api_solicitar<T.RespuestaLista<T.RegistroAlimentacion>>(
    `/api/alimentacion?${Alimentacion_parametros(Obj)}`,
  );
export const Alimentacion_obtener = (IntId: number) =>
  Api_solicitar<T.RespuestaDato<T.RegistroAlimentacion>>(
    `/api/alimentacion/${IntId}`,
  );
export const Alimentacion_revertir = (IntId: number, StrMotivo: string) =>
  Api_solicitar<T.RespuestaDato<unknown>>(
    `/api/alimentacion/${IntId}/revertir`,
    { method: "POST", ObjCuerpo: { motivo: StrMotivo } },
  );
export const Alimentacion_listarProductos = () =>
  Api_solicitar<T.RespuestaDato<T.ProductoAlimentacion[]>>(
    "/api/alimentacion/productos",
  );
export const Alimentacion_habilitarProducto = (
  IntId: number,
  BoolActivo: boolean,
) =>
  Api_solicitar<T.RespuestaDato<unknown>>(
    `/api/alimentacion/productos/${IntId}/habilitacion`,
    { method: "PATCH", ObjCuerpo: { activo: BoolActivo } },
  );
export const Alimentacion_listarFormulas = () =>
  Api_solicitar<T.RespuestaDato<T.FormulaAlimentacion[]>>(
    "/api/alimentacion/formulas",
  );
export const Alimentacion_crearFormula = (Obj: T.DatosFormula) =>
  Api_solicitar<T.RespuestaDato<T.FormulaAlimentacion>>(
    "/api/alimentacion/formulas",
    { method: "POST", ObjCuerpo: Obj },
  );
export const Alimentacion_editarFormula = (
  IntId: number,
  Obj: T.DatosFormula,
) =>
  Api_solicitar<T.RespuestaDato<T.FormulaAlimentacion>>(
    `/api/alimentacion/formulas/${IntId}`,
    { method: "PATCH", ObjCuerpo: Obj },
  );
export const Alimentacion_estadoFormula = (
  IntId: number,
  BoolActivo: boolean,
) =>
  Api_solicitar<T.RespuestaDato<T.FormulaAlimentacion>>(
    `/api/alimentacion/formulas/${IntId}/estado`,
    { method: "PATCH", ObjCuerpo: { activo: BoolActivo } },
  );
export const Alimentacion_ejecutarDiagnostico = () =>
  Api_solicitar<T.RespuestaDato<T.DiagnosticoAlimentacion>>(
    "/api/alimentacion/diagnosticos/reconciliacion",
    { method: "POST", ObjCuerpo: {} },
  );
export const Alimentacion_buscarDestinosAnimales = (StrBusqueda: string) =>
  Api_solicitar<T.RespuestaLista<T.DestinoAnimalAlimentacion>>(`/api/alimentacion/destinos/animales?pagina=1&limite=20&busqueda=${encodeURIComponent(StrBusqueda)}`).then((Obj) => Obj.datos);
export const Alimentacion_buscarDestinosLotes = (StrBusqueda: string) =>
  Api_solicitar<T.RespuestaLista<T.DestinoLoteAlimentacion>>(`/api/alimentacion/destinos/lotes?pagina=1&limite=20&busqueda=${encodeURIComponent(StrBusqueda)}`).then((Obj) => Obj.datos);
export const Alimentacion_buscarAlmacenes = (StrBusqueda: string) =>
  Api_solicitar<T.RespuestaDato<T.AlmacenAlimentacion[]>>(`/api/alimentacion/almacenes${StrBusqueda ? `?busqueda=${encodeURIComponent(StrBusqueda)}` : ""}`).then((Obj) => Obj.datos);
export const Alimentacion_buscarExistencias = (IntProductoId: number, IntInventarioId?: number) =>
  Api_solicitar<T.RespuestaDato<T.ExistenciaAlimentacion[]>>(`/api/alimentacion/existencias?productoId=${IntProductoId}${IntInventarioId ? `&inventarioId=${IntInventarioId}` : ""}`).then((Obj) => Obj.datos);
export const Alimentacion_buscarLotesInventario = (IntProductoId: number, IntInventarioId: number, StrFecha?: string) =>
  Api_solicitar<T.RespuestaDato<T.LoteFuenteAlimentacion[]>>(`/api/alimentacion/lotes-inventario?productoId=${IntProductoId}&inventarioId=${IntInventarioId}${StrFecha ? `&fechaAlimentacion=${encodeURIComponent(StrFecha)}` : ""}`).then((Obj) => Obj.datos);
export const Alimentacion_registrar = (Obj: T.DatosRegistroAlimentacion) =>
  Api_solicitar<T.RespuestaDato<{ alimentacionId: number }>>("/api/alimentacion", { method: "POST", ObjCuerpo: Obj });
