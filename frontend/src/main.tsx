import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles/global.css";
import "./styles/autenticacion.css";
import "./styles/layout.css";
import "./styles/inventario.css";
import "./styles/produccion.css";
import "./styles/alimentacion.css";
import "./styles/sanidad.css";

const ObjRaiz = document.getElementById("root");
if (ObjRaiz === null) throw new Error("No se encontró el contenedor principal de la aplicación.");

createRoot(ObjRaiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
