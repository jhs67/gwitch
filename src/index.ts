import { app, BrowserWindow, ipcMain } from "electron";
import Gwitch from "./main/gwitch";
import { LayoutStore } from "./main/layout-store";
import { LayoutState } from "./store/layout/types";
import {
  OPEN_OTHER,
  OPEN_PATH,
  GET_LAYOUT_STATE,
  SET_LAYOUT_STATE,
  GO_BACK,
  OPEN_SUBMODULE,
  REMOVE_RECENT,
} from "./main/ipc";
import { RepoPath } from "./store/repo/types";
import { initialize as remote_initialize } from '@electron/remote/main'

// initialize remote
remote_initialize()

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

export const gwitch = new Gwitch();

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  gwitch.init();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    gwitch.createWindow();
  }
});

ipcMain.on(OPEN_OTHER, (event) => {
  gwitch.openOther(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.on(OPEN_PATH, (event, path: string) => {
  gwitch.openPath(BrowserWindow.fromWebContents(event.sender), path);
});

const layoutStore = new LayoutStore();

ipcMain.handle(GET_LAYOUT_STATE, async (event, path: string) => {
  return await layoutStore.load(path);
});

ipcMain.handle(SET_LAYOUT_STATE, async (event, path: string, state: LayoutState) => {
  return await layoutStore.save(path, state);
});

ipcMain.on(GO_BACK, (event, path: RepoPath) => {
  gwitch.goBack(BrowserWindow.fromWebContents(event.sender), path);
});

ipcMain.on(OPEN_SUBMODULE, (event, path: RepoPath, newWindow: boolean) => {
  gwitch.openSubmodule(BrowserWindow.fromWebContents(event.sender), path, newWindow);
});

ipcMain.on(REMOVE_RECENT, (event, path: string) => {
  gwitch.removeRecent(path);
});
