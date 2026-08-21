import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function Interfaz_mostrarDialogo() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function Interfaz_cerrarDialogo() {
    this.removeAttribute("open");
  };
}
