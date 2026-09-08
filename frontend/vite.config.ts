import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { Api_validarOrigen } from "./src/services/api-origen.ts";

export default defineConfig(({ command, mode }) => {
  if (command === "build") Api_validarOrigen(loadEnv(mode, process.cwd(), "VITE_").VITE_API_ORIGIN ?? "", true);
  return {
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    css: true,
  },
  };
});
