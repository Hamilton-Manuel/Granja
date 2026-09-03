import type { RespuestaDashboard } from "../types/dashboard.types";
import { Api_solicitar } from "./api.service";
export function Dashboard_consultar() { return Api_solicitar<RespuestaDashboard>("/api/dashboard"); }
