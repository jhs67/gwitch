import { app, BrowserWindow, ipcMain } from "electron";
import Gwitch from "./gwitch";
import { LayoutStore } from "./layout-store";
import { LayoutState } from "@ipc/layout";
import {
  OPEN_OTHER,
  OPEN_PATH,
  GET_LAYOUT_STATE,
  SET_LAYOUT_STATE,
  GO_BACK,
  OPEN_SUBMODULE,
  REMOVE_RECENT,
} from "@ipc/ipc";
import { RepoPath } from "@ipc/repo";
import { initialize as remote_initialize } from "@electron/remote/main";

// initialize remote
remote_initialize();

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
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) gwitch.openOther(window);
});

ipcMain.on(OPEN_PATH, (event, path: string) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) gwitch.openPath(window, path);
});

const layoutStore = new LayoutStore();

ipcMain.handle(GET_LAYOUT_STATE, async (_event, path: string) => {
  return await layoutStore.load(path);
});

ipcMain.handle(SET_LAYOUT_STATE, async (_event, path: string, state: LayoutState) => {
  return await layoutStore.save(path, state);
});

ipcMain.on(GO_BACK, (event, path: RepoPath) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) gwitch.goBack(window, path);
});

ipcMain.on(OPEN_SUBMODULE, (event, path: RepoPath, newWindow: boolean) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) gwitch.openSubmodule(window, path, newWindow);
});

ipcMain.on(REMOVE_RECENT, (_event, path: string) => {
  gwitch.removeRecent(path);
});
