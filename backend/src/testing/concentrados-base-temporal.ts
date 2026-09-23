import { z } from "zod";

const ObjInspeccion = z.object({
  State: z.object({ Running: z.literal(true) }),
  Config: z.object({ Labels: z.record(z.string(), z.string()) }),
  NetworkSettings: z.object({ Ports: z.record(z.string(), z.array(z.object({ HostIp: z.string(), HostPort: z.string() })).nullable()) }),
});

/** Valida antes de cualquier conexión; no acepta Azure, alias DNS ni puertos arbitrarios. */
export function PruebasBaseDatos_validarServidorConcentrados(StrUrl: string, ObjDocker: unknown): void {
  if (!/^sqlserver:\/\/(?:127\.0\.0\.1|localhost):1433;/i.test(StrUrl)) {
    throw new Error("CONCENTRADOS_SERVIDOR_PRUEBAS_NO_AUTORIZADO");
  }
  // Lista cerrada y sin duplicados: el adaptador no puede reinterpretar otro host/base.
  const ObjPermitidas = new Set(["database", "user", "password", "encrypt", "trustservercertificate", "connectionlimit", "pooltimeout", "connecttimeout", "sockettimeout"]);
  const ObjVistas = new Set<string>();
  for (const StrSegmento of StrUrl.split(";").slice(1)) {
    if (StrSegmento === "") continue;
    const IntIgual = StrSegmento.indexOf("=");
    const StrClave = StrSegmento.slice(0, IntIgual).toLowerCase();
    if (IntIgual < 1 || !ObjPermitidas.has(StrClave) || ObjVistas.has(StrClave) || StrSegmento.slice(IntIgual + 1).length === 0) {
      throw new Error("CONCENTRADOS_SERVIDOR_PRUEBAS_NO_AUTORIZADO");
    }
    ObjVistas.add(StrClave);
  }
  if (!ObjVistas.has("database")) throw new Error("CONCENTRADOS_BASE_PRUEBAS_NO_VERIFICADA");
  const ObjDatos = ObjInspeccion.parse(ObjDocker);
  if (ObjDatos.Config.Labels["com.docker.compose.project"] !== "granja-el-chiflon" ||
      ObjDatos.Config.Labels["com.docker.compose.service"] !== "database" ||
      !ObjDatos.NetworkSettings.Ports["1433/tcp"]?.some(ObjPuerto =>
        ObjPuerto.HostPort === "1433" && ["0.0.0.0", "127.0.0.1"].includes(ObjPuerto.HostIp))) {
    throw new Error("CONCENTRADOS_CONTENEDOR_LOCAL_NO_VERIFICADO");
  }
}

export async function PruebasBaseDatos_crearTemporalConcentrados() {
  if (process.env.CONCENTRADOS_PRUEBAS_INTERNAS === "1") {
    const { PruebasBaseDatos_crearTemporalInternaConcentrados } = await import("./concentrados-temporal-interno.js");
    return PruebasBaseDatos_crearTemporalInternaConcentrados();
  }
  throw new Error("CONCENTRADOS_REQUIERE_EJECUTOR_DOCKER_LOCAL_VERIFICADO");
}
