import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ErrorApi } from "../../types/api.types";
import { FormularioUsuario } from "./FormularioUsuario";

const ArrRoles = [
  { rolId: 2, nombre: "ADMINISTRADOR", descripcion: null, activo: true, _count: { rolesPermisos: 7, usuarios: 0 } },
  { rolId: 3, nombre: "OPERADOR", descripcion: null, activo: true, _count: { rolesPermisos: 0, usuarios: 0 } },
];
const ObjUsuarioEditar = { usuarioId: 2, nombreCompleto: "Usuario Prueba", nombreUsuario: "usuario.prueba", correo: "usuario@example.test", estado: "ACTIVO" as const, fechaCreacion: "2026-01-01", fechaActualizacion: "2026-01-01", rol: { rolId: 3, nombre: "OPERADOR", activo: true } };

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

  it("edita datos sin enviar contraseña cuando ambos campos quedan vacíos", async () => {
    const Usuarios_guardar = vi.fn().mockResolvedValue(undefined);
    render(<FormularioUsuario StrModo="editar" ObjUsuario={ObjUsuarioEditar} BoolProcesando={false} Usuarios_cancelar={vi.fn()} Usuarios_guardar={Usuarios_guardar} />);
    expect(screen.getByLabelText("Nueva contraseña")).toHaveValue("");
    expect(screen.getByLabelText("Confirmar nueva contraseña")).toHaveValue("");
    await userEvent.clear(screen.getByLabelText("Nombre completo"));
    await userEvent.type(screen.getByLabelText("Nombre completo"), "Nombre actualizado");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(Usuarios_guardar).toHaveBeenCalledWith({ nombreCompleto: "Nombre actualizado" });
  });

  it("impide guardar si falta la confirmación o las contraseñas no coinciden", async () => {
    const Usuarios_guardar = vi.fn().mockResolvedValue(undefined);
    render(<FormularioUsuario StrModo="editar" ObjUsuario={ObjUsuarioEditar} BoolProcesando={false} Usuarios_cancelar={vi.fn()} Usuarios_guardar={Usuarios_guardar} />);
    await userEvent.type(screen.getByLabelText("Nueva contraseña"), "contrasena-nueva");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getByText("Confirme la nueva contraseña.")).toBeInTheDocument();
    expect(Usuarios_guardar).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Confirmar nueva contraseña"), "otra-contrasena");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    expect(Usuarios_guardar).not.toHaveBeenCalled();
  });

  it("rechaza la política inválida y envía solo la contraseña validada", async () => {
    const Usuarios_guardar = vi.fn().mockResolvedValue(undefined);
    render(<FormularioUsuario StrModo="editar" ObjUsuario={ObjUsuarioEditar} BoolProcesando={false} Usuarios_cancelar={vi.fn()} Usuarios_guardar={Usuarios_guardar} />);
    await userEvent.type(screen.getByLabelText("Nueva contraseña"), "corta");
    await userEvent.type(screen.getByLabelText("Confirmar nueva contraseña"), "corta");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getByText("La contraseña debe tener entre 8 y 128 caracteres.")).toBeInTheDocument();
    expect(Usuarios_guardar).not.toHaveBeenCalled();
    await userEvent.clear(screen.getByLabelText("Nueva contraseña"));
    await userEvent.clear(screen.getByLabelText("Confirmar nueva contraseña"));
    await userEvent.type(screen.getByLabelText("Nueva contraseña"), "contrasena-nueva");
    await userEvent.type(screen.getByLabelText("Confirmar nueva contraseña"), "contrasena-nueva");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(Usuarios_guardar).toHaveBeenCalledWith({ nuevaContrasena: "contrasena-nueva" });
  });

  it("envía datos de perfil y contraseña en una única edición", async () => {
    const Usuarios_guardar = vi.fn().mockResolvedValue(undefined);
    render(<FormularioUsuario StrModo="editar" ObjUsuario={ObjUsuarioEditar} BoolProcesando={false} Usuarios_cancelar={vi.fn()} Usuarios_guardar={Usuarios_guardar} />);
    await userEvent.clear(screen.getByLabelText("Correo"));
    await userEvent.type(screen.getByLabelText("Correo"), "actualizado@example.test");
    await userEvent.type(screen.getByLabelText("Nueva contraseña"), "contrasena-nueva");
    await userEvent.type(screen.getByLabelText("Confirmar nueva contraseña"), "contrasena-nueva");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(Usuarios_guardar).toHaveBeenCalledWith({ correo: "actualizado@example.test", nuevaContrasena: "contrasena-nueva" });
  });
});
