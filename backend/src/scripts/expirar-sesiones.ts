import {
  BaseDatos_desconectar,
  BaseDatos_exigirBaseActual,
} from "../database/prisma.js";
import { Usuarios_expirarSesionesVencidas } from "../modules/usuarios/usuarios.repository.js";

try {
  const StrBaseEsperada = process.env.BASE_DATOS_ESPERADA;
  if (StrBaseEsperada === undefined || StrBaseEsperada.length === 0) {
    throw new Error("Debe indicar BASE_DATOS_ESPERADA para actualizar sesiones.");
  }
  await BaseDatos_exigirBaseActual(StrBaseEsperada);
  const ObjResultado = await Usuarios_expirarSesionesVencidas();
  console.info(`Sesiones marcadas como expiradas: ${ObjResultado.count}.`);
} catch {
  console.error("No fue posible actualizar las sesiones expiradas.");
  process.exitCode = 1;
} finally {
  await BaseDatos_desconectar();
}
