import { describe, expect, it } from "vitest";
import StrCss from "../../styles/produccion.css?raw";

describe("estilos de impresión de ficha técnica",()=>{
  it("restaura visibilidad frente a la regla global de recibos",()=>{expect(StrCss).toContain("body .produccion-ficha,body .produccion-ficha *{visibility:visible!important}");expect(StrCss).not.toMatch(/\.produccion-ficha\{display:none/);});
  it("elimina layout interactivo pero conserva documento formal",()=>{for(const StrSelector of [".menu-lateral",".encabezado",".produccion-navegacion",".no-imprimir"])expect(StrCss).toContain(StrSelector);expect(StrCss).toContain(".layout-principal{margin-left:0!important;width:100%!important}");expect(StrCss).toContain(".produccion-ficha-encabezado-impresion");expect(StrCss).toContain("break-after:avoid");});
});
