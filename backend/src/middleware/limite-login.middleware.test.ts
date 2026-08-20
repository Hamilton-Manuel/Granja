import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

import express from "express";

import { Middleware_crearLimitadorIntentosLogin } from "./limite-login.middleware.js";

async function Middleware_iniciarAplicacionPrueba() {
  const ObjAplicacion = express();
  let IntEjecucionesFlujoLogin = 0;

  ObjAplicacion.post(
    "/login",
    Middleware_crearLimitadorIntentosLogin(),
    (ObjSolicitud, ObjRespuesta) => {
      IntEjecucionesFlujoLogin += 1;
      if (ObjSolicitud.headers["x-resultado-prueba"] === "exito") {
        ObjRespuesta.status(200).json({ estado: "ok" });
        return;
      }
      ObjRespuesta.status(401).json({
        error: {
          codigo: "CREDENCIALES_INVALIDAS",
          mensaje: "Las credenciales proporcionadas no son válidas.",
        },
      });
    },
  );
  ObjAplicacion.get("/otra-ruta", (_ObjSolicitud, ObjRespuesta) => {
    ObjRespuesta.status(200).json({ estado: "ok" });
  });

  const ObjServidor = await new Promise<Server>((ObjResolver, ObjRechazar) => {
    const ObjServidorTemporal = ObjAplicacion.listen(
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
  });
  const ObjDireccion = ObjServidor.address() as AddressInfo;

  return {
    ObjServidor,
    StrUrlBase: `http://127.0.0.1:${ObjDireccion.port}`,
    Middleware_obtenerEjecuciones: () => IntEjecucionesFlujoLogin,
  };
}

async function Middleware_cerrarServidor(ObjServidor: Server): Promise<void> {
  await new Promise<void>((ObjResolver, ObjRechazar) => {
    ObjServidor.close((ObjError) => {
      if (ObjError !== undefined) {
        ObjRechazar(ObjError);
        return;
      }
      ObjResolver();
    });
  });
}

test("los logins exitosos no consumen cupo y cinco fallos bloquean el siguiente intento", async () => {
  const ObjPrueba = await Middleware_iniciarAplicacionPrueba();
  const StrDetalleSensible = "DATABASE_URL=sqlserver://usuario:contrasena@servidor";

  try {
    for (let IntIntento = 1; IntIntento <= 5; IntIntento += 1) {
      const ObjRespuestaExitosa = await fetch(
        `${ObjPrueba.StrUrlBase}/login`,
        {
          method: "POST",
          headers: { "x-resultado-prueba": "exito" },
        },
      );
      assert.equal(ObjRespuestaExitosa.status, 200);
    }
    assert.equal(ObjPrueba.Middleware_obtenerEjecuciones(), 5);

    for (let IntIntento = 1; IntIntento <= 5; IntIntento += 1) {
      const ObjRespuesta = await fetch(`${ObjPrueba.StrUrlBase}/login`, {
        method: "POST",
      });
      assert.equal(ObjRespuesta.status, 401);
    }
    assert.equal(ObjPrueba.Middleware_obtenerEjecuciones(), 10);

    const ObjRespuestaBloqueada = await fetch(
      `${ObjPrueba.StrUrlBase}/login`,
      { method: "POST" },
    );
    const StrContenido = await ObjRespuestaBloqueada.text();
    const ObjContenido = JSON.parse(StrContenido) as {
      error: { codigo: string; mensaje: string };
    };

    assert.equal(ObjRespuestaBloqueada.status, 429);
    assert.equal(ObjContenido.error.codigo, "DEMASIADOS_INTENTOS");
    assert.equal(typeof ObjContenido.error.mensaje, "string");
    assert.notEqual(ObjRespuestaBloqueada.headers.get("retry-after"), null);
    assert.notEqual(ObjRespuestaBloqueada.headers.get("ratelimit"), null);
    assert.equal(ObjPrueba.Middleware_obtenerEjecuciones(), 10);
    assert.equal(StrContenido.includes("stack"), false);
    assert.equal(StrContenido.includes("contrasena"), false);
    assert.equal(StrContenido.includes("DATABASE_URL"), false);
    assert.equal(StrContenido.includes(StrDetalleSensible), false);

    const ObjOtraRuta = await fetch(`${ObjPrueba.StrUrlBase}/otra-ruta`);
    assert.equal(ObjOtraRuta.status, 200);
  } finally {
    await Middleware_cerrarServidor(ObjPrueba.ObjServidor);
  }
});

test("un login exitoso intercalado no queda acumulado como intento fallido", async () => {
  const ObjPrueba = await Middleware_iniciarAplicacionPrueba();
  try {
    for (let IntIntento = 1; IntIntento <= 2; IntIntento += 1) {
      const ObjRespuesta = await fetch(`${ObjPrueba.StrUrlBase}/login`, {
        method: "POST",
      });
      assert.equal(ObjRespuesta.status, 401);
    }

    const ObjRespuestaExitosa = await fetch(`${ObjPrueba.StrUrlBase}/login`, {
      method: "POST",
      headers: { "x-resultado-prueba": "exito" },
    });
    assert.equal(ObjRespuestaExitosa.status, 200);

    for (let IntIntento = 3; IntIntento <= 5; IntIntento += 1) {
      const ObjRespuesta = await fetch(`${ObjPrueba.StrUrlBase}/login`, {
        method: "POST",
      });
      assert.equal(ObjRespuesta.status, 401);
    }

    const ObjRespuestaBloqueada = await fetch(
      `${ObjPrueba.StrUrlBase}/login`,
      { method: "POST" },
    );
    assert.equal(ObjRespuestaBloqueada.status, 429);
    assert.equal(ObjPrueba.Middleware_obtenerEjecuciones(), 6);
  } finally {
    await Middleware_cerrarServidor(ObjPrueba.ObjServidor);
  }
});

test("cada instancia del limitador mantiene un estado aislado", async () => {
  const ObjPrueba = await Middleware_iniciarAplicacionPrueba();
  try {
    const ObjRespuesta = await fetch(`${ObjPrueba.StrUrlBase}/login`, {
      method: "POST",
    });
    assert.equal(ObjRespuesta.status, 401);
    assert.equal(ObjPrueba.Middleware_obtenerEjecuciones(), 1);
  } finally {
    await Middleware_cerrarServidor(ObjPrueba.ObjServidor);
  }
});
