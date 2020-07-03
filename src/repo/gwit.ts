import { RepoPath, RepoRef } from "../store/repo/types";
import { exec, execRc, RcResult } from "./exec";
import { join, resolve } from "path";
import { gitPath } from "./gitpath";

export class Gwit {
  private cmd?: string;
  private repoPath?: string;

  async open(path: RepoPath) {
    this.cmd = await gitPath.get();

    this.repoPath = join(path.path, ...path.submodules);
    const top = await this.git("rev-parse", "--show-toplevel");
    this.repoPath = top.trim();
  }

  close() {
    this.repoPath = null;
  }

  async gitDir() {
    const dir = await this.git("rev-parse", "--git-dir");
    return resolve(this.repoPath, dir.trim());
  }

  async git(...args: (string | string[])[]): Promise<string> {
    const a = [].concat(...args);
    const opts = { cwd: this.repoPath, maxBuffer: 200 * 1024 * 1024 };
    return await exec(this.cmd, a, opts);
  }

  async gitRc(...args: (string | string[])[]): Promise<RcResult> {
    const a = [].concat(...args);
    const opts = { cwd: this.repoPath, maxBuffer: 200 * 1024 * 1024 };
    return await execRc(this.cmd, a, opts);
  }

  async getRefs(): Promise<RepoRef[]> {
    const result = await this.gitRc("show-ref", "--head");
    if (result.code === 1) return [];
    if (result.code !== 0) throw new Error(`show-ref returned error code ${result.code}`);

    const stdrefs: RepoRef[] = result.out
      .trim()
      .split("\n")
      .map(function (line) {
        const split = line.indexOf(" ");
        const hash = line.substr(0, split);
        const refName = line.substr(split + 1);
        if (refName === "HEAD") {
          return {
            hash,
            refName,
            type: "HEAD",
            name: "HEAD",
          };
        }

        const names = refName.split("/");
        const type = (names.shift(), names.shift());
        let name = names.join("/");
        if (!name) name = type;
        return {
          hash: hash,
          refName: refName,
          type: type as "heads" | "remotes" | "tags",
          name: name,
        };
      });

    const output = await this.git("stash", "list", "--format=%H");
    const stashrefs: RepoRef[] = output
      .trim()
      .split("\n")
      .map((hash, i) => {
        return {
          hash: hash,
          refName: `stash@{${i + 1}}`,
          name: `stash@{${i + 1}}`,
          type: "stash",
        };
      });

    return stdrefs.concat(stashrefs);
  }
}
