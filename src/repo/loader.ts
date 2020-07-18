import { Dispatch, Store } from "redux";
import { RepoPath } from "../store/repo/types";
import {
  setRepoPath,
  resetRepoPath,
  setRepoRefs,
  setCommits,
  setRepoHead,
  setFocusCommit,
} from "../store/repo/actions";
import { Gwit } from "./gwit";
import { cancellableRun } from "./cancellable";
import { Watcher } from "./watch";
import { LazyUpdater } from "./lazy";
import { createGraph } from "./graph";
import { RootState } from "../store";

export class RepoLoader {
  private gwit = new Gwit();

  private refsLazy = new LazyUpdater();
  private refsWatch: Watcher;
  private dispatch: Dispatch;

  constructor(private store: Store<RootState>) {
    this.dispatch = this.store.dispatch;
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
        focusCommit = graphlog[0].hash;
        const ref = refs.find((r) => r.refName === "HEAD");
        if (ref) {
          focusCommit = ref.hash;
        }
      }

      // update the state
      this.dispatch(setCommits(graphlog));
      if (oldFocusCommit != focusCommit) this.dispatch(setFocusCommit(focusCommit));
    });
  }
}
