import { Dispatch } from "redux";
import { RepoPath } from "../store/repo/types";
import { setRepoPath, resetRepoPath, setRepoRefs } from "../store/repo/actions";
import { Gwit } from "./gwit";
import { cancellableQueue } from "./cancellable";

export class RepoLoader {
  private gwit = new Gwit();

  constructor(private dispatch: Dispatch) {}

  close() {
    this.gwit.close();
    this.dispatch(resetRepoPath());
  }

  async open(path: RepoPath) {
    this.dispatch(setRepoPath(path));
    await this.gwit.open(path);
    await this.loadCommits().result;
  }

  loadCommits() {
    return cancellableQueue(16, async (run) => {
      const [std, stash] = await Promise.all([
        await run(() => this.gwit.getRefs()),
        await run(() => this.gwit.getStashRefs()),
      ]);
      this.dispatch(setRepoRefs(std.concat(stash)));
    });
  }
}
