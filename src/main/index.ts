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
  SUBSCRIBE_REFS,
  SUBSCRIBE_STATUS,
  SUBSCRIBE_FOCUS_PATCH,
  SUBSCRIBE_SUBMODULES,
  SET_FOCUS_COMMIT,
  SET_AMEND,
  DISCARD_CHANGES,
  STAGE_FILES,
  UNSTAGE_FILES,
  COMMIT_REPO,
  STAGE_PATCH,
  UNSTAGE_PATCH,
  DISCARD_PATCH,
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

// Subscription channels — renderer transfers a MessagePort; main registers it on the loader.
ipcMain.on(SUBSCRIBE_REFS, (event) => {
  gwitch.loaderFor(event.sender)?.setRefsPort(event.ports[0]);
});

ipcMain.on(SUBSCRIBE_STATUS, (event) => {
  gwitch.loaderFor(event.sender)?.setStatusPort(event.ports[0]);
});

ipcMain.on(SUBSCRIBE_FOCUS_PATCH, (event) => {
  gwitch.loaderFor(event.sender)?.setFocusPatchPort(event.ports[0]);
});

ipcMain.on(SUBSCRIBE_SUBMODULES, (event) => {
  gwitch.loaderFor(event.sender)?.setSubmodulesPort(event.ports[0]);
});

// Loader control
ipcMain.handle(SET_FOCUS_COMMIT, (_event, hash: string) => {
  gwitch.loaderFor(_event.sender)?.setFocusCommit(hash);
});

ipcMain.handle(SET_AMEND, (_event, amend: boolean) => {
  gwitch.loaderFor(_event.sender)?.setAmend(amend);
});

// Mutations
ipcMain.handle(DISCARD_CHANGES, (_event, files: string[]) => {
  return gwitch.loaderFor(_event.sender)?.discardChanges(files);
});

ipcMain.handle(STAGE_FILES, (_event, files: string[]) => {
  return gwitch.loaderFor(_event.sender)?.stageFiles(files);
});

ipcMain.handle(UNSTAGE_FILES, (_event, files: string[]) => {
  return gwitch.loaderFor(_event.sender)?.unstageFiles(files);
});

ipcMain.handle(
  COMMIT_REPO,
  (_event, amend: boolean, fixup: string | undefined, message: string) => {
    return gwitch.loaderFor(_event.sender)?.commit(amend, fixup, message);
  },
);

ipcMain.handle(STAGE_PATCH, (_event, patch: string, toAdd: string[]) => {
  return gwitch.loaderFor(_event.sender)?.stagePatch(patch, toAdd);
});

ipcMain.handle(UNSTAGE_PATCH, (_event, patch: string) => {
  return gwitch.loaderFor(_event.sender)?.unstagePatch(patch);
});

ipcMain.handle(DISCARD_PATCH, (_event, patch: string) => {
  return gwitch.loaderFor(_event.sender)?.discardPatch(patch);
});
