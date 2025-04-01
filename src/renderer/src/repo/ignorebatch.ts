import { Cancellable, CancelledError } from "./cancellable";
import { Gwit } from "./gwit";

interface BatchJob {
  path: string;
  accept?: (a: boolean) => void;
  reject?: (e: Error) => void;
}

interface Batch {
  jobs: BatchJob[];
  cancel: () => void;
}

export class IgnoreBatch {
  private pending: BatchJob[] = [];
  private defered = false;
  private batch?: Batch;

  constructor(
    private gwit: Gwit,
    private maxBatchSize = 256,
  ) {}

  ignore(path: string): Cancellable<boolean> {
    let accept: (a: boolean) => void;
    let reject: (e: Error) => void;
    const result = new Promise<boolean>((a, r) => {
      accept = a;
      reject = r;
    });

    const job: BatchJob = {
      path: path,
      accept,
      reject,
    };

    this.pending.push(job);
    if (!this.batch && !this.defered) {
      this.defered = true;
      setTimeout(() => {
        this.defered = false;
        if (!this.batch) this.start();
      }, 1);
    }

    return {
      result,
      cancel: () => {
        // check if this job is in the current batch
        const ji = this.batch?.jobs.indexOf(job);
        if (ji != null && ji != -1) {
          this.batch.jobs.splice(ji, 1);
          if (this.batch.jobs.length === 0) this.batch.cancel();
        } else {
          // remove it from the pending list
          this.pending.splice(this.pending.indexOf(job), 1);
        }
        reject(new CancelledError());
      },
    };
  }

  private start() {
    if (this.pending.length === 0) return;
    const jobs = this.pending.splice(0, this.maxBatchSize);
    const r = this.gwit.getIgnored(jobs.map((j) => j.path));
    this.batch = { jobs, cancel: r.cancel };
    r.result
      .then((ignored) => {
        for (const j of jobs) j.accept(ignored.indexOf(j.path) !== -1);
      })
      .catch((err) => {
        for (const j of jobs) j.reject(err);
      })
      .finally(() => {
        this.batch = null;
        this.start();
      });
  }
}
