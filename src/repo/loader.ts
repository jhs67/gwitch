import { Dispatch } from "redux";
import { RepoPath } from "../store/repo/types";
import {
  setRepoPath,
  resetRepoPath,
  setRepoRefs,
  setCommits,
  setRepoHead,
} from "../store/repo/actions";
import { Gwit } from "./gwit";
import { cancellableRun } from "./cancellable";
import { Watcher } from "./watch";
import { LazyUpdater } from "./lazy";
import { createGraph } from "./graph";

export class RepoLoader {
  private gwit = new Gwit();

  private refsLazy = new LazyUpdater();
  private refsWatch: Watcher;

  constructor(private dispatch: Dispatch) {}

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

      // update the state
      this.dispatch(setCommits(graphlog));
    });
  }
}
