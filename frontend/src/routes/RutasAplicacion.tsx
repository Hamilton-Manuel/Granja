import { Navigate, Route, Routes } from "react-router-dom";

import { IndicadorCarga } from "../components/ui/IndicadorCarga";
import { LayoutAutenticado } from "../layouts/LayoutAutenticado";
import { PaginaInicio } from "../pages/PaginaInicio";
import { PaginaLogin } from "../pages/PaginaLogin";
import { PaginaNoEncontrada } from "../pages/PaginaNoEncontrada";
import { PaginaUsuarios } from "../pages/usuarios/PaginaUsuarios";
import { PaginaClientes } from "../pages/clientes/PaginaClientes";
import { PaginaProveedores } from "../pages/proveedores/PaginaProveedores";
import { LayoutInventario } from "../components/inventario/LayoutInventario";
import { PaginaResumenInventario } from "../pages/inventario/PaginaResumenInventario";
import { PaginaProductosInventario } from "../pages/inventario/PaginaProductosInventario";
import { PaginaLotesInventario } from "../pages/inventario/PaginaLotesInventario";
import { PaginaMovimientosInventario } from "../pages/inventario/PaginaMovimientosInventario";
import { PaginaTransferenciasInventario } from "../pages/inventario/PaginaTransferenciasInventario";
import { PaginaCatalogosInventario } from "../pages/inventario/PaginaCatalogosInventario";
import { PaginaDiagnosticoInventario } from "../pages/inventario/PaginaDiagnosticoInventario";
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
          <Route element={<RutaConPermiso StrPermiso="INVENTARIO_CONSULTAR" />}>
            <Route path="/inventario" element={<LayoutInventario />}>
              <Route index element={<PaginaResumenInventario />} />
              <Route path="productos" element={<PaginaProductosInventario />} />
              <Route path="lotes" element={<PaginaLotesInventario />} />
              <Route path="movimientos" element={<PaginaMovimientosInventario />} />
              <Route path="transferencias" element={<PaginaTransferenciasInventario />} />
              <Route element={<RutaConPermiso ArrPermisosAlguno={["INVENTARIO_CATEGORIAS_CREAR", "INVENTARIO_CATEGORIAS_EDITAR", "INVENTARIO_CATEGORIAS_CAMBIAR_ESTADO", "INVENTARIO_ALMACENES_CREAR", "INVENTARIO_ALMACENES_EDITAR", "INVENTARIO_ALMACENES_CAMBIAR_ESTADO", "INVENTARIO_PROVEEDORES_PRODUCTOS_GESTIONAR"]} />}>
                <Route path="catalogos" element={<PaginaCatalogosInventario />} />
              </Route>
              <Route element={<RutaConPermiso StrPermiso="INVENTARIO_RECONCILIACION_EJECUTAR" />}>
                <Route path="diagnostico" element={<PaginaDiagnosticoInventario />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<PaginaNoEncontrada />} />
        </Route>
      </Route>
      <Route path="*" element={<PaginaNoEncontrada />} />
    </Routes>
  );
}
