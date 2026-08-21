import { Navigate, Route, Routes } from "react-router-dom";

import { IndicadorCarga } from "../components/ui/IndicadorCarga";
import { LayoutAutenticado } from "../layouts/LayoutAutenticado";
import { PaginaInicio } from "../pages/PaginaInicio";
import { PaginaLogin } from "../pages/PaginaLogin";
import { PaginaNoEncontrada } from "../pages/PaginaNoEncontrada";
import { PaginaUsuarios } from "../pages/usuarios/PaginaUsuarios";
import { PaginaClientes } from "../pages/clientes/PaginaClientes";
import { PaginaProveedores } from "../pages/proveedores/PaginaProveedores";
import { useSesion } from "../hooks/useSesion";
import { RutaProtegida } from "./RutaProtegida";
import { RutaConPermiso } from "./RutaConPermiso";
import { RutaSoloInvitados } from "./RutaSoloInvitados";

export function RutasAplicacion() {
  const { StrEstado, ObjError, Autenticacion_reintentarSesion } = useSesion();
  if (StrEstado === "cargando") return <IndicadorCarga StrMensaje="Comprobando su sesión…" />;
  if (StrEstado === "error") {
    return (
      <main className="estado-pantalla estado-error-sesion">
        <span className="estado-simbolo" aria-hidden="true">!</span>
        <h1>No fue posible comprobar su sesión</h1>
        <p>{ObjError?.message ?? "No fue posible comunicarse con el servidor."}</p>
        <button className="boton-primario" type="button" onClick={() => void Autenticacion_reintentarSesion()}>Reintentar</button>
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={StrEstado === "autenticada" ? "/inicio" : "/login"} replace />} />
      <Route element={<RutaSoloInvitados />}>
        <Route path="/login" element={<PaginaLogin />} />
      </Route>
      <Route element={<RutaProtegida />}>
        <Route element={<LayoutAutenticado />}>
          <Route path="/inicio" element={<PaginaInicio />} />
          <Route element={<RutaConPermiso StrPermiso="USUARIOS_CONSULTAR" />}>
            <Route path="/usuarios" element={<PaginaUsuarios />} />
          </Route>
          <Route element={<RutaConPermiso StrPermiso="CLIENTES_CONSULTAR" />}>
            <Route path="/clientes" element={<PaginaClientes />} />
          </Route>
          <Route element={<RutaConPermiso StrPermiso="PROVEEDORES_CONSULTAR" />}>
            <Route path="/proveedores" element={<PaginaProveedores />} />
          </Route>
          <Route path="*" element={<PaginaNoEncontrada />} />
        </Route>
      </Route>
      <Route path="*" element={<PaginaNoEncontrada />} />
    </Routes>
  );
}
