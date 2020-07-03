import { Dispatch } from "redux";
import { RepoPath } from "../store/repo/types";
import { setRepoPath, resetRepoPath, setRepoRefs } from "../store/repo/actions";
import { Gwit } from "./gwit";

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
    this.loadCommits();
  }

  async loadCommits() {
    const refs = await this.gwit.getRefs();
    this.dispatch(setRepoRefs(refs));
  }
}
