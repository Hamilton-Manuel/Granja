import { useCallback, useEffect, useState } from "react";
import { Alimentacion_listar } from "../services/alimentacion.service";
import type {
  ConsultaAlimentacion,
  RegistroAlimentacion,
} from "../types/alimentacion.types";
import { ErrorApi } from "../types/api.types";
export function Alimentacion_mensajeError(E: unknown) {
  if (E instanceof ErrorApi) {
    const M: Record<string, string> = {
      STOCK_INSUFICIENTE: "No existe stock suficiente.",
      PRODUCTO_NO_HABILITADO: "El producto ya no está habilitado.",
      LOTE_VENCIDO: "El lote estaba vencido en la fecha efectiva.",
      ALIMENTACION_YA_REVERTIDA: "La alimentación ya fue revertida.",
      DESTINO_ANIMAL_INVALIDO: "El animal no está disponible.",
      DESTINO_LOTE_INVALIDO: "El lote no está disponible.",
    };
    return M[E.StrCodigo] ?? E.message;
  }
  return "No fue posible completar la operación.";
}
export function useAlimentacion() {
  const [ObjConsulta, establecerConsulta] = useState<ConsultaAlimentacion>({
    pagina: 1,
    limite: 20,
  });
  const [ArrDatos, establecerDatos] = useState<RegistroAlimentacion[]>([]);
  const [IntTotal, establecerTotal] = useState(0);
  const [BoolCargando, establecerCargando] = useState(true);
  const [StrError, establecerError] = useState<string | null>(null);
  const Alimentacion_cargar = useCallback(async () => {
    establecerCargando(true);
    establecerError(null);
    try {
      const R = await Alimentacion_listar(ObjConsulta);
      establecerDatos(R.datos);
      establecerTotal(R.paginacion.total);
    } catch (E) {
      establecerError(Alimentacion_mensajeError(E));
    } finally {
      establecerCargando(false);
    }
  }, [ObjConsulta]);
  useEffect(() => {
    void Alimentacion_cargar();
  }, [Alimentacion_cargar]);
  return {
    ObjConsulta,
    establecerConsulta,
    ArrDatos,
    IntTotal,
    BoolCargando,
    StrError,
    Alimentacion_cargar,
  };
}
