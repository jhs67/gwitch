import { ChokidarOptions, FSWatcher } from "chokidar";
import { Cancellable, CancelledError } from "./cancellable";
import { relative } from "path";

class Ignored {
  ignored?: boolean;
  pending?: Cancellable<boolean>;
  watching?: boolean;
  counted?: boolean;
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
        // the last known answer; undefined while it has never been resolved
        const known = i.ignored;
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
              // only report the path when it has become visible; a re-check
              // that confirms an already watched path is not a change
              if (known !== false && this.ready) hook([path]);
            } else {
              if (i.watching) {
                this.watcher.unwatch(path);
                i.watching = false;
              }
            }
            // only balance ready counts that were taken out in opts.ignored
            if (i.counted && !this.ready) {
              i.counted = false;
              this.watcher._emitReady();
            }
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
          if (!this.ready) {
            i.counted = true;
            this.watcher._incrReadyCount();
          }
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

        // events for an ignored path can't affect the view of the repo;
        // when the ignore rules change invalidateIgnores() reports the
        // paths that become visible
        if (i.ignored) return;
      }

      hook([path]);
    };

    this.watcher.on("ready", () => {
      // chokidar can emit ready more than once: add() captures _emitReady
      // before it is swapped out, so a late add can re-fire it
      if (this.ready) return;
      this.ready = true;
      hook([]);
    });
    this.watcher.on("change", (path) => changed(path));
    this.watcher.on("unlink", (path) => changed(path));
    this.watcher.on("add", (path) => changed(path));
  }

  invalidateIgnores() {
    if (!this.ignore) return;
    for (const [path, i] of this.ignoresMap.entries()) {
      // restart any in-progress queries
      if (i.pending?.cancel) i.pending.cancel();
      // re-check regardless of previous result; gitignore rules changed.
      // the previous result is kept so the query can tell whether the state
      // actually changed, and so opts.ignored keeps answering consistently
      // until the new result arrives
      this.ignore(path, i);
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
