import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import type { Server } from "node:http";

import express from "express";

import ObjAplicacion from "./app.js";
import { BaseDatos_desconectar } from "./database/prisma.js";
import { Middleware_manejarErrores } from "./middleware/manejo-errores.middleware.js";

let ObjServidorPruebas: Server;
let StrUrlBase: string;

async function Api_iniciarServidorPruebas(): Promise<void> {
  await new Promise<void>((ObjResolver, ObjRechazar) => {
    ObjServidorPruebas = ObjAplicacion.listen(0, "127.0.0.1", (ObjError) => {
      if (ObjError !== undefined) {
        ObjRechazar(ObjError);
        return;
      }

      ObjResolver();
    });
  });

  const ObjDireccion = ObjServidorPruebas.address() as AddressInfo;
  StrUrlBase = `http://127.0.0.1:${ObjDireccion.port}`;
}

async function Api_cerrarServidorPruebas(): Promise<void> {
  await new Promise<void>((ObjResolver, ObjRechazar) => {
    ObjServidorPruebas.close((ObjError) => {
      if (ObjError !== undefined) {
        ObjRechazar(ObjError);
        return;
      }

      ObjResolver();
    });
  });

  await BaseDatos_desconectar();
}

before(Api_iniciarServidorPruebas);
after(Api_cerrarServidorPruebas);

test("GET /api/health comprueba SQL Server y responde saludable", async () => {
  const ObjRespuesta = await fetch(`${StrUrlBase}/api/health`);
  const ObjContenido = (await ObjRespuesta.json()) as Record<string, unknown>;

  assert.equal(ObjRespuesta.status, 200);
  assert.equal(ObjContenido.estado, "ok");
  assert.equal(ObjContenido.baseDatos, "conectada");
  assert.equal(typeof ObjContenido.fecha, "string");
  assert.equal(
    Number.isNaN(Date.parse(String(ObjContenido.fecha))),
    false,
  );
});

test("una ruta inexistente devuelve el error 404 uniforme", async () => {
  const ObjRespuesta = await fetch(`${StrUrlBase}/api/no-existe`);
  const ObjContenido = (await ObjRespuesta.json()) as {
    error: { codigo: string; mensaje: string };
  };

  assert.equal(ObjRespuesta.status, 404);
  assert.deepEqual(ObjContenido, {
    error: {
      codigo: "RUTA_NO_ENCONTRADA",
      mensaje: "La ruta solicitada no existe.",
    },
  });
});

test("una ruta protegida sin sesión devuelve 401 y no permite caché", async () => {
  const ObjRespuesta = await fetch(`${StrUrlBase}/api/usuarios/sesion`);
  const ObjContenido = (await ObjRespuesta.json()) as { error: { codigo: string } };
  assert.equal(ObjRespuesta.status, 401);
  assert.equal(ObjContenido.error.codigo, "NO_AUTENTICADO");
  assert.equal(ObjRespuesta.headers.get("cache-control"), "no-store");
});

test("Clientes y Proveedores exigen autenticacion", async () => {
  for (const StrRuta of ["/api/clientes", "/api/clientes/tipos", "/api/proveedores", "/api/proveedores/tipos"]) {
    const ObjRespuesta = await fetch(`${StrUrlBase}${StrRuta}`);
    const ObjContenido = (await ObjRespuesta.json()) as { error: { codigo: string } };
    assert.equal(ObjRespuesta.status, 401);
    assert.equal(ObjContenido.error.codigo, "NO_AUTENTICADO");
  }
});

test("los contratos nuevos de Inventario exigen autenticacion", async () => {
  for (const StrRuta of ["/api/inventario/resumen", "/api/inventario/proveedores", "/api/inventario/existencias", "/api/inventario/transacciones", "/api/inventario/transferencias"]) {
    const ObjRespuesta = await fetch(`${StrUrlBase}${StrRuta}`);
    const ObjContenido = (await ObjRespuesta.json()) as { error: { codigo: string } };
    assert.equal(ObjRespuesta.status, 401);
    assert.equal(ObjContenido.error.codigo, "NO_AUTENTICADO");
  }
});

test("los contratos de Produccion exigen autenticacion", async () => {
  for (const StrRuta of ["/api/produccion/proveedores", "/api/produccion/tipos-animales", "/api/produccion/lotes", "/api/produccion/animales", "/api/produccion/operaciones", "/api/produccion/transacciones"]) {
    const ObjRespuesta = await fetch(`${StrUrlBase}${StrRuta}`);
    const ObjContenido = (await ObjRespuesta.json()) as { error: { codigo: string } };
    assert.equal(ObjRespuesta.status, 401);
    assert.equal(ObjContenido.error.codigo, "NO_AUTENTICADO");
  }
});

test("un cuerpo JSON mal formado devuelve un error 400 sanitizado", async () => {
  const StrDetalleSensible =
    "DATABASE_URL=sqlserver://usuario:contrasena@servidor";
  const ObjRespuesta = await fetch(`${StrUrlBase}/api/health`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: `{"dato":"${StrDetalleSensible}`,
  });
  const StrContenido = await ObjRespuesta.text();
  const ObjContenido = JSON.parse(StrContenido) as {
    error: { codigo: string; mensaje: string };
  };

  assert.equal(ObjRespuesta.status, 400);
  assert.deepEqual(ObjContenido, {
    error: {
      codigo: "JSON_MALFORMADO",
      mensaje: "El cuerpo de la solicitud contiene JSON mal formado.",
    },
  });
  assert.equal(StrContenido.includes("stack"), false);
  assert.equal(StrContenido.includes("DATABASE_URL"), false);
  assert.equal(StrContenido.includes("contrasena"), false);
  assert.equal(StrContenido.includes(StrDetalleSensible), false);
});

test("un error interno no expone información sensible", async () => {
  const ObjAplicacionError = express();
  const StrDetalleSensible =
    "DATABASE_URL=sqlserver://usuario:contrasena@servidor";

  ObjAplicacionError.get("/error", () => {
    throw new Error(StrDetalleSensible);
  });
  ObjAplicacionError.use(Middleware_manejarErrores);

  const ObjServidorError = await new Promise<Server>(
    (ObjResolver, ObjRechazar) => {
    const ObjServidorTemporal = ObjAplicacionError.listen(
      0,
      "127.0.0.1",
        (ObjError) => {
          if (ObjError !== undefined) {
            ObjRechazar(ObjError);
            return;
          }

          ObjResolver(ObjServidorTemporal);
        },
    );
    },
  );

  try {
    const ObjDireccion = ObjServidorError.address() as AddressInfo;
    const ObjRespuesta = await fetch(
      `http://127.0.0.1:${ObjDireccion.port}/error`,
    );
    const StrContenido = await ObjRespuesta.text();

    assert.equal(ObjRespuesta.status, 500);
    assert.equal(StrContenido.includes("DATABASE_URL"), false);
    assert.equal(StrContenido.includes("contrasena"), false);
    assert.equal(StrContenido.includes("stack"), false);
  } finally {
    await new Promise<void>((ObjResolver) => {
      ObjServidorError.close(() => ObjResolver());
    });
  }
});
