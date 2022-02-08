import { spawn, SpawnOptions } from "child_process";
import getStream from "get-stream";
import { Cancellable, cancellableX, CancelledError } from "./cancellable";

export interface RcResult {
  code: number;
  out: string;
  err: string;
}

export function execRc(
  cmd: string,
  args: string[],
  options: SpawnOptions,
  input?: string,
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
  const err = getStream(child.stderr);
  child.on("error", (err) => reject(err));
  child.on("close", async (code) => {
    try {
      accept({ code, out: await out, err: await err });
    } catch (err) {
      err.stdout = await out;
      err.stderr = await err;
      reject(err);
    }
  });
  if (input) process.nextTick(() => child.stdin.end(input));

  return {
    cancel: () => {
      child.kill();
      reject(new CancelledError());
    },
    result: r,
  };
}

export function exec(
  cmd: string,
  args: string[],
  opts: SpawnOptions,
  input?: string,
): Cancellable<string> {
  return cancellableX(execRc(cmd, args, opts, input), (res) => {
    if (res.code != 0)
      throw new Error(
        `command '${cmd} ${args.join(" ")}' failed with exit code ${res.code}: ${res.err}`,
      );
    return res.out;
  });
}
