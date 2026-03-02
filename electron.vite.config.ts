import { resolve } from "path";
import { defineConfig } from "electron-vite";
import renderer from "vite-plugin-electron-renderer";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    resolve: {
      alias: {
        "@ipc": resolve("src/ipc"),
      },
    },
    build: {
      externalizeDeps: true,
    },
  },
  preload: {
    build: {
      externalizeDeps: true,
    },
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@ipc": resolve("src/ipc"),
      },
    },
    plugins: [renderer(), react()],
    define: {
      GWITCH_VERSION: JSON.stringify(process.env.npm_package_version),
    },
  },
});
