import { Cancellable, CancelledError } from "./cancellable";

export class LazyUpdater {
  task: () => Cancellable<void>;
  run: Cancellable<void>;
  clean = false;

  start(t: () => Cancellable<void>, clean = false) {
    this.task = t;
    this.clean = clean;
    if (!this.clean) this.kick();
  }

  stop() {
    this.task = undefined;
    this.cancel();
  }

  cancel() {
    if (this.run) this.run.cancel();
  }

  poke() {
    this.clean = false;
    this.kick();
  }

  private kick() {
    if (this.task == null) return;
    if (this.run != null) return;

    this.clean = true;
    this.run = this.task();
    this.run.result
      .catch((e) => {
        if (!(e instanceof CancelledError)) console.error("lazy task ended with error", e);
      })
      .finally(() => {
        this.run = undefined;
        if (!this.clean) this.kick();
      });
  }
}
