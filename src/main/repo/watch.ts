import { ChokidarOptions, FSWatcher } from "chokidar";
import { Cancellable, CancelledError } from "./cancellable";
import { relative } from "path";

class Ignored {
  ignored?: boolean;
  pending?: Cancellable<boolean>;
  watching?: boolean;
}

export class Watcher {
  private watcher: FSWatcher;
  private ignoresMap = new Map<string, Ignored>();
  private ignore?: (path: string, i: Ignored) => void;
  private ready = false;

  constructor(
    cwd: string,
    paths: string[],
    hook: (path: string[]) => void,
    ignore?: (path: string) => Cancellable<boolean>,
  ) {
    const opts: ChokidarOptions = {
      followSymlinks: false,
      ignoreInitial: true,
      cwd,
    };

    if (ignore) {
      this.ignore = (path: string, i: Ignored) => {
        i.pending = ignore(path);
        i.pending.result
          .then((r) => {
            i.pending = undefined;
            i.ignored = r;
            if (!i.ignored) {
              if (!i.watching) {
                this.watcher.add(path);
                i.watching = true;
              }
              if (i.watching && this.ready) hook([path]);
            } else {
              if (i.watching) {
                this.watcher.unwatch(path);
                i.watching = false;
              }
            }
            if (!this.ready) this.watcher._emitReady();
          })
          .catch((err) => {
            if (!(err instanceof CancelledError)) throw err;
          });
      };

      opts.ignored = (path: string, stat?: unknown) => {
        if (stat) return false; // ignore the call with the stat

        const p = relative(cwd, path);
        const i = this.ignores(p);
        if (i.ignored != null) return i.ignored;

        if (i.pending == null) {
          if (this.ignore) this.ignore(p, i);
          if (!this.ready) this.watcher._incrReadyCount();
        }
        return true;
      };
    }

    this.watcher = new FSWatcher(opts);
    this.watcher.add(paths);

    const changed = (path: string) => {
      if (this.ignore) {
        const i = this.ignores(path);

        if (i.ignored == null) {
          this.ignore(path, i);
          return;
        }
      }

      hook([path]);
    };

    this.watcher.on("ready", () => {
      this.ready = true;
      hook([]);
    });
    this.watcher.on("change", (path) => changed(path));
    this.watcher.on("unlink", (path) => changed(path));
    this.watcher.on("add", (path) => changed(path));
  }

  invalidateIgnores() {
    for (const [path, i] of this.ignoresMap.entries()) {
      if (i.pending != null) {
        // restart any in-progress queries
        if (i.pending.cancel) i.pending.cancel();
        if (this.ignore) this.ignore(path, i);
      } else {
        // re-check regardless of previous result; gitignore rules changed
        i.ignored = undefined;
        if (this.ignore) this.ignore(path, i);
      }
    }
  }

  async close() {
    for (const [, i] of this.ignoresMap.entries()) {
      if (i.pending?.cancel) i.pending.cancel();
    }
    await this.watcher.close();
    this.ignoresMap.clear();
  }

  private ignores(path: string) {
    let c = this.ignoresMap.get(path);
    if (c == null) {
      c = new Ignored();
      this.ignoresMap.set(path, c);
    }
    return c;
  }
}
