import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import renderer from "vite-plugin-electron-renderer";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    resolve: {
      alias: {
        "@ipc": resolve("src/ipc"),
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@ipc": resolve("src/ipc"),
      },
    },
    plugins: [renderer(), react()],
  },
});
