import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Encabezado } from "../components/Encabezado";
import { MenuLateral } from "../components/MenuLateral";

export function LayoutAutenticado() {
  const [BoolMenuAbierto, establecerMenuAbierto] = useState(false);
  return (
    <div className="layout-autenticado">
      <MenuLateral BoolAbierto={BoolMenuAbierto} Autenticacion_cerrarMenu={() => establecerMenuAbierto(false)} />
      <div className="layout-principal">
        <Encabezado Autenticacion_abrirMenu={() => establecerMenuAbierto(true)} />
        <main className="contenido-principal">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
