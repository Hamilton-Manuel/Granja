export const ArrCatalogoPermisosInventario = [
  ["INVENTARIO_CONSULTAR", "Consultar inventario", "CONSULTAR"],
  ["INVENTARIO_CATEGORIAS_CREAR", "Crear categorías de inventario", "CREAR"],
  ["INVENTARIO_CATEGORIAS_EDITAR", "Editar categorías de inventario", "EDITAR"],
  ["INVENTARIO_CATEGORIAS_CAMBIAR_ESTADO", "Cambiar estado de categorías", "CAMBIAR_ESTADO"],
  ["INVENTARIO_ALMACENES_CREAR", "Crear almacenes", "CREAR"],
  ["INVENTARIO_ALMACENES_EDITAR", "Editar almacenes", "EDITAR"],
  ["INVENTARIO_ALMACENES_CAMBIAR_ESTADO", "Cambiar estado de almacenes", "CAMBIAR_ESTADO"],
  ["INVENTARIO_PRODUCTOS_CREAR", "Crear productos de inventario", "CREAR"],
  ["INVENTARIO_PRODUCTOS_EDITAR", "Editar productos de inventario", "EDITAR"],
  ["INVENTARIO_PRODUCTOS_CAMBIAR_ESTADO", "Cambiar estado de productos", "CAMBIAR_ESTADO"],
  ["INVENTARIO_PROVEEDORES_PRODUCTOS_GESTIONAR", "Gestionar productos de proveedores", "GESTIONAR"],
  ["INVENTARIO_EXISTENCIAS_EDITAR_MINIMO", "Editar existencia mínima", "EDITAR_MINIMO"],
  ["INVENTARIO_LOTES_EDITAR", "Editar lotes", "EDITAR"],
  ["INVENTARIO_LOTES_CAMBIAR_ESTADO", "Cambiar estado de lotes", "CAMBIAR_ESTADO"],
  ["INVENTARIO_ENTRADAS_CREAR", "Registrar entradas", "CREAR"],
  ["INVENTARIO_SALIDAS_CREAR", "Registrar salidas operativas", "CREAR"],
  ["INVENTARIO_TRANSFERENCIAS_CREAR", "Registrar transferencias", "CREAR"],
  ["INVENTARIO_AJUSTES_CREAR", "Registrar ajustes", "CREAR"],
  ["INVENTARIO_DISPOSICIONES_CREAR", "Registrar mermas y disposiciones", "CREAR"],
  ["INVENTARIO_MOVIMIENTOS_REVERTIR", "Revertir movimientos", "REVERTIR"],
  ["INVENTARIO_RECONCILIACION_EJECUTAR", "Diagnosticar consistencia de inventario", "EJECUTAR"],
].map(([StrCodigo, StrNombre, StrAccion]) => ({ StrCodigo: StrCodigo!, StrNombre: StrNombre!, StrAccion: StrAccion! }));

export const ArrPermisosInventarioOperador = [
  "INVENTARIO_CONSULTAR",
  "INVENTARIO_ENTRADAS_CREAR",
  "INVENTARIO_SALIDAS_CREAR",
  "INVENTARIO_TRANSFERENCIAS_CREAR",
] as const;

export const ObjSubtiposInventario = {
  COMPRA: "COMPRA",
  INVENTARIO_INICIAL: "INVENTARIO_INICIAL",
  DEVOLUCION_PROVEEDOR: "DEVOLUCION_PROVEEDOR",
  MERMA: "MERMA",
  DISPOSICION: "DISPOSICION",
  ALIMENTACION: "ALIMENTACION",
  SANIDAD: "SANIDAD",
  TRANSFERENCIA_ENTRADA: "TRANSFERENCIA_ENTRADA",
  TRANSFERENCIA_SALIDA: "TRANSFERENCIA_SALIDA",
  CONTEO_FISICO: "CONTEO_FISICO",
  REVERSION: "REVERSION",
} as const;

export function Inventario_canonicalizarCodigo(StrCodigo: string): string {
  return StrCodigo.trim().replace(/\s+/g, "").toUpperCase();
}
