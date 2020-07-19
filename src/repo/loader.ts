import { Dispatch, Store } from "redux";
import { RepoPath } from "../store/repo/types";
import {
  setRepoPath,
  resetRepoPath,
  setRepoRefs,
  setCommits,
  setRepoHead,
  setFocusCommit,
  setFocusPatch,
  setFocusPatchDiff,
} from "../store/repo/actions";
import { Gwit } from "./gwit";
import { cancellableRun, cancellableQueue } from "./cancellable";
import { Watcher } from "./watch";
import { LazyUpdater } from "./lazy";
import { createGraph } from "./graph";
import { RootState } from "../store";

export class RepoLoader {
  private gwit = new Gwit();

  private refsLazy = new LazyUpdater();
  private refsWatch: Watcher;

  private loadedFocusPatch: string;
  private focusPatchLazy = new LazyUpdater();

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
    await this.gwit.open(path);
    const gitdir = await this.gwit.gitDir().result;

    this.refsLazy.start(() => this.loadCommits());
    this.refsWatch = new Watcher(gitdir, ["logs", "refs", "packed-refs", "HEAD"], () =>
      this.refsLazy.poke(),
    );
  }

  async close() {
    this.dispatch(resetRepoPath());

    this.refsLazy.stop();
    await this.refsWatch?.close();
    this.refsWatch = null;
  }

  private loadCommits() {
    return cancellableRun(async (run) => {
      // graph the refs and stashes
      const [std, stash, head] = await Promise.all([
        await run(this.gwit.getRefs()),
        await run(this.gwit.getStashRefs()),
        await run(this.gwit.head()),
      ]);
      const refs = std.concat(stash);
      this.dispatch(setRepoRefs(refs));
      this.dispatch(setRepoHead(head));

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
}
