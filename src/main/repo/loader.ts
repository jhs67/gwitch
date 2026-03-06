import { MessagePortMain } from "electron";
import { resolve, basename, relative } from "node:path";
import { RepoPath } from "@ipc/repo";
import {
  Commit,
  FileStatus,
  RefsMessage,
  StatusMessage,
  FocusPatchMessage,
  SubmodulesMessage,
} from "@ipc/repo-types";
import { Gwit } from "./gwit";
import { Watcher } from "./watch";
import { LazyUpdater } from "./lazy";
import { cancellableRun, cancellableQueue } from "./cancellable";
import { createGraph } from "./graph";
import { IgnoreBatch } from "./ignore_batch";

export class RepoLoaderMain {
  private gwit = new Gwit();
  private batchIgnored = new IgnoreBatch(this.gwit);

  private refsLazy = new LazyUpdater(100, 1000);
  private refsWatch: Watcher | null = null;

  private statusLazy = new LazyUpdater(100, 1000);
  private statusWatch: Watcher | null = null;

  private submoduleLazy = new LazyUpdater(100, 1000);

  private focusPatchLazy = new LazyUpdater(100, 1000);

  // Internal state (replaces Redux store reads from the renderer-side loader)
  private head: string | undefined;
  private commits: Commit[] = [];
  private currentFocusCommit: string | undefined;
  private amend = false;

  // Ports for pushing results to the renderer
  private refsPort: MessagePortMain | null = null;
  private statusPort: MessagePortMain | null = null;
  private focusPatchPort: MessagePortMain | null = null;
  private submodulesPort: MessagePortMain | null = null;

  setRefsPort(port: MessagePortMain): void {
    this.refsPort?.close();
    this.refsPort = port;
    port.start();
  }

  setStatusPort(port: MessagePortMain): void {
    this.statusPort?.close();
    this.statusPort = port;
    port.start();
  }

  setFocusPatchPort(port: MessagePortMain): void {
    this.focusPatchPort?.close();
    this.focusPatchPort = port;
    port.start();
  }

  setSubmodulesPort(port: MessagePortMain): void {
    this.submodulesPort?.close();
    this.submodulesPort = port;
    port.start();
  }

  setFocusCommit(hash: string): void {
    if (this.currentFocusCommit === hash) return;
    this.currentFocusCommit = hash;
    this.focusPatchLazy.stop();
    this.focusPatchLazy.start(() => this.loadFocusPatch(hash));
  }

  setAmend(amend: boolean): void {
    if (this.amend === amend) return;
    this.amend = amend;
    this.statusLazy.cancel();
    this.statusLazy.poke();
  }

  async open(path: RepoPath): Promise<void> {
    const top = await this.gwit.open(path);
    const git_dir = await this.gwit.gitDir().result;
    this.startWatchers(top, git_dir);
  }

  private startWatchers(top: string, git_dir: string): void {
    this.refsLazy.start(() => this.loadCommits());
    this.refsWatch = new Watcher(
      git_dir,
      [""],
      (paths) => {
        const i = paths.filter((p) => p === "index").length;
        if (i !== 0 || paths.includes("HEAD") || (this.head && paths.includes(this.head)))
          this.statusLazy.poke();
        if (i === 0 || i !== paths.length) this.refsLazy.poke();
      },
      (path) =>
        cancellableRun(async () => {
          const roots = ["logs", "refs", "packed-refs", "HEAD", "index"];
          return path !== "" && !roots.includes(path.split("/")[0]);
        }),
    );

    this.statusLazy.start(() => this.loadStatus());
    this.statusWatch = new Watcher(
      top,
      [""],
      (paths: string[]) => {
        if (paths.some((p) => basename(p) === ".gitignore")) this.statusWatch?.invalidateIgnores();
        this.statusLazy.poke();
        if (paths.indexOf(".gitmodules") !== -1) this.submoduleLazy.poke();
      },
      (path) =>
        cancellableRun(async (run) => {
          const f = resolve(top, path);
          const r = relative(top, f);
          if (f === git_dir) return true;
          if (r === "") return false;
          if (basename(f) === ".gitignore") return false;
          return await run(this.batchIgnored.ignore(r));
        }),
    );

    this.submoduleLazy.start(() => this.loadSubmodules());
  }

  async close(): Promise<void> {
    this.gwit.close();

    this.refsLazy.stop();
    await this.refsWatch?.close();
    this.refsWatch = null;

    this.statusLazy.stop();
    await this.statusWatch?.close();
    this.statusWatch = null;

    this.focusPatchLazy.stop();
    this.currentFocusCommit = undefined;

    this.submoduleLazy.stop();

    this.head = undefined;
    this.commits = [];
    this.amend = false;
  }

  async listTree(hash: string): Promise<string[]> {
    return this.gwit.listTree(hash).result;
  }

  async catFile(hash: string, path: string): Promise<string> {
    return this.gwit.catFile(hash, path).result;
  }

  async catFileBase64(hash: string, path: string): Promise<string> {
    return this.gwit.catFileBase64(hash, path).result;
  }

  async discardChanges(files: string[]): Promise<void> {
    await this.gwit.checkoutFiles(files).result;
  }

  async stageFiles(files: string[]): Promise<void> {
    await this.gwit.stageFiles(files).result;
  }

  async unstageFiles(files: string[]): Promise<void> {
    await this.gwit.unstageFiles(files).result;
  }

  async commit(amend: boolean, fixup: string | undefined, message: string): Promise<void> {
    try {
      this.statusLazy.freeze();
      if (fixup) await this.gwit.commitFixup(fixup).result;
      else await this.gwit.commit(amend, message).result;
    } finally {
      this.statusLazy.unfreeze();
    }
  }

  async stagePatch(patch: string, toAdd: string[]): Promise<void> {
    try {
      this.statusLazy.freeze();
      if (toAdd.length) await this.gwit.addIntent(toAdd).result;
      await this.gwit.stagePatch(patch).result;
    } finally {
      this.statusLazy.unfreeze();
    }
  }

  async unstagePatch(patch: string): Promise<void> {
    try {
      this.statusLazy.freeze();
      await this.gwit.unstagePatch(patch).result;
    } finally {
      this.statusLazy.unfreeze();
    }
  }

  async discardPatch(patch: string): Promise<void> {
    try {
      this.statusLazy.freeze();
      await this.gwit.unApplyPatch(patch).result;
    } finally {
      this.statusLazy.unfreeze();
    }
  }

  private loadCommits() {
    return cancellableRun(async (run) => {
      const [std, stash, head] = await Promise.all([
        run(this.gwit.getRefs()),
        run(this.gwit.getStashRefs()),
        run(this.gwit.head()),
      ]);

      const refs = std.concat(stash);

      if (head && head !== this.head) {
        this.head = head;
        this.statusLazy.poke();
      }

      const log = await run(this.gwit.log(refs.map((r) => r.hash)));
      const commits = createGraph(
        log,
        refs.map((r) => r.hash),
      );
      this.commits = commits;

      let focusCommit = this.currentFocusCommit;
      if (focusCommit && commits.findIndex((c) => c.hash === focusCommit) === -1)
        focusCommit = undefined;
      if (focusCommit == null && commits.length > 0) {
        const ref = refs.find((r) => r.refName === "HEAD");
        focusCommit = ref?.hash || commits[0].hash;
      }

      if (focusCommit && focusCommit !== this.currentFocusCommit) {
        this.currentFocusCommit = focusCommit;
        this.focusPatchLazy.stop();
        this.focusPatchLazy.start(() => this.loadFocusPatch(focusCommit!));
      }

      this.refsPort?.postMessage({
        refs,
        head,
        commits,
        focusCommit,
      } satisfies RefsMessage);
    });
  }

  private loadFocusPatch(hash: string) {
    return cancellableQueue(2, async (run) => {
      const commit = this.commits.find((c) => c.hash === hash);
      if (commit == null) return;

      const files = await run(() => this.gwit.commitStatus(hash));
      this.focusPatchPort?.postMessage({
        type: "files",
        hash,
        files,
      } satisfies FocusPatchMessage);

      await Promise.all(
        files.map(async (s) => {
          const result = await run(() => this.gwit.diffCommitFile(commit.parents[0], hash, s));
          if (result.patches.length !== 0)
            this.focusPatchPort?.postMessage({
              type: "diff",
              diff: result.patches[0],
            } satisfies FocusPatchMessage);
        }),
      );
    });
  }

  private loadStatus() {
    return cancellableQueue(2, async (run) => {
      const amending = this.amend;
      const [files, amend] = await Promise.all([
        run(() => this.gwit.stageStatus()),
        amending ? run(() => this.gwit.amendStatus()) : ([] as FileStatus[]),
      ]);

      const working: FileStatus[] = [];
      const index: FileStatus[] = [];

      for (const f of files) {
        if (f.workingStatus !== " ") {
          const status = f.workingStatus;
          const newFile = status === "D" ? void 0 : f.file;
          const oldFile = status === "D" ? f.file : f.oldFile || f.file;
          const fileName = newFile || oldFile;
          working.push({ status, fileName, newFile, oldFile, unmerged: f.unmerged });
        }
        if (!amending && f.indexStatus !== " " && f.indexStatus !== "?") {
          const status = f.indexStatus;
          const newFile = f.file;
          const oldFile = f.oldFile;
          const fileName = (newFile || oldFile) as string;
          index.push({ status, fileName, newFile, oldFile, unmerged: f.unmerged });
        }
      }

      if (amending) {
        amend.forEach((f) =>
          index.push({
            status: f.status,
            fileName: f.fileName,
            newFile: f.newFile,
            oldFile: f.oldFile,
            unmerged: f.unmerged,
          }),
        );
      }

      await Promise.all([
        ...working.map(async (r) => {
          const file = r.fileName;
          const status = r.status;
          const patch = await run(() =>
            status === "?"
              ? this.gwit.diffFileUntracked(file)
              : r.unmerged
                ? this.gwit.diffFileWorkingToHead(file)
                : this.gwit.diffFileWorkingToIndex(file),
          );
          if (status === "?" && patch.status === "A") patch.status = status;
          Object.assign(r, patch);
        }),
        ...index.map(async (r) => {
          if (r.unmerged) {
            r.hunks = [];
            return;
          }
          const file = r.fileName;
          const patch = await run(() =>
            amending
              ? this.gwit.diffFileIndexToAmend(file, r.oldFile)
              : this.gwit.diffFileIndexToHead(file, r.oldFile),
          );
          Object.assign(r, patch);
        }),
      ]);

      this.statusPort?.postMessage({ working, index } satisfies StatusMessage);
    });
  }

  private loadSubmodules() {
    return cancellableRun(async (run) => {
      const subs = await run(this.gwit.getSubmodules());
      this.submodulesPort?.postMessage({
        submodules: subs.map((s) => ({ path: s.path })),
      } satisfies SubmodulesMessage);
    });
  }
}
