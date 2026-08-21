import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSesion } from "./useSesion";
import * as ObjServicio from "../services/usuarios.service";
import { ErrorApi } from "../types/api.types";
import type { ConsultaUsuarios, DatosCrearUsuario, DatosEditarUsuario, EstadoUsuario, RolAdministrativo, UsuarioAdministrativo } from "../types/usuarios.types";

const IntLimiteUsuarios = 20;

function Usuarios_mensajeError(ObjError: unknown): string {
  if (!(ObjError instanceof ErrorApi)) return "No fue posible completar la operación.";
  const ObjMensajes: Record<string, string> = {
    PERMISO_INSUFICIENTE: "No tiene permiso para realizar esta operación.",
    USUARIO_PROTEGIDO: "Esta cuenta está protegida y no puede modificarse desde esta acción.",
    ROL_RESERVADO: "WEBMASTER es un rol reservado y no puede asignarse.",
    ROL_INACTIVO: "El rol seleccionado está inactivo.",
    OPERACION_NO_PERMITIDA: "La operación no está permitida sobre su propia cuenta.",
    USUARIO_NO_ENCONTRADO: "El usuario ya no existe.",
    ROL_NO_ENCONTRADO: "El rol seleccionado ya no existe.",
    ERROR_RED: "No fue posible comunicarse con el servidor.",
  };
  return ObjMensajes[ObjError.StrCodigo] ?? "No fue posible completar la operación. Intente nuevamente.";
}

export function useUsuarios() {
  const { ObjUsuario, Autenticacion_tienePermiso, Autenticacion_manejarErrorProtegido, Autenticacion_reintentarSesion } = useSesion();
  const [ArrUsuarios, establecerUsuarios] = useState<UsuarioAdministrativo[]>([]);
  const [ArrRoles, establecerRoles] = useState<RolAdministrativo[]>([]);
  const [IntTotal, establecerTotal] = useState(0);
  const [IntPagina, establecerPagina] = useState(1);
  const [ObjFiltros, establecerFiltros] = useState<Omit<ConsultaUsuarios, "pagina" | "limite">>({});
  const [BoolCargaInicial, establecerCargaInicial] = useState(true);
  const [BoolActualizando, establecerActualizando] = useState(false);
  const [StrError, establecerError] = useState<string | null>(null);
  const [StrExito, establecerExito] = useState<string | null>(null);
  const [StrOperacion, establecerOperacion] = useState<string | null>(null);
  const IntSolicitudActual = useRef(0);
  const BoolPuedeCatalogos = Autenticacion_tienePermiso("USUARIOS_CONSULTAR_CATALOGOS");

  const Usuarios_cargarListado = useCallback(async (IntPaginaSolicitada = IntPagina): Promise<void> => {
    const IntSolicitud = ++IntSolicitudActual.current;
    establecerError(null);
    if (BoolCargaInicial) establecerCargaInicial(true); else establecerActualizando(true);
    try {
      const ObjRespuesta = await ObjServicio.Usuarios_listar({ pagina: IntPaginaSolicitada, limite: IntLimiteUsuarios, ...ObjFiltros });
      if (IntSolicitud !== IntSolicitudActual.current) return;
      const IntUltimaPagina = Math.max(1, Math.ceil(ObjRespuesta.paginacion.total / IntLimiteUsuarios));
      if (IntPaginaSolicitada > IntUltimaPagina) {
        establecerPagina(IntUltimaPagina);
        return;
      }
      establecerUsuarios(ObjRespuesta.datos);
      establecerTotal(ObjRespuesta.paginacion.total);
    } catch (ObjError) {
      if (Autenticacion_manejarErrorProtegido(ObjError)) return;
      if (IntSolicitud === IntSolicitudActual.current) establecerError(Usuarios_mensajeError(ObjError));
    } finally {
      if (IntSolicitud === IntSolicitudActual.current) {
        establecerCargaInicial(false);
        establecerActualizando(false);
      }
    }
  }, [IntPagina, ObjFiltros, BoolCargaInicial, Autenticacion_manejarErrorProtegido]);

  useEffect(() => { void Usuarios_cargarListado(IntPagina); }, [IntPagina, ObjFiltros]);

  useEffect(() => {
    if (!BoolPuedeCatalogos) return;
    void ObjServicio.Usuarios_obtenerRoles()
      .then((ObjRespuesta) => establecerRoles(ObjRespuesta.datos))
      .catch((ObjError) => {
        if (!Autenticacion_manejarErrorProtegido(ObjError)) establecerError(Usuarios_mensajeError(ObjError));
      });
  }, [BoolPuedeCatalogos, Autenticacion_manejarErrorProtegido]);

  const Usuarios_aplicarFiltros = useCallback((ObjNuevosFiltros: Omit<ConsultaUsuarios, "pagina" | "limite">) => {
    establecerPagina(1);
    establecerFiltros(ObjNuevosFiltros);
  }, []);

  const Usuarios_ejecutar = useCallback(async <T,>(StrClave: string, StrMensaje: string, ObjAccion: () => Promise<T>): Promise<T> => {
    establecerOperacion(StrClave);
    establecerError(null);
    establecerExito(null);
    try {
      const ObjResultado = await ObjAccion();
      establecerExito(StrMensaje);
      await Usuarios_cargarListado(IntPagina);
      return ObjResultado;
    } catch (ObjError) {
      if (!Autenticacion_manejarErrorProtegido(ObjError)) establecerError(Usuarios_mensajeError(ObjError));
      throw ObjError;
    } finally {
      establecerOperacion(null);
    }
  }, [Autenticacion_manejarErrorProtegido, IntPagina, Usuarios_cargarListado]);

  const Usuarios_crear = useCallback((ObjDatos: DatosCrearUsuario) => Usuarios_ejecutar("crear", "Usuario creado correctamente.", () => ObjServicio.Usuarios_crear(ObjDatos)), [Usuarios_ejecutar]);
  const Usuarios_editar = useCallback(async (IntUsuarioId: number, ObjDatos: DatosEditarUsuario) => {
    const ObjResultado = await Usuarios_ejecutar(`editar-${IntUsuarioId}`, "Usuario actualizado correctamente.", () => ObjServicio.Usuarios_editar(IntUsuarioId, ObjDatos));
    if (IntUsuarioId === ObjUsuario?.usuarioId) await Autenticacion_reintentarSesion();
    return ObjResultado;
  }, [Usuarios_ejecutar, ObjUsuario?.usuarioId, Autenticacion_reintentarSesion]);
  const Usuarios_cambiarEstado = useCallback((IntUsuarioId: number, StrEstado: EstadoUsuario) => Usuarios_ejecutar(`estado-${IntUsuarioId}`, "Estado actualizado correctamente.", () => ObjServicio.Usuarios_cambiarEstado(IntUsuarioId, StrEstado)), [Usuarios_ejecutar]);
  const Usuarios_cambiarRol = useCallback((IntUsuarioId: number, IntRolId: number) => Usuarios_ejecutar(`rol-${IntUsuarioId}`, "Rol actualizado correctamente.", () => ObjServicio.Usuarios_cambiarRol(IntUsuarioId, IntRolId)), [Usuarios_ejecutar]);
  const Usuarios_revocar = useCallback(async (IntUsuarioId: number) => {
    const BoolEsPropio = IntUsuarioId === ObjUsuario?.usuarioId;
    if (!BoolEsPropio) {
      await Usuarios_ejecutar(`sesiones-${IntUsuarioId}`, "Sesiones revocadas correctamente.", () => ObjServicio.Usuarios_revocarSesiones(IntUsuarioId));
      return;
    }
    establecerOperacion(`sesiones-${IntUsuarioId}`);
    establecerError(null);
    try {
      await ObjServicio.Usuarios_revocarSesiones(IntUsuarioId);
      await Autenticacion_reintentarSesion();
    } catch (ObjError) {
      if (!Autenticacion_manejarErrorProtegido(ObjError)) establecerError(Usuarios_mensajeError(ObjError));
      throw ObjError;
    } finally {
      establecerOperacion(null);
    }
  }, [Usuarios_ejecutar, ObjUsuario?.usuarioId, Autenticacion_reintentarSesion, Autenticacion_manejarErrorProtegido]);

  return {
    ArrUsuarios, ArrRoles, ArrRolesAsignables: useMemo(() => ArrRoles.filter((ObjRol) => ObjRol.activo && ObjRol.nombre !== "WEBMASTER"), [ArrRoles]),
    IntTotal, IntPagina, IntLimite: IntLimiteUsuarios, ObjFiltros, BoolCargaInicial, BoolActualizando,
    StrError, StrExito, StrOperacion, BoolPuedeCatalogos,
    establecerPagina, Usuarios_aplicarFiltros, Usuarios_refrescar: Usuarios_cargarListado,
    Usuarios_crear, Usuarios_editar, Usuarios_cambiarEstado, Usuarios_cambiarRol, Usuarios_revocar,
  };
}
