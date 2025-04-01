import { ChokidarOptions, FSWatcher } from "chokidar";
import { Cancellable, CancelledError } from "./cancellable";
import { relative } from "path";

class Ignored {
  ignored?: boolean;
  pending?: Cancellable<boolean>;
  changed?: undefined | true;
}

type WatcherInternal = FSWatcher & {
  _incrReadyCount: () => number;
  _emitReady: () => void;
};

export class Watcher {
  private watcher: FSWatcher;
  private ignoresMap = new Map<string, Ignored>();
  private ignore?: (path: string, i: Ignored) => void;

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
              this.watcher.add(path);
              // check for defered change result pending ignore update
              if (i.changed) hook([path]);
            }
            i.changed = undefined;

            // roll back the _readyCount
            (this.watcher as WatcherInternal)._emitReady();
          })
          .catch((err) => {
            if (!(err instanceof CancelledError)) throw err;
          });
      };

      opts.ignored = (path: string, stat?: unknown) => {
        if (stat) return false; // ignore the call with the stat

        // check for a current ignores record for this path
        const p = relative(cwd, path);
        const i = this.ignores(p);
        if (i.ignored != null) return i.ignored;

        // start a check if there is no current
        if (i.pending == null) {
          // start the ignore query
          if (this.ignore) this.ignore(p, i);
          // keep the watcher from being ready until the ignore result completes
          (this.watcher as WatcherInternal)._incrReadyCount();
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
          // changed file that we're not sure is ignored
          i.changed = true;
          this.ignore(path, i);
          // keep the watcher from being ready until the ignore result completes
          (this.watcher as WatcherInternal)._incrReadyCount();
          return;
        }
      }

      hook([path]);
    };

    this.watcher.on("ready", () => {
      hook([]);
    });
    this.watcher.on("change", (path) => {
      changed(path);
    });
    this.watcher.on("unlink", (path) => {
      changed(path);
    });
    this.watcher.on("add", (path) => {
      changed(path);
    });
  }

  invalidateIgnores() {
    for (const [path, i] of this.ignoresMap.entries()) {
      if (i.pending != null) {
        // restart any in-progress queries
        if (i.pending.cancel) i.pending.cancel();
        if (this.ignore) this.ignore(path, i);
      } else if (i.ignored === true) {
        // if it was ignored, clear and try again
        i.ignored = undefined;
        if (this.ignore) this.ignore(path, i);
        // keep the watcher from being ready until the ignore result completes
        (this.watcher as WatcherInternal)._incrReadyCount();
      } else {
        // clear the result but defer the check until the file changes
        i.ignored = undefined;
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
