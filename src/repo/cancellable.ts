export interface Cancellable<R> {
  cancel?: () => void;
  result: Promise<R>;
}

export function cancellableX<R, S>(r: Cancellable<S>, x: (s: S) => R): Cancellable<R> {
  return {
    cancel: r.cancel,
    result: r.result.then((s: S) => x(s)),
  };
}

type MaybeCancellable<R> = Promise<R> | Cancellable<R>;

export class CancelledError extends Error {
  constructor() {
    super("cancelled");
  }
}

class ExPromise<R> {
  constructor() {
    this.promise = new Promise<R>((a, r) => {
      this.accept = a;
      this.reject = r;
    });
  }

  promise: Promise<R>;
  accept: (r: R) => void;
  reject: (err: Error) => void;
}

function AwaitCallback<R>(
  p: Promise<R>,
  accept: (r: R) => void,
  reject: (err: Error) => void,
  final: () => void,
) {
  (async () => {
    try {
      accept(await p);
    } catch (err) {
      reject(err);
    } finally {
      final();
    }
  })();
}

interface RunTask {
  cancel?: () => void;
  reject: (err: Error) => void;
}

class CancellableRun {
  private cancelled = false;
  private tasks = new Set<RunTask>();

  add<R>(result: MaybeCancellable<R>): Promise<R> {
    if (this.cancelled) throw new Error("add to cancelled CancellableRun");
    const ex = new ExPromise<R>();

    result = result instanceof Promise ? { result } : result;
    const task = {
      cancel: result.cancel,
      reject: ex.reject,
    };
    this.tasks.add(task);
    AwaitCallback(
      result.result,
      (r: R) => {
        if (this.cancelled) ex.reject(new CancelledError());
        else ex.accept(r);
      },
      (err: Error) => {
        if (this.cancelled) ex.reject(new CancelledError());
        else ex.reject(err);
      },
      () => {
        if (this.cancelled) return;
        this.tasks.delete(task);
      },
    );

    return ex.promise;
  }

  cancel() {
    // mark this run as cancelled
    this.cancelled = true;

    // reject and cancel the remaining tasks
    for (const task of this.tasks) {
      task.reject(new CancelledError());
      if (task.cancel) task.cancel();
    }
  }
}

interface QueueTask {
  start: () => (() => void) | undefined;
  cancel?: () => void;
  reject: (err: Error) => void;
}

class CancellableQueue {
  private cancelled = false;
  private tasks: QueueTask[] = [];
  private started = 0;
  private kicking = false;

  constructor(private concurrency: number) {}

  add<R>(op: () => MaybeCancellable<R>): Promise<R> {
    if (this.cancelled) throw new Error("add to cancelled CancellableQueue");
    const ex = new ExPromise<R>();

    // create a task for this operation
    const task: QueueTask = {
      start: () => {
        this.started += 1;
        const t = op();
        const r = t instanceof Promise ? { result: t } : t;
        AwaitCallback(
          r.result,
          (r: R) => {
            if (this.cancelled) ex.reject(new CancelledError());
            else ex.accept(r);
          },
          (err: Error) => {
            if (this.cancelled) ex.reject(new CancelledError());
            else ex.reject(err);
          },
          () => {
            if (this.cancelled) return;
            const i = this.tasks.indexOf(task);
            this.tasks.splice(i, 1);
            this.started -= 1;
            this.kick();
          },
        );
        return r.cancel;
      },
      reject: ex.reject,
    };
    this.tasks.push(task);

    // start tasks if needed
    this.kick();
    return ex.promise;
  }

  cancel() {
    // mark this run as cancelled
    this.cancelled = true;

    // reject and cancel the remaining tasks
    for (const task of this.tasks) {
      task.reject(new CancelledError());
      if (task.cancel) task.cancel();
    }
  }

  private kick() {
    // prevent recursive kicking to prevent unnecessary stack wind up
    if (this.kicking) return;
    this.kicking = true;

    // kick until enough tasks are start
    while (this.started < this.concurrency && this.started < this.tasks.length) {
      const task = this.tasks[this.started];
      task.cancel = task.start();
    }

    this.kicking = false;
  }
}

export type Runner = <T>(r: MaybeCancellable<T>) => Promise<T>;

export function cancellableRun<R>(run: (run: Runner) => Promise<R>): Cancellable<R> {
  const cancellableRun = new CancellableRun();
  return {
    cancel: () => cancellableRun.cancel(),
    result: run(<T>(a: MaybeCancellable<T>) => cancellableRun.add(a)),
  };
}

export type QueueRunner = <T>(a: () => MaybeCancellable<T>) => Promise<T>;

export function cancellableQueue<R>(
  concurrency: number,
  run: (run: QueueRunner) => Promise<R>,
): Cancellable<R> {
  const cancellableQueue = new CancellableQueue(concurrency);
  return {
    cancel: () => cancellableQueue.cancel(),
    result: run(<T>(a: () => MaybeCancellable<T>) => cancellableQueue.add(a)),
  };
}
