import { useCallback, useEffect, useState } from "react";
import * as S from "../services/inventario.service";
import type { AlmacenInventario, CategoriaInventario, LoteInventario, ProductoInventario, ProveedorInventario } from "../types/inventario.types";
import { useSesion } from "./useSesion";
import { Inventario_mensajeError } from "./useInventarioLista";

export function useInventarioCatalogos() {
  const { Autenticacion_manejarErrorProtegido } = useSesion();
  const [ArrCategorias, establecerCategorias] = useState<CategoriaInventario[]>([]); const [ArrAlmacenes, establecerAlmacenes] = useState<AlmacenInventario[]>([]); const [ArrProductos, establecerProductos] = useState<ProductoInventario[]>([]); const [ArrProveedores, establecerProveedores] = useState<ProveedorInventario[]>([]); const [ArrLotes, establecerLotes] = useState<LoteInventario[]>([]); const [StrError, establecerError] = useState<string | null>(null); const [BoolCargando, establecerCargando] = useState(true);
  const Inventario_cargarCatalogos = useCallback(async () => { establecerError(null); try { const ObjBase = { pagina: 1, limite: 100, estado: "ACTIVO" as const }; const [ObjCategorias, ObjAlmacenes, ObjProductos, ObjProveedores, ObjLotes] = await Promise.all([S.Inventario_listarCategorias(ObjBase), S.Inventario_listarAlmacenes(ObjBase), S.Inventario_listarProductos(ObjBase), S.Inventario_listarProveedores(ObjBase), S.Inventario_listarLotes({ ...ObjBase })]); establecerCategorias(ObjCategorias.datos); establecerAlmacenes(ObjAlmacenes.datos); establecerProductos(ObjProductos.datos); establecerProveedores(ObjProveedores.datos); establecerLotes(ObjLotes.datos); } catch (ObjError) { if (!Autenticacion_manejarErrorProtegido(ObjError)) establecerError(Inventario_mensajeError(ObjError)); } finally { establecerCargando(false); } }, [Autenticacion_manejarErrorProtegido]);
  useEffect(() => { void Inventario_cargarCatalogos(); }, [Inventario_cargarCatalogos]);
  return { ArrCategorias, ArrAlmacenes, ArrProductos, ArrProveedores, ArrLotes, StrError, BoolCargando, Inventario_cargarCatalogos };
}
