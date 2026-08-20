import { createHash, randomBytes } from "node:crypto";

import argon2 from "argon2";
import { parse, serialize } from "cookie";

const StrNombreCookieSesion = "id";
const IntMemoryCostArgon2 = 19_456;
const IntTimeCostArgon2 = 2;
const IntParallelismArgon2 = 1;

let StrHashFicticio: string | undefined;

export async function Autenticacion_hashearContrasena(
  StrContrasena: string,
): Promise<string> {
  return argon2.hash(StrContrasena, {
    type: argon2.argon2id,
    memoryCost: IntMemoryCostArgon2,
    timeCost: IntTimeCostArgon2,
    parallelism: IntParallelismArgon2,
  });
}

export async function Autenticacion_verificarContrasena(
  StrHash: string,
  StrContrasena: string,
): Promise<boolean> {
  try {
    return await argon2.verify(StrHash, StrContrasena);
  } catch {
    return false;
  }
}

export async function Autenticacion_verificarContrasenaFicticia(
  StrContrasena: string,
): Promise<void> {
  StrHashFicticio ??= await Autenticacion_hashearContrasena(
    "verificacion-ficticia-no-es-credencial",
  );
  await Autenticacion_verificarContrasena(StrHashFicticio, StrContrasena);
}

export function Autenticacion_generarTokenSesion(): string {
  return randomBytes(32).toString("base64url");
}

export function Autenticacion_hashearTokenSesion(StrToken: string): string {
  return createHash("sha256").update(StrToken, "utf8").digest("hex");
}

export function Autenticacion_obtenerTokenCookie(
  StrEncabezadoCookie: string | undefined,
): string | undefined {
  if (StrEncabezadoCookie === undefined) {
    return undefined;
  }

  try {
    return parse(StrEncabezadoCookie)[StrNombreCookieSesion];
  } catch {
    return undefined;
  }
}

export function Autenticacion_crearCookieSesion(
  StrToken: string,
  DtFechaExpiracion: Date,
  BoolProduccion: boolean,
): string {
  return serialize(StrNombreCookieSesion, StrToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: BoolProduccion,
    path: "/api",
    expires: DtFechaExpiracion,
  });
}

export function Autenticacion_crearCookieEliminada(
  BoolProduccion: boolean,
): string {
  return serialize(StrNombreCookieSesion, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: BoolProduccion,
    path: "/api",
    expires: new Date(0),
    maxAge: 0,
  });
}
