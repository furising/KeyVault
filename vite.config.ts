import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: "src/mainview",
  publicDir: "../../public",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/mainview"),
    },
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    target: ["es2021", "chrome100", "safari14"],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  // 防止 Vite 在 Tauri 开发时清除终端中的 Rust 错误
  clearScreen: false,
  // 环境变量前缀
  envPrefix: ["VITE_", "TAURI_"],
});