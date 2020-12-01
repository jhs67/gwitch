import { RecentStore } from "./recent-store";
import { BrowserWindow, dialog } from "electron";
import { WindowManager } from "./window-manager";
import { setAppMenu } from "./appmenu";
import { RepoPath } from "../store/repo/types";
import { basename } from "path";
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

export default class Gwitch {
  private recent = new RecentStore();
  private windows = new WindowManager();

  async init(): Promise<void> {
    setAppMenu();
    await Promise.all([await this.recent.load(), await this.windows.load()]);
    this.createWindow();
  }

  createWindow(path?: RepoPath): void {
    const windowOpts = this.windows.opts({
      webPreferences: { nodeIntegration: true, enableRemoteModule: true },
    });

    // Create the browser window.
    const window = new BrowserWindow(windowOpts);
    this.windows.track(window);

    // and load the index.html of the app.
    window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    window.webContents.on("did-finish-load", () => {
      if (path == null) this.sendOpenRecent(window);
      else this.sendOpenPath(window, path);
    });
  }

  sendOpenRecent(window: BrowserWindow): void {
    window.setTitle("gwitch");
    window.webContents.send("recent", this.recent.all());
  }

  sendOpenPath(window: BrowserWindow, path: RepoPath) {
    window.setTitle(
      `gwitch - ${[basename(path.path, ".git"), ...path.submodules].join("/")}`,
    );
    window.webContents.send("open", path);
  }

  async openOther(window: BrowserWindow): Promise<void> {
    const result = await dialog.showOpenDialog({
      title: "Open Repository",
      properties: ["openDirectory"],
    });

    const files = result.filePaths;
    for (let i = 0; i < files.length; ++i) {
      const path = files[i];
      await this.recent.add(path);
      if (i === 0) this.sendOpenPath(window, { path, submodules: [] });
      else this.createWindow({ path, submodules: [] });
    }
  }

  async openPath(window: BrowserWindow, path: string): Promise<void> {
    await this.recent.add(path);
    this.sendOpenPath(window, { path, submodules: [] });
  }

  goBack(window: BrowserWindow, path: RepoPath) {
    if (path.submodules.length) {
      path.submodules.pop();
      this.sendOpenPath(window, path);
    } else {
      this.sendOpenRecent(window);
    }
  }

  openSubmodule(window: BrowserWindow, path: RepoPath, newWindow: boolean) {
    if (newWindow) {
      this.createWindow(path);
    } else {
      this.sendOpenPath(window, path);
    }
  }
}
