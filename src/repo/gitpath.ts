import { exec } from "child_process";
import { promisify } from "util";

class GitPath {
  cmd?: string;
  waits: { a: (c: string) => void; r: (err: Error) => void }[] = [];

  async get(): Promise<string> {
    if (this.cmd) return this.cmd;
    const wait = new Promise<string>((a, r) => this.waits.push({ a, r }));
    if (this.waits.length === 1) this.init();
    return await wait;
  }

  async init() {
    try {
      const r = await promisify(exec)("which git");
      this.cmd = r.stdout.trim();
    } catch (err) {
      const w = this.waits;
      this.waits = [];
      w.forEach((w) => w.r(err));
    }

    const w = this.waits;
    this.waits = [];
    w.forEach((w) => w.a(this.cmd));
  }
}

export const gitPath = new GitPath();
