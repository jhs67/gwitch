import { screen, BrowserWindow, Rectangle, app, BrowserWindowConstructorOptions } from "electron";
import { promises as fs } from "fs";
import { join } from "path";
import deepEqual from "deep-equal";
import { ThemeType } from "./gwitch";

const FileName = "window-state-n.json";

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
  displayBounds: Rectangle;
}

function validThemeState(theme: string): ThemeType {
  if (theme !== "dark" && theme !== "system" && theme !== "light") return "system";
  return theme;
}

function isValidWindowState(body: WindowState) {
  if (typeof body !== "object") return;
  if (typeof body.x !== "number" || typeof body.y !== "number") return false;
  if (typeof body.width !== "number" || typeof body.height !== "number") return false;
  if (typeof body.isMaximized !== "boolean") return false;
  if (typeof body.isFullScreen !== "boolean") return false;

  const displayBounds = screen.getDisplayMatching(body).bounds;
  if (!deepEqual(body.displayBounds, displayBounds, { strict: true })) return false;

  return true;
}

export class WindowManager {
  private windows = new Map();
  private state?: WindowState;
  private theme_: ThemeType;

  async load() {
    this.theme_ = "system";
    try {
      const file = join(app.getPath("userData"), FileName);
      const body = JSON.parse(await fs.readFile(file, "utf8"));
      this.theme_ = validThemeState(body.theme);
      delete body.theme;
      if (!isValidWindowState(body)) throw new Error("loaded window state no longer valid");
      this.state = body;
    } catch (err) {
      console.info("error loading window state", err);
      this.state = undefined;
    }
  }

  get theme() {
    return this.theme_;
  }

  set theme(v: ThemeType) {
    this.theme_ = v;
    this.save();
  }

  loadState(window: BrowserWindow) {
    const winBounds = window.getBounds();
    this.state = {
      isMaximized: window.isMaximized(),
      isFullScreen: window.isFullScreen(),
      displayBounds: screen.getDisplayMatching(winBounds).bounds,
      x: winBounds.x,
      y: winBounds.y,
      width: winBounds.width,
      height: winBounds.height,
    };
  }

  async save() {
    const file = join(app.getPath("userData"), FileName);
    await fs.writeFile(file, JSON.stringify({ theme: this.theme_, ...this.state }), "utf8");
  }

  track(window: BrowserWindow) {
    const id = window.id;
    this.windows.set(id, window);

    if (this.state?.isMaximized) window.maximize();
    if (this.state?.isFullScreen) window.setFullScreen(true);

    window.on("close", () => {
      this.loadState(window);
    });

    window.on("closed", async () => {
      this.windows.delete(id);
      await this.save();
    });
  }

  opts(base: BrowserWindowConstructorOptions = {}): BrowserWindowConstructorOptions {
    const r: BrowserWindowConstructorOptions = {
      width: 1200,
      height: 800,
      ...base,
    };

    if (this.state) {
      r.width = this.state.width;
      r.height = this.state.height;

      // For the first window only, set the position
      if (this.windows.keys().next().done) {
        r.x = this.state.x;
        r.y = this.state.y;
      }
    }

    return r;
  }

  all(): BrowserWindow[] {
    return [...this.windows.values()];
  }
}
