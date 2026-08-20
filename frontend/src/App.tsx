import { BrowserRouter } from "react-router-dom";

import { ProveedorSesion } from "./auth/ProveedorSesion";
import { RutasAplicacion } from "./routes/RutasAplicacion";

export function App() {
  return (
    <BrowserRouter>
      <ProveedorSesion>
        <RutasAplicacion />
      </ProveedorSesion>
    </BrowserRouter>
  );
}
