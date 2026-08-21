import { Router, type NextFunction, type Request, type Response } from "express";
import { ErrorAplicacion } from "../../errors/error-aplicacion.js";
import { Middleware_requerirAutenticacion, Middleware_requerirPermiso } from "../../middleware/autenticacion.middleware.js";
import * as C from "./inventario.controller.js";
import { Inventario_formatearRespuesta } from "./inventario.service.js";

function Inventario_requerirPermisoSubtipo(ObjPermisos: Record<string, string>) { return (Req: Request, _Res: Response, Next: NextFunction) => { const StrSubtipo = typeof Req.body === "object" && Req.body !== null && "subtipo" in Req.body ? String(Req.body.subtipo) : ""; const StrPermiso = ObjPermisos[StrSubtipo]; if (!StrPermiso) return Next(new ErrorAplicacion(400, "SUBTIPO_NO_PERMITIDO", "El subtipo no está permitido para esta operación.")); if (!Req.ObjAutenticacion?.ArrPermisos.includes(StrPermiso)) return Next(new ErrorAplicacion(403, "PERMISO_INSUFICIENTE", "No tiene permiso para este subtipo de operación.")); Next(); }; }
export function Inventario_crearRouter(): Router {
  const R = Router(); R.use(Middleware_requerirAutenticacion); R.use((_Req, Res, Next) => { const ObjJsonOriginal = Res.json.bind(Res); Res.json = ((ObjCuerpo: unknown) => ObjJsonOriginal(Inventario_formatearRespuesta(ObjCuerpo))) as typeof Res.json; Next(); });
  R.get("/categorias", Middleware_requerirPermiso("INVENTARIO_CONSULTAR"), C.Inventario_listarCategorias); R.post("/categorias", Middleware_requerirPermiso("INVENTARIO_CATEGORIAS_CREAR"), C.Inventario_crearCategoria); R.patch("/categorias/:categoriaId", Middleware_requerirPermiso("INVENTARIO_CATEGORIAS_EDITAR"), C.Inventario_editarCategoria); R.patch("/categorias/:categoriaId/estado", Middleware_requerirPermiso("INVENTARIO_CATEGORIAS_CAMBIAR_ESTADO"), C.Inventario_estadoCategoria);
  R.get("/almacenes", Middleware_requerirPermiso("INVENTARIO_CONSULTAR"), C.Inventario_listarAlmacenes); R.post("/almacenes", Middleware_requerirPermiso("INVENTARIO_ALMACENES_CREAR"), C.Inventario_crearAlmacen); R.patch("/almacenes/:inventarioId", Middleware_requerirPermiso("INVENTARIO_ALMACENES_EDITAR"), C.Inventario_editarAlmacen); R.patch("/almacenes/:inventarioId/estado", Middleware_requerirPermiso("INVENTARIO_ALMACENES_CAMBIAR_ESTADO"), C.Inventario_estadoAlmacen);
  R.get("/productos", Middleware_requerirPermiso("INVENTARIO_CONSULTAR"), C.Inventario_listarProductos); R.post("/productos", Middleware_requerirPermiso("INVENTARIO_PRODUCTOS_CREAR"), C.Inventario_crearProducto); R.patch("/productos/:productoId", Middleware_requerirPermiso("INVENTARIO_PRODUCTOS_EDITAR"), C.Inventario_editarProducto); R.patch("/productos/:productoId/estado", Middleware_requerirPermiso("INVENTARIO_PRODUCTOS_CAMBIAR_ESTADO"), C.Inventario_estadoProducto);
  R.get("/resumen", Middleware_requerirPermiso("INVENTARIO_CONSULTAR"), C.Inventario_resumen);
  R.get("/proveedores", Middleware_requerirPermiso("INVENTARIO_CONSULTAR"), C.Inventario_listarProveedores);
  R.get("/proveedores-productos", Middleware_requerirPermiso("INVENTARIO_CONSULTAR"), C.Inventario_listarProveedoresProductos); R.put("/proveedores-productos", Middleware_requerirPermiso("INVENTARIO_PROVEEDORES_PRODUCTOS_GESTIONAR"), C.Inventario_gestionarProveedorProducto);
  R.get("/existencias", Middleware_requerirPermiso("INVENTARIO_CONSULTAR"), C.Inventario_listarExistencias); R.patch("/existencias/:inventarioProductoId/minimo", Middleware_requerirPermiso("INVENTARIO_EXISTENCIAS_EDITAR_MINIMO"), C.Inventario_editarMinimo);
  R.get("/lotes", Middleware_requerirPermiso("INVENTARIO_CONSULTAR"), C.Inventario_listarLotes); R.patch("/lotes/:loteInventarioId", Middleware_requerirPermiso("INVENTARIO_LOTES_EDITAR"), C.Inventario_editarLote); R.patch("/lotes/:loteInventarioId/estado", Middleware_requerirPermiso("INVENTARIO_LOTES_CAMBIAR_ESTADO"), C.Inventario_estadoLote);
  R.get("/movimientos", Middleware_requerirPermiso("INVENTARIO_CONSULTAR"), C.Inventario_listarMovimientos); R.get("/transacciones", Middleware_requerirPermiso("INVENTARIO_CONSULTAR"), C.Inventario_listarMovimientos);
  R.get("/transferencias", Middleware_requerirPermiso("INVENTARIO_CONSULTAR"), C.Inventario_listarTransferencias);
  R.post("/entradas", Inventario_requerirPermisoSubtipo({ COMPRA: "INVENTARIO_ENTRADAS_CREAR", INVENTARIO_INICIAL: "INVENTARIO_AJUSTES_CREAR" }), C.Inventario_entrada);
  R.post("/salidas", Inventario_requerirPermisoSubtipo({ DEVOLUCION_PROVEEDOR: "INVENTARIO_SALIDAS_CREAR", MERMA: "INVENTARIO_DISPOSICIONES_CREAR", DISPOSICION: "INVENTARIO_DISPOSICIONES_CREAR" }), C.Inventario_salida);
  R.post("/ajustes", Middleware_requerirPermiso("INVENTARIO_AJUSTES_CREAR"), C.Inventario_ajuste); R.post("/transferencias", Middleware_requerirPermiso("INVENTARIO_TRANSFERENCIAS_CREAR"), C.Inventario_transferencia);
  R.post("/transacciones/:transaccionInventarioId/revertir", Middleware_requerirPermiso("INVENTARIO_MOVIMIENTOS_REVERTIR"), C.Inventario_revertir);
  R.post("/movimientos/:transaccionInventarioId/revertir", Middleware_requerirPermiso("INVENTARIO_MOVIMIENTOS_REVERTIR"), C.Inventario_revertir);
  R.post("/transferencias/:transferenciaId/revertir", Middleware_requerirPermiso("INVENTARIO_MOVIMIENTOS_REVERTIR"), C.Inventario_revertirTransferencia);
  R.post("/diagnosticos/reconciliacion", Middleware_requerirPermiso("INVENTARIO_RECONCILIACION_EJECUTAR"), C.Inventario_reconciliar);
  return R;
}
