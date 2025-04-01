import { RecentStore } from "./recent-store";
import { BrowserWindow, dialog, nativeTheme, app } from "electron";
import { WindowManager } from "./window-manager";
import { setAppMenu } from "./appmenu";
import { RepoPath } from "@ipc/repo";
import { basename, join } from "node:path";
import { enable as remote_enable } from "@electron/remote/main";

export type ThemeType = "light" | "dark" | "system";

export default class Gwitch {
  private recent = new RecentStore();
  private windows = new WindowManager();

  setTheme(v: ThemeType) {
    this.windows.theme = v;
    nativeTheme.themeSource = v;
    this.windows.all().forEach((w) => this.sendTheme(w));
  }

  get activeTheme() {
    return this.windows.theme === "system"
      ? nativeTheme.shouldUseDarkColors
        ? "dark"
        : "light"
      : this.windows.theme;
  }

  async init(): Promise<void> {
    await Promise.all([await this.recent.load(), await this.windows.load()]);
    nativeTheme.on("updated", () => this.windows.all().forEach((w) => this.sendTheme(w)));
    setAppMenu(this.windows.theme);
    this.createWindow();
  }

  createWindow(path?: RepoPath): void {
    const windowOpts = this.windows.opts({
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      backgroundColor: this.activeTheme === "dark" ? "#1e1e1e" : "#fff",
    });

    // Create the browser window.
    const window = new BrowserWindow(windowOpts);
    this.windows.track(window);

    // set up remote
    remote_enable(window.webContents);

    // and load the index.html of the app.
    if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
      window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else {
      window.loadFile(join(__dirname, "../renderer/index.html"));
    }
    window.webContents.on("did-finish-load", () => {
      this.sendTheme(window);
      if (path == null) this.sendOpenRecent(window);
      else this.sendOpenPath(window, path);
    });
  }

  sendOpenRecent(window: BrowserWindow): void {
    window.setTitle("gwitch");
    window.webContents.send("recent", this.recent.all());
  }

  sendOpenPath(window: BrowserWindow, path: RepoPath) {
    window.setTitle(`gwitch - ${[basename(path.path, ".git"), ...path.submodules].join("/")}`);
    window.webContents.send("open", path);
  }

  sendTheme(window: BrowserWindow) {
    window.webContents.send("theme", this.activeTheme);
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

  async removeRecent(path: string) {
    await this.recent.remove(path);
  }
}
