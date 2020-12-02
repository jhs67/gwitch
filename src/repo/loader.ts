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
  setCommitMessage,
  setRepoAmend,
  setSubmodules,
} from "../store/repo/actions";
import { Gwit } from "./gwit";
import { cancellableRun, cancellableQueue } from "./cancellable";
import { Watcher } from "./watch";
import { LazyUpdater } from "./lazy";
import { createGraph } from "./graph";
import { RootState } from "../store";
import { resolve, basename, relative } from "path";
import { IgnoreBatch } from "./ignorebatch";
import { rangePatch } from "./rangepatch";

export class RepoLoader {
  private gwit = new Gwit();

  private refsLazy = new LazyUpdater(100, 1000);
  private refsWatch: Watcher;

  private loadedFocusPatch: string;
  private focusPatchLazy = new LazyUpdater();

  private loadedStatusAmend = false;
  private statusLazy = new LazyUpdater(100, 1000);
  private statusWatch: Watcher;

  private submoduleLazy = new LazyUpdater();

  private batchIgnored = new IgnoreBatch(this.gwit);

  private dispatch: Dispatch;

  constructor(private store: Store<RootState>) {
    this.dispatch = this.store.dispatch;
    this.loadedStatusAmend = this.store.getState().repo.amend;

    this.store.subscribe(() => {
      const {
        focusCommit,
        amend,
        commitMessage,
        head,
        refs,
        commits,
      } = this.store.getState().repo;
      if (this.loadedFocusPatch != focusCommit) {
        this.focusPatchLazy.stop();
        this.loadedFocusPatch = focusCommit;
        this.focusPatchLazy.start(() => this.loadFocusPatch(focusCommit));
      }
      if (this.loadedStatusAmend !== amend) {
        this.statusLazy.stop();
        this.loadedStatusAmend = amend;
        this.statusLazy.start(() => this.loadStatus(this.loadedStatusAmend));

        const r = refs.find((r) => r.refName === head);
        const h = r?.hash || head;
        const c = commits.find((c) => c.hash === h);
        const m = `${c.subject}${c.body && "\n\n"}${c.body}`;
        if (amend && commitMessage === "") this.dispatch(setCommitMessage(m));
        if (!amend && commitMessage === m) this.dispatch(setCommitMessage(""));
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
        if (
          i != 0 ||
          paths.includes("HEAD") ||
          paths.includes(this.store.getState().repo.head)
        )
          this.statusLazy.poke();
        if (i === 0 || i !== paths.length) this.refsLazy.poke();
      },
      (path) =>
        cancellableRun(async () => {
          const roots = ["logs", "refs", "packed-refs", "HEAD", "index"];
          return path !== "" && !roots.includes(path.split("/")[0]);
        }),
    );

    this.statusLazy.start(() => this.loadStatus(this.loadedStatusAmend));
    this.statusWatch = new Watcher(
      top,
      [""],
      (paths: string[]) => {
        // If a .gitignore file changes, check the ignores again
        if (paths.some((p) => basename(p) == ".gitignore"))
          this.statusWatch.invalidateIgnores();
        this.statusLazy.poke();
        if (paths.indexOf(".gitmodules") != -1) this.submoduleLazy.poke();
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
          return await run(this.batchIgnored.ignore(r));
        }),
    );

    this.submoduleLazy.start(() => this.loadSubmodules());
  }

  async close() {
    this.dispatch(resetRepoPath());

    this.refsLazy.stop();
    await this.refsWatch?.close();
    this.refsWatch = null;

    this.statusLazy.stop();
    await this.statusWatch?.close();
    this.statusWatch = null;

    this.focusPatchLazy.stop();
    this.loadedFocusPatch = null;

    this.submoduleLazy.stop();
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
    await this.gwit.stageFiles(files).result;
  }

  async unstageFiles(files: string[]) {
    await this.gwit.unstageFiles(files).result;
  }

  async commit(amend: boolean, message: string) {
    this.dispatch(setCommitMessage(""));
    this.dispatch(setRepoAmend(false));
    await this.gwit.commit(amend, message).result;
  }

  async stageRange(files: FileStatus[], start: number, end: number) {
    try {
      // freeze the status update during the operation
      this.statusLazy.freeze();

      // parse into a patch
      const [patch, toadd] = rangePatch(files, { start, end }, true);

      // intent to add unstaged files
      if (toadd.length) await this.gwit.addIntent(toadd).result;

      await this.gwit.stagePatch(patch).result;
    } finally {
      this.statusLazy.unfreeze();
    }
  }

  async unstageRange(files: FileStatus[], start: number, end: number) {
    try {
      // freeze the status update during the operation
      this.statusLazy.freeze();

      const [patch] = rangePatch(files, { start, end }, false);

      await this.gwit.unstagePatch(patch).result;
    } finally {
      this.statusLazy.unfreeze();
    }
  }

  async discardRange(files: FileStatus[], start: number, end: number) {
    try {
      // freeze the status update during the operation
      this.statusLazy.freeze();

      const [patch] = rangePatch(files, { start, end }, false);

      await this.gwit.unapplyPatch(patch).result;
    } finally {
      this.statusLazy.unfreeze();
    }
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

  private loadStatus(amending: boolean) {
    return cancellableQueue(2, async (run) => {
      const [files, amend] = await Promise.all([
        run(() => this.gwit.stageStatus()),
        amending ? run(() => this.gwit.amendStatus()) : [],
      ]);

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
        if (!amending && f.indexStatus !== " " && f.indexStatus !== "?") {
          const status = f.indexStatus;
          const newFile = f.file;
          const oldFile = f.oldFile;
          index.push({ status, newFile, oldFile, unmerged: f.unmerged });
        }
      }

      if (amending) {
        amend.forEach((f) =>
          index.push({
            status: f.status,
            newFile: f.newFile,
            oldFile: f.oldFile,
            unmerged: f.unmerged,
          }),
        );
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
          const patch = await run(() =>
            amending
              ? this.gwit.diffFileIndexToAmend(file, r.oldFile)
              : this.gwit.diffFileIndexToHead(file, r.oldFile),
          );
          Object.assign(r, patch);
        }),
      ]);

      this.dispatch(setStageStatus(working, index));
    });
  }

  private loadSubmodules() {
    return cancellableRun(async (run) => {
      const subs = await run(this.gwit.getSubmodules());
      this.dispatch(setSubmodules(subs.map((s) => ({ path: s.path }))));
    });
  }
}
