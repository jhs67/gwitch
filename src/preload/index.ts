import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { LayoutState } from "@ipc/layout";
import { RepoPath } from "@ipc/repo";
import {
  GET_LAYOUT_STATE,
  SET_LAYOUT_STATE,
  OPEN_OTHER,
  OPEN_PATH,
  GO_BACK,
  OPEN_SUBMODULE,
  REMOVE_RECENT,
} from "@ipc/ipc";

const gwitchApi = {
  getLayoutState: (path: string): Promise<Partial<LayoutState> | null> =>
    ipcRenderer.invoke(GET_LAYOUT_STATE, path),

  setLayoutState: (path: string, state: LayoutState): Promise<void> =>
    ipcRenderer.invoke(SET_LAYOUT_STATE, path, state),

  openOther: (): void => ipcRenderer.send(OPEN_OTHER),

  openPath: (path: string): void => ipcRenderer.send(OPEN_PATH, path),

  goBack: (path: RepoPath): void => ipcRenderer.send(GO_BACK, path),

  openSubmodule: (path: RepoPath, newWindow: boolean): void =>
    ipcRenderer.send(OPEN_SUBMODULE, path, newWindow),

  removeRecent: (path: string): void => ipcRenderer.send(REMOVE_RECENT, path),

  onRecent: (callback: (repos: string[]) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, repos: string[]) => callback(repos);
    ipcRenderer.on("recent", handler);
    return () => ipcRenderer.removeListener("recent", handler);
  },

  onOpen: (callback: (path: RepoPath) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, path: RepoPath) => callback(path);
    ipcRenderer.on("open", handler);
    return () => ipcRenderer.removeListener("open", handler);
  },

  onTheme: (callback: (theme: "dark" | "light") => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, theme: "dark" | "light") => callback(theme);
    ipcRenderer.on("theme", handler);
    return () => ipcRenderer.removeListener("theme", handler);
  },
};

export type GwitchApi = typeof gwitchApi;

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("gwitch", gwitchApi);
} else {
  (window as unknown as Record<string, unknown>).gwitch = gwitchApi;
}
