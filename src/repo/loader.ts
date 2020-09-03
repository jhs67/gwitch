import { Dispatch, Store } from "redux";
import { RepoPath, FileStatus } from "../store/repo/types";
import {
  setRepoPath,
  resetRepoPath,
  setRepoRefs,
  setCommits,
  setRepoHead,
  setFocusCommit,
  setFocusPatch,
  setFocusPatchDiff,
  setStageStatus,
} from "../store/repo/actions";
import { Gwit } from "./gwit";
import { cancellableRun, cancellableQueue } from "./cancellable";
import { Watcher } from "./watch";
import { LazyUpdater } from "./lazy";
import { createGraph } from "./graph";
import { RootState } from "../store";
import { resolve, basename, relative } from "path";

export class RepoLoader {
  private gwit = new Gwit();

  private refsLazy = new LazyUpdater();
  private refsWatch: Watcher;

  private loadedFocusPatch: string;
  private focusPatchLazy = new LazyUpdater();

  private statusLazy = new LazyUpdater();
  private statusWatch: Watcher;

  private dispatch: Dispatch;

  constructor(private store: Store<RootState>) {
    this.dispatch = this.store.dispatch;

    this.store.subscribe(() => {
      const { focusCommit } = this.store.getState().repo;
      if (this.loadedFocusPatch != focusCommit) {
        this.focusPatchLazy.stop();
        this.loadedFocusPatch = focusCommit;
        this.focusPatchLazy.start(() => this.loadFocusPatch(focusCommit));
      }
    });
  }

  async open(path: RepoPath) {
    this.dispatch(setRepoPath(path));
    const top = await this.gwit.open(path);
    const gitdir = await this.gwit.gitDir().result;

    this.refsLazy.start(() => this.loadCommits());
    this.refsWatch = new Watcher(
      gitdir,
      [""],
      (paths) => {
        const i = paths.filter((p) => p === "index").length;
        if (paths.indexOf("HEAD") !== -1 || i != 0) this.statusLazy.poke();
        if (i === 0 || i !== paths.length) this.refsLazy.poke();
      },
      (path) =>
        cancellableRun(async () => {
          const roots = ["logs", "refs", "packed-refs", "HEAD", "index"];
          return path !== "" && roots.indexOf(path.split("/")[0]) === -1;
        }),
    );

    this.statusLazy.start(() => this.loadStatus());
    this.statusWatch = new Watcher(
      top,
      [""],
      (paths: string[]) => {
        // If a .gitignore file changes, check the ignores again
        if (paths.indexOf(".gitignore") !== -1) this.statusWatch.invalidateIgnores();
        this.statusLazy.poke();
      },
      (path) =>
        cancellableRun(async (run) => {
          const f = resolve(top, path);
          const r = relative(top, f);

          // always ignore the git dir
          if (f === gitdir) return true;
          // never ignore the root file
          if (r === "") return false;
          // never ignore gitignore files
          if (basename(f) === ".gitignore") return false;

          // check with git
          return await run(this.gwit.isIgnored(r));
        }),
    );
  }

  async close() {
    this.dispatch(resetRepoPath());

    this.refsLazy.stop();
    await this.refsWatch?.close();
    this.refsWatch = null;
  }

  workingSelected() {
    const { workingSelected, workingStatus } = this.store.getState().repo;
    return workingStatus.filter(
      (s) => workingSelected.indexOf(s.newFile || s.oldFile) !== -1,
    );
  }

  indexSelected() {
    const { indexSelected, indexStatus } = this.store.getState().repo;
    return indexStatus.filter((s) => indexSelected.indexOf(s.newFile || s.oldFile) !== -1);
  }

  async discardChanges(files: string[]) {
    await this.gwit.checkoutFiles(files).result;
  }

  async stageFiles(files: string[]) {
    console.log("stageFiles", files);
    await this.gwit.stageFiles(files).result;
  }

  async unstageFiles(files: string[]) {
    console.log("stageFiles", files);
    await this.gwit.unstageFiles(files).result;
  }

  private loadCommits() {
    return cancellableRun(async (run) => {
      // graph the refs and stashes
      const [std, stash, head] = await Promise.all([
        await run(this.gwit.getRefs()),
        await run(this.gwit.getStashRefs()),
        await run(this.gwit.head()),
      ]);
      const state = this.store.getState();
      const refs = std.concat(stash);
      this.dispatch(setRepoRefs(refs));
      if (head !== state.repo.head) {
        this.dispatch(setRepoHead(head));
        this.statusLazy.poke();
      }

      // get the log from these heads
      const log = await run(this.gwit.log(refs.map((r) => r.hash)));

      // sort and connect the logs with a graph
      const graphlog = createGraph(
        log,
        refs.map((r) => r.hash),
      );

      // make sure the focus commit points to a valid commit
      const oldFocusCommit = this.store.getState().repo.focusCommit;
      let focusCommit = oldFocusCommit;
      if (focusCommit && graphlog.findIndex((c) => c.hash === focusCommit) === -1)
        focusCommit = undefined;

      if (focusCommit == null && graphlog.length > 0) {
        const ref = refs.find((r) => r.refName === "HEAD");
        focusCommit = ref?.hash || graphlog[0].hash;
      }

      // update the state
      this.dispatch(setCommits(graphlog));
      if (oldFocusCommit != focusCommit) this.dispatch(setFocusCommit(focusCommit));
    });
  }

  private loadFocusPatch(hash: string) {
    return cancellableQueue(2, async (run) => {
      const commit = this.store.getState().repo.commits.find((c) => c.hash == hash);
      if (hash == null) return;
      const status = await run(() => this.gwit.commitStatus(hash));
      this.dispatch(setFocusPatch(status));

      await Promise.all(
        status.map(async (s) => {
          const patches = await run(() =>
            this.gwit.diffCommitFile(commit.parents[0], hash, s),
          );
          this.dispatch(setFocusPatchDiff(patches.patches[0]));
        }),
      );
    });
  }

  private loadStatus() {
    return cancellableQueue(2, async (run) => {
      const files = await run(() => this.gwit.stageStatus());

      // sort the files into working and index changes
      const working: FileStatus[] = [];
      const index: FileStatus[] = [];
      for (const f of files) {
        if (f.workingStatus !== " ") {
          const status = f.workingStatus;
          const newFile = status === "D" ? null : f.file;
          const oldFile = status === "D" ? f.file : f.oldFile || f.file;
          working.push({ status, newFile, oldFile, unmerged: f.unmerged });
        }
        if (f.indexStatus !== " " && f.indexStatus !== "?") {
          const status = f.indexStatus;
          const newFile = f.file;
          const oldFile = f.oldFile;
          index.push({ status, newFile, oldFile, unmerged: f.unmerged });
        }
      }

      // load the diffs
      await Promise.all([
        ...working.map(async (r) => {
          const file = r.newFile || r.oldFile;
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

          const file = r.newFile || r.oldFile;
          const patch = await run(() => this.gwit.diffFileIndexToHead(file, r.oldFile));
          Object.assign(r, patch);
        }),
      ]);

      this.dispatch(setStageStatus(working, index));
    });
  }
}
