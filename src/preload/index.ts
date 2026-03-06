import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { RepoPath } from "@ipc/repo";
import type {
  RefsMessage,
  StatusMessage,
  FocusPatchMessage,
  SubmodulesMessage,
} from "@ipc/repo-types";
import {
  OPEN_OTHER,
  OPEN_PATH,
  GO_BACK,
  OPEN_SUBMODULE,
  REMOVE_RECENT,
  SUBSCRIBE_REFS,
  SUBSCRIBE_STATUS,
  SUBSCRIBE_FOCUS_PATCH,
  SUBSCRIBE_SUBMODULES,
  SET_FOCUS_COMMIT,
  SET_AMEND,
  SHELL_OPEN_PATH,
  SHELL_SHOW_ITEM,
  SHELL_TRASH_ITEM,
  SHOW_MESSAGE_BOX,
  POPUP_MENU,
  DISCARD_CHANGES,
  STAGE_FILES,
  UNSTAGE_FILES,
  COMMIT_REPO,
  STAGE_PATCH,
  UNSTAGE_PATCH,
  DISCARD_PATCH,
  GET_COMMIT_TREE,
  GET_FILE_CONTENT,
} from "@ipc/ipc";

const gwitchApi = {
  // Window navigation
  openOther: (): void => ipcRenderer.send(OPEN_OTHER),

  openPath: (path: string): void => ipcRenderer.send(OPEN_PATH, path),

  goBack: (path: RepoPath): void => ipcRenderer.send(GO_BACK, path),

  openSubmodule: (path: RepoPath, newWindow: boolean): void =>
    ipcRenderer.send(OPEN_SUBMODULE, path, newWindow),

  removeRecent: (path: string): void => ipcRenderer.send(REMOVE_RECENT, path),

  // Main → renderer push notifications
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

  // Repo subscriptions — per-window MessageChannel ports
  subscribeRefs: (callback: (msg: RefsMessage) => void): (() => void) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (ev) => callback(ev.data);
    ipcRenderer.postMessage(SUBSCRIBE_REFS, null, [channel.port2]);
    return () => channel.port1.close();
  },

  subscribeStatus: (callback: (msg: StatusMessage) => void): (() => void) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (ev) => callback(ev.data);
    ipcRenderer.postMessage(SUBSCRIBE_STATUS, null, [channel.port2]);
    return () => channel.port1.close();
  },

  subscribeFocusPatch: (callback: (msg: FocusPatchMessage) => void): (() => void) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (ev) => callback(ev.data);
    ipcRenderer.postMessage(SUBSCRIBE_FOCUS_PATCH, null, [channel.port2]);
    return () => channel.port1.close();
  },

  subscribeSubmodules: (callback: (msg: SubmodulesMessage) => void): (() => void) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (ev) => callback(ev.data);
    ipcRenderer.postMessage(SUBSCRIBE_SUBMODULES, null, [channel.port2]);
    return () => channel.port1.close();
  },

  // Shell / dialog
  shellOpenPath: (path: string): void => ipcRenderer.send(SHELL_OPEN_PATH, path),

  shellShowItem: (path: string): void => ipcRenderer.send(SHELL_SHOW_ITEM, path),

  shellTrashItem: (path: string): void => ipcRenderer.send(SHELL_TRASH_ITEM, path),

  showMessageBox: (opts: {
    type?: string;
    buttons?: string[];
    title?: string;
    message: string;
    detail?: string;
  }): Promise<number> => ipcRenderer.invoke(SHOW_MESSAGE_BOX, opts),

  popupMenu: (items: { label: string }[]): Promise<number | null> =>
    ipcRenderer.invoke(POPUP_MENU, items),

  // Loader control
  setFocusCommit: (hash: string): Promise<void> => ipcRenderer.invoke(SET_FOCUS_COMMIT, hash),

  setAmend: (amend: boolean): Promise<void> => ipcRenderer.invoke(SET_AMEND, amend),

  // Mutations
  discardChanges: (files: string[]): Promise<void> => ipcRenderer.invoke(DISCARD_CHANGES, files),

  stageFiles: (files: string[]): Promise<void> => ipcRenderer.invoke(STAGE_FILES, files),

  unstageFiles: (files: string[]): Promise<void> => ipcRenderer.invoke(UNSTAGE_FILES, files),

  commitRepo: (amend: boolean, fixup: string | undefined, message: string): Promise<void> =>
    ipcRenderer.invoke(COMMIT_REPO, amend, fixup, message),

  stagePatch: (patch: string, toAdd: string[]): Promise<void> =>
    ipcRenderer.invoke(STAGE_PATCH, patch, toAdd),

  unstagePatch: (patch: string): Promise<void> => ipcRenderer.invoke(UNSTAGE_PATCH, patch),

  discardPatch: (patch: string): Promise<void> => ipcRenderer.invoke(DISCARD_PATCH, patch),

  getCommitTree: (hash: string): Promise<string[]> => ipcRenderer.invoke(GET_COMMIT_TREE, hash),

  getFileContent: (hash: string, path: string): Promise<string> =>
    ipcRenderer.invoke(GET_FILE_CONTENT, hash, path),
};

export type GwitchApi = typeof gwitchApi;

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("gwitch", gwitchApi);
} else {
  (window as unknown as Record<string, unknown>).gwitch = gwitchApi;
}
