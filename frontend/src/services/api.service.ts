import { ErrorApi, type ErrorApiPublico } from "../types/api.types";

interface OpcionesSolicitud extends Omit<RequestInit, "body" | "credentials"> {
  ObjCuerpo?: unknown;
}

const ObjMensajesEstado: Record<number, { StrCodigo: string; StrMensaje: string }> = {
  400: { StrCodigo: "SOLICITUD_INVALIDA", StrMensaje: "Los datos enviados no son válidos." },
  401: { StrCodigo: "NO_AUTENTICADO", StrMensaje: "Debe iniciar sesión." },
  403: { StrCodigo: "PERMISO_INSUFICIENTE", StrMensaje: "No tiene permiso para realizar esta operación." },
  404: { StrCodigo: "RECURSO_NO_ENCONTRADO", StrMensaje: "El recurso solicitado no existe." },
  409: { StrCodigo: "CONFLICTO", StrMensaje: "La operación entra en conflicto con el estado actual." },
  429: { StrCodigo: "DEMASIADOS_INTENTOS", StrMensaje: "Se realizaron demasiados intentos. Intente nuevamente más tarde." },
  500: { StrCodigo: "ERROR_INTERNO", StrMensaje: "Ocurrió un error interno. Intente nuevamente." },
};

function Api_esErrorPublico(ObjValor: unknown): ObjValor is ErrorApiPublico {
  if (typeof ObjValor !== "object" || ObjValor === null || !("error" in ObjValor)) return false;
  const ObjError = ObjValor.error;
  return typeof ObjError === "object" && ObjError !== null &&
    "codigo" in ObjError && typeof ObjError.codigo === "string" &&
    "mensaje" in ObjError && typeof ObjError.mensaje === "string";
}

function Api_obtenerErrorGenerico(IntEstadoHttp: number): ErrorApi {
  const ObjMensaje = ObjMensajesEstado[IntEstadoHttp] ?? ObjMensajesEstado[500];
  return new ErrorApi(IntEstadoHttp, ObjMensaje.StrCodigo, ObjMensaje.StrMensaje);
}

async function Api_leerContenido(ObjRespuesta: Response): Promise<unknown | undefined> {
  if (ObjRespuesta.status === 204) return undefined;
  const StrContenido = await ObjRespuesta.text();
  if (StrContenido.trim().length === 0) return undefined;
  try {
    return JSON.parse(StrContenido) as unknown;
  } catch {
    return undefined;
  }
}

export async function Api_solicitar<T = undefined>(
  StrRuta: string,
  ObjOpciones: OpcionesSolicitud = {},
): Promise<T> {
  const { ObjCuerpo, ...ObjOpcionesFetch } = ObjOpciones;
  const ObjEncabezados = new Headers(ObjOpcionesFetch.headers);
  let StrCuerpo: string | undefined;
  if (ObjCuerpo !== undefined) {
    ObjEncabezados.set("Content-Type", "application/json");
    StrCuerpo = JSON.stringify(ObjCuerpo);
  }

  try {
    const ObjRespuesta = await fetch(StrRuta, {
      ...ObjOpcionesFetch,
      headers: ObjEncabezados,
      credentials: "include",
      body: StrCuerpo,
    });
    const ObjContenido = await Api_leerContenido(ObjRespuesta);

    if (!ObjRespuesta.ok) {
      if (Api_esErrorPublico(ObjContenido)) {
        throw new ErrorApi(
          ObjRespuesta.status,
          ObjContenido.error.codigo,
          ObjContenido.error.mensaje,
        );
      }
      throw Api_obtenerErrorGenerico(ObjRespuesta.status);
    }

    return ObjContenido as T;
  } catch (ObjError) {
    if (ObjError instanceof ErrorApi) throw ObjError;
    throw new ErrorApi(
      0,
      "ERROR_RED",
      "No fue posible comunicarse con el servidor. Verifique su conexión e intente nuevamente.",
    );
  }
}
