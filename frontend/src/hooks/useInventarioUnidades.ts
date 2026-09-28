import { useEffect, useState } from "react";
import { Inventario_listarUnidades } from "../services/inventario.service";
import type { UnidadInventario } from "../types/inventario.types";
import { Inventario_mensajeError } from "./useInventarioLista";

export function useInventarioUnidades(BoolHabilitado = true) {
  const [ArrUnidades, establecerUnidades] = useState<UnidadInventario[]>([]);
  const [BoolCargando, establecerCargando] = useState(true);
  const [StrError, establecerError] = useState<string | null>(null);
  useEffect(() => {
    if (!BoolHabilitado) { establecerCargando(false); return; }
    establecerCargando(true);
    let BoolVigente = true;
    async function Inventario_cargarUnidades() {
      try {
        const ArrResultado: UnidadInventario[] = [];
        let IntPagina = 1;
        let IntTotal = 0;
        do {
          const ObjRespuesta = await Inventario_listarUnidades({ pagina: IntPagina++, limite: 100 });
          if (!BoolVigente) return;
          ArrResultado.push(...ObjRespuesta.datos); IntTotal = ObjRespuesta.paginacion.total;
          if (!ObjRespuesta.datos.length) break;
        } while (ArrResultado.length < IntTotal);
        establecerUnidades(ArrResultado);
      } catch (ObjError) { if (BoolVigente) establecerError(Inventario_mensajeError(ObjError)); }
      finally { if (BoolVigente) establecerCargando(false); }
    }
    void Inventario_cargarUnidades();
    return () => { BoolVigente = false; };
  }, [BoolHabilitado]);
  return { ArrUnidades, BoolCargando, StrError };
}
