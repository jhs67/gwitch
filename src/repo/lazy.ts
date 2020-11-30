import { Cancellable, CancelledError } from "./cancellable";

export class LazyUpdater {
  task: () => Cancellable<void>;
  run: Cancellable<void>;
  frozen = false;
  clean = false;

  start(t: () => Cancellable<void>, clean = false) {
    this.task = t;
    this.clean = clean;
    this.frozen = false;
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
    if (!this.frozen) this.kick();
  }

  freeze() {
    if (this.frozen) throw new Error("can't double freeze");
    this.frozen = true;
  }

  unfreeze() {
    if (!this.frozen) throw new Error("unfreeze no frozeon");
    this.frozen = false;
    if (!this.clean) this.kick();
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
