import { spawn, SpawnOptions } from "child_process";
import getStream from "get-stream";

export interface RcResult {
  code: number;
  out: string;
}

export function execRc(
  cmd: string,
  args: string[],
  options: SpawnOptions,
): Promise<RcResult> {
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

  return r;
}

export async function exec(
  cmd: string,
  args: string[],
  opts: SpawnOptions,
): Promise<string> {
  const res = await execRc(cmd, args, opts);
  if (res.code != 0)
    throw new Error(`command '${cmd} ${args.join(" ")}' failed with exit code ${res.code}`);
  return res.out;
}
