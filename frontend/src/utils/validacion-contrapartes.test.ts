import { describe, expect, it } from "vitest";

import {
  ClientesProveedores_vacioANull,
  Clientes_validarFormulario,
  Proveedores_validarFormulario,
} from "./validacion-contrapartes";

describe("validaciones de clientes y proveedores", () => {
  it("permite CF como NIT de cliente, pero no como documento", () => {
    const ObjErroresNit = Clientes_validarFormulario({ tipoClienteId: 1, nombreCompleto: "Cliente", nit: " C-F " });
    const ObjErroresDocumento = Clientes_validarFormulario({ tipoClienteId: 1, nombreCompleto: "Cliente", numeroDocumento: " C-F " });
    expect(ObjErroresNit.nit).toBeUndefined();
    expect(ObjErroresDocumento.numeroDocumento).toBeDefined();
  });

  it("rechaza CF como NIT o documento de proveedor", () => {
    const ObjErrores = Proveedores_validarFormulario({ tipoProveedorId: 1, nombre: "Proveedor", nit: " c-f ", numeroDocumento: "C F" });
    expect(ObjErrores.nit).toBeDefined();
    expect(ObjErrores.numeroDocumento).toBeDefined();
  });

  it("valida obligatorios, correo y convierte opcionales vacios a null", () => {
    expect(Clientes_validarFormulario({ tipoClienteId: 0, nombreCompleto: "", correo: "invalido" })).toMatchObject({
      tipoClienteId: expect.any(String), nombreCompleto: expect.any(String), correo: expect.any(String),
    });
    expect(ClientesProveedores_vacioANull("   ")).toBeNull();
    expect(ClientesProveedores_vacioANull(" dato ")).toBe("dato");
  });
});
