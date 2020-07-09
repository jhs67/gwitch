import { ipcRenderer } from "electron";
import { LayoutState, initialLayoutState } from "../store/layout/types";
import { cancellableRun } from "./cancellable";
import { LazyUpdater } from "./lazy";
import { Store } from "redux";
import { RepoPath } from "../store/repo/types";
import { setLayout } from "../store/layout/actions";
import { RootState } from "../store";
import { GET_LAYOUT_STATE, SET_LAYOUT_STATE } from "../main/ipc";

export class LayoutProxy {
  private saver = new LazyUpdater();
  private lastState = initialLayoutState;

  constructor(private store: Store<RootState>) {
    this.store.subscribe(() => {
      this.saver.poke();
    });
  }

  async setup(repo: RepoPath) {
    const path = [repo.path, ...repo.submodules].join("/");
    const loadState: Partial<LayoutState> =
      (await ipcRenderer.invoke(GET_LAYOUT_STATE, path)) || {};
    this.lastState = { ...initialLayoutState, ...loadState };
    this.store.dispatch(setLayout(this.lastState));

    this.saver.start(
      () =>
        cancellableRun(async (run) => {
          const state = this.store.getState().layout;
          if (Object.is(this.lastState, state)) return;
          this.lastState = state;
          await run(ipcRenderer.invoke(SET_LAYOUT_STATE, path, state));
        }),
      true,
    );
  }

  teardown() {
    this.saver.stop();
    this.store.dispatch(setLayout(initialLayoutState));
  }
}
