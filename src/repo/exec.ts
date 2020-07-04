import { spawn, SpawnOptions } from "child_process";
import getStream from "get-stream";
import { Cancellable, cancellableX, CancelledError } from "./cancellable";

export interface RcResult {
  code: number;
  out: string;
}

export function execRc(
  cmd: string,
  args: string[],
  options: SpawnOptions,
): Cancellable<RcResult> {
  // create a promise and record the callbacks
  let accept: (r: RcResult) => void;
  let reject: (err: Error) => void;
  const r = new Promise<RcResult>((a, r) => {
    accept = a;
    reject = r;
  });

  const child = spawn(cmd, args, options);
  const out = getStream(child.stdout);
  child.on("error", (err) => reject(err));
  child.on("exit", async (code) => {
    try {
      accept({ code, out: await out });
    } catch (err) {
      reject(err);
    }
  });

  return {
    cancel: () => {
      child.kill();
      reject(new CancelledError());
    },
    result: r,
  };
}

export function exec(cmd: string, args: string[], opts: SpawnOptions): Cancellable<string> {
  return cancellableX(execRc(cmd, args, opts), (res) => {
    if (res.code != 0)
      throw new Error(
        `command '${cmd} ${args.join(" ")}' failed with exit code ${res.code}`,
      );
    return res.out;
  });
}
