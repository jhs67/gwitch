import { RecentStore } from "./recent-store";
import { BrowserWindow, dialog, nativeTheme, app, WebContents } from "electron";
import { WindowManager } from "./window-manager";
import { setAppMenu } from "./appmenu";
import { RepoPath } from "@ipc/repo";
import { basename, dirname, join } from "node:path";
import { RepoLoaderMain } from "./repo/loader";

export type ThemeType = "light" | "dark" | "system";

export default class Gwitch {
  private recent = new RecentStore();
  private windows = new WindowManager();
  private loaders = new Map<number, RepoLoaderMain>();
  private queues = new Map<number, Promise<void>>();

  private enqueue(windowId: number, fn: () => Promise<void>): void {
    const tail = (this.queues.get(windowId) ?? Promise.resolve())
      .then(fn)
      .catch((err) => console.error("transition error:", err));
    this.queues.set(windowId, tail);
  }

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
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, "../preload/index.js"),
      },
      backgroundColor: this.activeTheme === "dark" ? "#1e1e1e" : "#fff",
    });

    // Create the browser window.
    const window = new BrowserWindow(windowOpts);
    this.windows.track(window);

    // Create a loader for this window and clean it up when the window closes.
    const loader = new RepoLoaderMain();
    this.loaders.set(window.id, loader);
    window.on("closed", () => {
      loader.close();
      this.loaders.delete(window.id);
      this.queues.delete(window.id);
    });

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
    const loader = this.loaders.get(window.id);
    if (!loader) return;
    window.setTitle("gwitch");
    this.enqueue(window.id, async () => {
      await loader.close();
      window.webContents.send("recent", this.recent.all());
    });
  }

  sendOpenPath(window: BrowserWindow, path: RepoPath): void {
    const loader = this.loaders.get(window.id);
    if (!loader) return;
    window.setTitle(`gwitch - ${[basename(path.path, ".git"), ...path.submodules].join("/")}`);
    this.enqueue(window.id, async () => {
      await loader.close();
      await loader.open(path);
      window.webContents.send("open", path);
    });
  }

  loaderFor(sender: WebContents): RepoLoaderMain | undefined {
    const window = BrowserWindow.fromWebContents(sender);
    return window ? this.loaders.get(window.id) : undefined;
  }

  sendTheme(window: BrowserWindow) {
    window.webContents.send("theme", this.activeTheme);
  }

  async openOther(window: BrowserWindow): Promise<void> {
    // Electron 43 defaults the dialog to the Downloads folder, so start beside
    // the most recently opened repository instead.
    const [recent] = this.recent.all();
    const result = await dialog.showOpenDialog({
      title: "Open Repository",
      defaultPath: recent ? dirname(recent) : undefined,
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
