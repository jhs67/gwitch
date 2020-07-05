import chokidar, { FSWatcher } from "chokidar";

export class Watcher {
  private watcher: FSWatcher;

  constructor(cwd: string, paths: string[], private hook: () => void) {
    this.watcher = chokidar.watch(paths, {
      followSymlinks: false,
      disableGlobbing: true,
      ignoreInitial: true,
      cwd,
    });

    this.watcher.on("ready", () => this.hook());
    this.watcher.on("change", () => this.hook());
    this.watcher.on("unlink", () => this.hook());
    this.watcher.on("add", () => this.hook());
  }

  async close() {
    await this.watcher.close();
  }
}
