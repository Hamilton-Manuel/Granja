import assert from "node:assert/strict";
import { test } from "node:test";
import type { NextFunction, Request, Response } from "express";

import { ErrorAplicacion } from "../errors/error-aplicacion.js";
import { Middleware_requerirPermiso } from "./autenticacion.middleware.js";

function Middleware_crearSolicitudConPermisos(ArrPermisos: string[]): Request {
  return {
    ObjAutenticacion: {
      IntUsuarioId: 1,
      IntSesionId: 1,
      StrTokenHash: "hash-de-prueba",
      ArrPermisos,
    },
  } as Request;
}

test("la autorización exige el permiso real y no ofrece bypass por rol", () => {
  let ObjErrorRecibido: unknown;
  const ObjSiguiente = ((ObjError?: unknown) => { ObjErrorRecibido = ObjError; }) as NextFunction;
  Middleware_requerirPermiso("USUARIOS_CONSULTAR")(
    Middleware_crearSolicitudConPermisos([]),
    {} as Response,
    ObjSiguiente,
  );
  assert.ok(ObjErrorRecibido instanceof ErrorAplicacion);
  assert.equal(ObjErrorRecibido.StrCodigo, "PERMISO_INSUFICIENTE");
});

test("la autorización continúa cuando el permiso está asignado explícitamente", () => {
  let BoolContinuo = false;
  const ObjSiguiente = ((ObjError?: unknown) => {
    assert.equal(ObjError, undefined);
    BoolContinuo = true;
  }) as NextFunction;
  Middleware_requerirPermiso("USUARIOS_CONSULTAR")(
    Middleware_crearSolicitudConPermisos(["USUARIOS_CONSULTAR"]),
    {} as Response,
    ObjSiguiente,
  );
  assert.equal(BoolContinuo, true);
});
