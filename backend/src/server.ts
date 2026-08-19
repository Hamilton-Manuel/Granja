import type { Server } from "node:http";

import ObjAplicacion from "./app.js";
import {
  BaseDatos_desconectar,
  BaseDatos_verificarConexion,
} from "./database/prisma.js";
import { Configuracion_obtenerEntorno } from "./config/configuracion-entorno.js";

let ObjServidor: Server | undefined;
let BoolCierreEnCurso = false;

async function Servidor_escuchar(IntPuerto: number): Promise<Server> {
  return new Promise((ObjResolver, ObjRechazar) => {
    const ObjServidorHttp = ObjAplicacion.listen(IntPuerto);

    ObjServidorHttp.once("listening", () => ObjResolver(ObjServidorHttp));
    ObjServidorHttp.once("error", ObjRechazar);
  });
}

async function Servidor_cerrar(StrSenal: string): Promise<void> {
  if (BoolCierreEnCurso) {
    return;
  }

  BoolCierreEnCurso = true;
  console.info(`Cierre solicitado por ${StrSenal}.`);

  if (ObjServidor !== undefined) {
    await new Promise<void>((ObjResolver, ObjRechazar) => {
      ObjServidor?.close((ObjError) => {
        if (ObjError !== undefined) {
          ObjRechazar(ObjError);
          return;
        }

        ObjResolver();
      });
    });
  }

  await BaseDatos_desconectar();
  console.info("Servidor y conexión a base de datos cerrados correctamente.");
}

function Servidor_registrarSenales(): void {
  process.once("SIGINT", () => {
    void Servidor_cerrar("SIGINT").catch(() => {
      console.error("No fue posible cerrar el servidor limpiamente.");
      process.exitCode = 1;
    });
  });

  process.once("SIGTERM", () => {
    void Servidor_cerrar("SIGTERM").catch(() => {
      console.error("No fue posible cerrar el servidor limpiamente.");
      process.exitCode = 1;
    });
  });
}

export async function Servidor_iniciar(): Promise<void> {
  try {
    const ObjEntorno = Configuracion_obtenerEntorno();

    await BaseDatos_verificarConexion();
    ObjServidor = await Servidor_escuchar(ObjEntorno.PORT);
    Servidor_registrarSenales();

    console.info(`API disponible en el puerto ${ObjEntorno.PORT}.`);
  } catch {
    console.error(
      "No fue posible iniciar la API. Verifique la configuración y la conexión a SQL Server.",
    );
    await BaseDatos_desconectar();
    process.exitCode = 1;
  }
}

void Servidor_iniciar();
