import { Api_solicitar } from "./api.service";
import type * as T from "../types/inventario.types";

function Inventario_parametros<T extends object>(ObjConsulta: T): string {
  const ObjParametros = new URLSearchParams();
  Object.entries(ObjConsulta).forEach(([StrClave, ObjValor]) => { if (ObjValor !== undefined && ObjValor !== "") ObjParametros.set(StrClave, String(ObjValor)); });
  return ObjParametros.toString();
}
function Inventario_listar<TDato, TConsulta extends object = object>(StrRuta: string, ObjConsulta: TConsulta): Promise<T.RespuestaLista<TDato>> { return Api_solicitar(`${StrRuta}?${Inventario_parametros(ObjConsulta)}`); }

export const Inventario_obtenerResumen = () => Api_solicitar<T.RespuestaDato<T.ResumenInventario>>("/api/inventario/resumen");
export const Inventario_listarCategorias = (ObjConsulta: T.ConsultaBase) => Inventario_listar<T.CategoriaInventario>("/api/inventario/categorias", ObjConsulta);
export const Inventario_crearCategoria = (ObjDatos: T.DatosCategoria) => Api_solicitar<T.RespuestaDato<T.CategoriaInventario>>("/api/inventario/categorias", { method: "POST", ObjCuerpo: ObjDatos });
export const Inventario_editarCategoria = (IntId: number, ObjDatos: Partial<T.DatosCategoria>) => Api_solicitar<T.RespuestaDato<T.CategoriaInventario>>(`/api/inventario/categorias/${IntId}`, { method: "PATCH", ObjCuerpo: ObjDatos });
export const Inventario_estadoCategoria = (IntId: number, BoolActivo: boolean) => Api_solicitar<T.RespuestaDato<T.CategoriaInventario>>(`/api/inventario/categorias/${IntId}/estado`, { method: "PATCH", ObjCuerpo: { activo: BoolActivo } });
export const Inventario_listarAlmacenes = (ObjConsulta: T.ConsultaBase) => Inventario_listar<T.AlmacenInventario>("/api/inventario/almacenes", ObjConsulta);
export const Inventario_crearAlmacen = (ObjDatos: T.DatosAlmacen) => Api_solicitar<T.RespuestaDato<T.AlmacenInventario>>("/api/inventario/almacenes", { method: "POST", ObjCuerpo: ObjDatos });
export const Inventario_editarAlmacen = (IntId: number, ObjDatos: Partial<Omit<T.DatosAlmacen, "codigo">>) => Api_solicitar<T.RespuestaDato<T.AlmacenInventario>>(`/api/inventario/almacenes/${IntId}`, { method: "PATCH", ObjCuerpo: ObjDatos });
export const Inventario_estadoAlmacen = (IntId: number, BoolActivo: boolean) => Api_solicitar<T.RespuestaDato<T.AlmacenInventario>>(`/api/inventario/almacenes/${IntId}/estado`, { method: "PATCH", ObjCuerpo: { activo: BoolActivo } });
export const Inventario_listarProductos = (ObjConsulta: T.ConsultaBase & { categoriaId?: number; manejaLotes?: boolean }) => Inventario_listar<T.ProductoInventario>("/api/inventario/productos", ObjConsulta);
export const Inventario_crearProducto = (ObjDatos: T.DatosProducto) => Api_solicitar<T.RespuestaDato<T.ProductoInventario>>("/api/inventario/productos", { method: "POST", ObjCuerpo: ObjDatos });
export const Inventario_editarProducto = (IntId: number, ObjDatos: T.CambiosProducto) => Api_solicitar<T.RespuestaDato<T.ProductoInventario>>(`/api/inventario/productos/${IntId}`, { method: "PATCH", ObjCuerpo: ObjDatos });
export const Inventario_estadoProducto = (IntId: number, BoolActivo: boolean) => Api_solicitar<T.RespuestaDato<T.ProductoInventario>>(`/api/inventario/productos/${IntId}/estado`, { method: "PATCH", ObjCuerpo: { activo: BoolActivo } });
export const Inventario_listarExistencias = (ObjConsulta: { pagina: number; limite: number; productoId?: number; inventarioId?: number; bajoMinimo?: boolean }) => Inventario_listar<T.ExistenciaInventario>("/api/inventario/existencias", ObjConsulta);
export const Inventario_editarMinimo = (IntId: number, StrMinimo: T.DecimalInventario) => Api_solicitar<T.RespuestaDato<T.ExistenciaInventario>>(`/api/inventario/existencias/${IntId}/minimo`, { method: "PATCH", ObjCuerpo: { existenciaMinima: StrMinimo } });
export const Inventario_listarProveedores = (ObjConsulta: T.ConsultaBase) => Inventario_listar<T.ProveedorInventario>("/api/inventario/proveedores", ObjConsulta);
export const Inventario_listarProveedoresProductos = (ObjConsulta: T.ConsultaBase & { proveedorId?: number; productoId?: number }) => Inventario_listar<T.ProveedorProducto>("/api/inventario/proveedores-productos", ObjConsulta);
export const Inventario_gestionarProveedorProducto = (ObjDatos: { proveedorId: number; productoId: number; precioReferencia?: string | null; activo?: boolean }) => Api_solicitar<T.RespuestaDato<T.ProveedorProducto>>("/api/inventario/proveedores-productos", { method: "PUT", ObjCuerpo: ObjDatos });
export const Inventario_listarLotes = (ObjConsulta: T.ConsultaBase & { productoId?: number; inventarioId?: number }) => Inventario_listar<T.LoteInventario>("/api/inventario/lotes", ObjConsulta);
export const Inventario_editarLote = (IntId: number, ObjDatos: { fechaVencimiento?: string | null; observaciones?: string | null }) => Api_solicitar<T.RespuestaDato<T.LoteInventario>>(`/api/inventario/lotes/${IntId}`, { method: "PATCH", ObjCuerpo: ObjDatos });
export const Inventario_estadoLote = (IntId: number, BoolActivo: boolean) => Api_solicitar<T.RespuestaDato<T.LoteInventario>>(`/api/inventario/lotes/${IntId}/estado`, { method: "PATCH", ObjCuerpo: { activo: BoolActivo } });
export const Inventario_registrarEntrada = (ObjDatos: T.DatosEntrada) => Api_solicitar<T.RespuestaDato<T.MovimientoInventario>>("/api/inventario/entradas", { method: "POST", ObjCuerpo: ObjDatos });
export const Inventario_registrarSalida = (ObjDatos: T.DatosSalida) => Api_solicitar<T.RespuestaDato<T.MovimientoInventario>>("/api/inventario/salidas", { method: "POST", ObjCuerpo: ObjDatos });
export const Inventario_registrarAjuste = (ObjDatos: T.DatosAjuste) => Api_solicitar<T.RespuestaDato<T.MovimientoInventario>>("/api/inventario/ajustes", { method: "POST", ObjCuerpo: ObjDatos });
export const Inventario_listarMovimientos = (ObjConsulta: { pagina: number; limite: number; productoId?: number; inventarioId?: number; tipo?: T.TipoMovimiento; subtipo?: string }) => Inventario_listar<T.MovimientoInventario>("/api/inventario/transacciones", ObjConsulta);
export const Inventario_revertirMovimiento = (IntId: number) => Api_solicitar<T.RespuestaDato<unknown>>(`/api/inventario/transacciones/${IntId}/revertir`, { method: "POST", ObjCuerpo: {} });
export const Inventario_listarTransferencias = (ObjConsulta: { pagina: number; limite: number; productoId?: number; inventarioOrigenId?: number; inventarioDestinoId?: number; revertida?: boolean }) => Inventario_listar<T.TransferenciaInventario>("/api/inventario/transferencias", ObjConsulta);
export const Inventario_registrarTransferencia = (ObjDatos: T.DatosTransferencia) => Api_solicitar<T.RespuestaDato<T.TransferenciaInventario>>("/api/inventario/transferencias", { method: "POST", ObjCuerpo: ObjDatos });
export const Inventario_revertirTransferencia = (IntId: number) => Api_solicitar<T.RespuestaDato<unknown>>(`/api/inventario/transferencias/${IntId}/revertir`, { method: "POST", ObjCuerpo: {} });
export const Inventario_ejecutarDiagnostico = () => Api_solicitar<T.RespuestaDato<T.DiagnosticoInventario>>("/api/inventario/diagnosticos/reconciliacion", { method: "POST", ObjCuerpo: {} });
