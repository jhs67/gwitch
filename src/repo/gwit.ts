import { join, resolve } from "path";
import { RepoPath, RepoRef } from "../store/repo/types";
import { exec, execRc, RcResult } from "./exec";
import { Cancellable, cancellableX } from "./cancellable";
import { gitPath } from "./gitpath";

export class Gwit {
  private cmd?: string;
  private repoPath?: string;

  async open(path: RepoPath) {
    this.cmd = await gitPath.get();

    this.repoPath = join(path.path, ...path.submodules);
    const top = await this.git("rev-parse", "--show-toplevel").result;
    this.repoPath = top.trim();
  }

  close() {
    this.repoPath = null;
  }

  git(...args: (string | string[])[]): Cancellable<string> {
    const a = [].concat(...args);
    const opts = { cwd: this.repoPath, maxBuffer: 200 * 1024 * 1024 };
    return exec(this.cmd, a, opts);
  }

  gitDir(): Cancellable<string> {
    return cancellableX(this.git("rev-parse", "--git-dir"), (dir) =>
      resolve(this.repoPath, dir.trim()),
    );
  }

  gitRc(...args: (string | string[])[]): Cancellable<RcResult> {
    const a = [].concat(...args);
    const opts = { cwd: this.repoPath, maxBuffer: 200 * 1024 * 1024 };
    return execRc(this.cmd, a, opts);
  }

  getRefs(): Cancellable<RepoRef[]> {
    return cancellableX(this.gitRc("show-ref", "--head"), (result) => {
      if (result.code === 1) return [];
      if (result.code !== 0) throw new Error(`show-ref returned error code ${result.code}`);

      return result.out
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
    });
  }

  getStashRefs(): Cancellable<RepoRef[]> {
    return cancellableX(this.git("stash", "list", "--format=%H"), (output) => {
      return output
        .trim()
        .split("\n")
        .filter((hash) => hash.length)
        .map((hash, i) => {
          return {
            hash,
            refName: `stash@{${i + 1}}`,
            name: `stash@{${i + 1}}`,
            type: "stash",
          };
        });
    });
  }
}
