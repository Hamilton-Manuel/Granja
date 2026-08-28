import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  Autenticacion_cerrarSesion as Autenticacion_solicitarCierre,
  Autenticacion_consultarSesion,
  Autenticacion_iniciarSesion as Autenticacion_solicitarInicio,
} from "../services/autenticacion.service";
import { ErrorApi } from "../types/api.types";
import type { EstadoSesion, UsuarioAutenticado } from "../types/autenticacion.types";

export interface ContextoSesion {
  ObjUsuario: UsuarioAutenticado | null;
  StrEstado: EstadoSesion;
  ObjError: ErrorApi | null;
  Autenticacion_iniciarSesion: (StrIdentificador: string, StrContrasena: string) => Promise<void>;
  Autenticacion_cerrarSesion: () => Promise<void>;
  Autenticacion_reintentarSesion: () => Promise<void>;
  Autenticacion_refrescarSesionSilenciosa: () => Promise<UsuarioAutenticado | null>;
  Autenticacion_tienePermiso: (StrCodigo: string) => boolean;
  Autenticacion_manejarErrorProtegido: (ObjError: unknown) => boolean;
}

export const ObjContextoSesion = createContext<ContextoSesion | null>(null);

interface PropiedadesProveedorSesion {
  children: ReactNode;
}

export function ProveedorSesion({ children: ObjContenido }: PropiedadesProveedorSesion) {
  const [ObjUsuario, establecerUsuario] = useState<UsuarioAutenticado | null>(null);
  const [StrEstado, establecerEstado] = useState<EstadoSesion>("cargando");
  const [ObjError, establecerError] = useState<ErrorApi | null>(null);

  const Autenticacion_reintentarSesion = useCallback(async (): Promise<void> => {
    establecerEstado("cargando");
    establecerError(null);
    try {
      const ObjRespuesta = await Autenticacion_consultarSesion();
      establecerUsuario(ObjRespuesta.datos.usuario);
      establecerEstado("autenticada");
    } catch (ObjErrorCapturado) {
      const ObjErrorApi = ObjErrorCapturado instanceof ErrorApi
        ? ObjErrorCapturado
        : new ErrorApi(0, "ERROR_RED", "No fue posible comprobar la sesión.");
      establecerUsuario(null);
      if (ObjErrorApi.IntEstadoHttp === 401) {
        establecerEstado("noAutenticada");
        return;
      }
      establecerError(ObjErrorApi);
      establecerEstado("error");
    }
  }, []);

  const RefPromesaRefresco = useRef<Promise<UsuarioAutenticado | null> | null>(null);
  const Autenticacion_refrescarSesionSilenciosa = useCallback((): Promise<UsuarioAutenticado | null> => {
    if (RefPromesaRefresco.current) return RefPromesaRefresco.current;
    const ObjPromesa = (async (): Promise<UsuarioAutenticado | null> => {
      try {
        const ObjRespuesta = await Autenticacion_consultarSesion();
        establecerUsuario(ObjRespuesta.datos.usuario);
        establecerError(null);
        establecerEstado("autenticada");
        return ObjRespuesta.datos.usuario;
      } catch (ObjErrorCapturado) {
        if (ObjErrorCapturado instanceof ErrorApi && ObjErrorCapturado.IntEstadoHttp === 401) {
          establecerUsuario(null);
          establecerError(null);
          establecerEstado("noAutenticada");
        }
        return null;
      } finally {
        RefPromesaRefresco.current = null;
      }
    })();
    RefPromesaRefresco.current = ObjPromesa;
    return ObjPromesa;
  }, []);

  useEffect(() => {
    void Autenticacion_reintentarSesion();
  }, [Autenticacion_reintentarSesion]);

  const Autenticacion_iniciarSesion = useCallback(
    async (StrIdentificador: string, StrContrasena: string): Promise<void> => {
      const ObjRespuesta = await Autenticacion_solicitarInicio(StrIdentificador, StrContrasena);
      establecerUsuario(ObjRespuesta.datos.usuario);
      establecerError(null);
      establecerEstado("autenticada");
    },
    [],
  );

  const Autenticacion_cerrarSesion = useCallback(async (): Promise<void> => {
    try {
      await Autenticacion_solicitarCierre();
    } catch (ObjErrorCapturado) {
      if (!(ObjErrorCapturado instanceof ErrorApi) || ObjErrorCapturado.IntEstadoHttp !== 401) {
        throw ObjErrorCapturado;
      }
    }
    establecerUsuario(null);
    establecerError(null);
    establecerEstado("noAutenticada");
  }, []);

  const Autenticacion_tienePermiso = useCallback(
    (StrCodigo: string): boolean => ObjUsuario?.permisos.includes(StrCodigo) ?? false,
    [ObjUsuario],
  );

  const Autenticacion_manejarErrorProtegido = useCallback((ObjErrorCapturado: unknown): boolean => {
    if (ObjErrorCapturado instanceof ErrorApi && ObjErrorCapturado.IntEstadoHttp === 401) {
      establecerUsuario(null);
      establecerError(null);
      establecerEstado("noAutenticada");
      return true;
    }
    if (ObjErrorCapturado instanceof ErrorApi && ObjErrorCapturado.IntEstadoHttp === 403) {
      void Autenticacion_refrescarSesionSilenciosa();
    }
    return false;
  }, [Autenticacion_refrescarSesionSilenciosa]);

  const ObjValor = useMemo<ContextoSesion>(() => ({
    ObjUsuario,
    StrEstado,
    ObjError,
    Autenticacion_iniciarSesion,
    Autenticacion_cerrarSesion,
    Autenticacion_reintentarSesion,
    Autenticacion_refrescarSesionSilenciosa,
    Autenticacion_tienePermiso,
    Autenticacion_manejarErrorProtegido,
  }), [
    ObjUsuario,
    StrEstado,
    ObjError,
    Autenticacion_iniciarSesion,
    Autenticacion_cerrarSesion,
    Autenticacion_reintentarSesion,
    Autenticacion_refrescarSesionSilenciosa,
    Autenticacion_tienePermiso,
    Autenticacion_manejarErrorProtegido,
  ]);

  return <ObjContextoSesion.Provider value={ObjValor}>{ObjContenido}</ObjContextoSesion.Provider>;
}
