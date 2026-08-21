import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ErrorApi } from "../../types/api.types";
import { FormularioUsuario } from "./FormularioUsuario";

const ArrRoles = [
  { rolId: 2, nombre: "ADMINISTRADOR", descripcion: null, activo: true, _count: { rolesPermisos: 7, usuarios: 0 } },
  { rolId: 3, nombre: "OPERADOR", descripcion: null, activo: true, _count: { rolesPermisos: 0, usuarios: 0 } },
];

async function Usuarios_completarFormulario(): Promise<void> {
  await userEvent.type(screen.getByLabelText("Nombre completo"), "Usuario Prueba");
  await userEvent.type(screen.getByLabelText("Nombre de usuario"), "usuario.prueba");
  await userEvent.type(screen.getByLabelText("Correo"), "usuario@example.test");
  await userEvent.type(screen.getByLabelText("Contraseña inicial"), "contrasena-segura");
  await userEvent.selectOptions(screen.getByLabelText("Rol"), "3");
}

describe("FormularioUsuario", () => {
  it("evita doble submit mientras la operación está en curso", async () => {
    let Usuarios_resolver: (() => void) | undefined;
    const Usuarios_guardar = vi.fn(() => new Promise<void>((ObjResolver) => { Usuarios_resolver = ObjResolver; }));
    const { rerender } = render(<FormularioUsuario StrModo="crear" ArrRoles={ArrRoles} BoolProcesando={false} Usuarios_cancelar={vi.fn()} Usuarios_guardar={Usuarios_guardar} />);
    await Usuarios_completarFormulario();
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    rerender(<FormularioUsuario StrModo="crear" ArrRoles={ArrRoles} BoolProcesando={true} Usuarios_cancelar={vi.fn()} Usuarios_guardar={Usuarios_guardar} />);
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Guardando…" }));
    expect(Usuarios_guardar).toHaveBeenCalledTimes(1);
    Usuarios_resolver?.();
  });

  it("asocia un conflicto de correo con el campo correo", async () => {
    const Usuarios_guardar = vi.fn().mockRejectedValue(new ErrorApi(409, "CORREO_DUPLICADO", "Conflicto"));
    render(<FormularioUsuario StrModo="crear" ArrRoles={ArrRoles} BoolProcesando={false} Usuarios_cancelar={vi.fn()} Usuarios_guardar={Usuarios_guardar} />);
    await Usuarios_completarFormulario();
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Este correo ya está registrado.")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo")).toHaveAttribute("aria-invalid", "true");
  });
});
