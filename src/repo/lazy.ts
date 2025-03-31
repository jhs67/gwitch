import { Cancellable, CancelledError, cancelTimeout } from "./cancellable";

export class LazyUpdater {
  task: () => Cancellable<void>;
  run: Cancellable<void>;
  frozen = false;

  dirtyStart?: number;
  quietStart?: number;
  timer?: Cancellable<void>;

  constructor(public quiescent: number = 0, public timeout: number = 0) {}

  start(t: () => Cancellable<void>, clean = false) {
    if (this.task) throw new Error("can't double start");
    this.task = t;
    this.dirtyStart = clean ? undefined : -Number.MAX_VALUE;
    this.quietStart = clean ? undefined : -Number.MAX_VALUE;
    this.kick();
  }

  stop() {
    this.task = undefined;
    if (this.run) this.run.cancel();
    if (this.timer) this.timer.cancel();
    this.dirtyStart = undefined;
    this.quietStart = undefined;
    this.frozen = false;
  }

  poke() {
    if (!this.task) return;
    this.quietStart = Date.now();
    if (this.clean) this.dirtyStart = this.quietStart;
    if (this.timer) this.timer.cancel();
    this.kick();
  }

  cancel() {
    if (this.run) this.run.cancel();
  }

  freeze() {
    if (this.frozen) throw new Error("can't double freeze");
    this.frozen = true;
    if (this.timer) this.timer.cancel();
  }

  unfreeze() {
    if (!this.frozen) throw new Error("unfreeze not frozen");
    this.frozen = false;
    this.kick();
  }

  get clean() {
    return this.dirtyStart == null;
  }

  private kick() {
    if (this.clean) return;
    if (this.frozen) return;
    if (this.task == null) return;
    if (this.timer != null) return;
    if (this.run != null) return;

    const n = Date.now();
    const timeout = Math.min(
      this.dirtyStart + this.timeout - n,
      this.quietStart + this.quiescent - n,
    );

    if (timeout > 0) {
      this.timer = cancelTimeout(timeout);
      this.timer.result
        .catch((e) => {
          if (!(e instanceof CancelledError)) throw e;
        })
        .finally(() => {
          this.timer = undefined;
          this.kick();
        });
    } else {
      this.dirtyStart = undefined;
      this.quietStart = undefined;
      this.run = this.task();
      this.run.result
        .catch((e) => {
          if (!(e instanceof CancelledError)) console.error(`lazy task ended with error`, e);
        })
        .finally(() => {
          this.run = undefined;
          this.kick();
        });
    }
  }
}
