import { RecentStore } from "./recent-store";
import { BrowserWindow, dialog } from "electron";
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

export default class Gwitch {
  private recent = new RecentStore();

  async init(): Promise<void> {
    await this.recent.load();
    this.createWindow();
  }

  createWindow(): void {
    const windowOpts: Electron.BrowserWindowConstructorOptions = {
      height: 600,
      width: 800,
      webPreferences: {
        nodeIntegration: true,
      },
    };

    // Create the browser window.
    const window = new BrowserWindow(windowOpts);

    // and load the index.html of the app.
    window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    window.webContents.on("did-finish-load", () => {
      this.sendOpenRecent(window);
    });
  }

  sendOpenRecent(window: BrowserWindow): void {
    window.setTitle("Gwitch");
    window.webContents.send("recent", this.recent.all());
  }

  async openOther(window: BrowserWindow): Promise<void> {
    const result = await dialog.showOpenDialog({
      title: "Open Repository",
      properties: ["openDirectory"],
    });

    const files = result.filePaths;
    for (const f of files) await this.recent.add(f);
    this.sendOpenRecent(window);
  }

  async openPath(window: BrowserWindow, path: string): Promise<void> {
    await this.recent.add(path);
    this.sendOpenRecent(window);
  }
}