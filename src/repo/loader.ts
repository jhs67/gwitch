import { Dispatch } from "redux";
import { RepoPath } from "../store/repo/types";
import { setRepoPath, resetRepoPath, setRepoRefs } from "../store/repo/actions";
import { Gwit } from "./gwit";
import { cancellableRun } from "./cancellable";
import { Watcher } from "./watch";
import { LazyUpdater } from "./lazy";

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

  loadCommits() {
    return cancellableRun(async (run) => {
      const [std, stash] = await Promise.all([
        await run(this.gwit.getRefs()),
        await run(this.gwit.getStashRefs()),
      ]);
      this.dispatch(setRepoRefs(std.concat(stash)));
    });
  }
}
