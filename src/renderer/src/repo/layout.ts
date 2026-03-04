import { initialLayoutState } from "@renderer/store/layout/types";
import { cancellableRun } from "@ipc/cancellable";
import { LazyUpdater } from "@ipc/lazy";
import { Store } from "redux";
import { RepoPath } from "@ipc/repo";
import { setLayout } from "@renderer/store/layout/actions";
import { RootState } from "@renderer/store";
import { LayoutState } from "@ipc/layout";

export class LayoutProxy {
  private saver = new LazyUpdater();
  private lastState = initialLayoutState;

  constructor(private store: Store<RootState>) {
    let layoutState: LayoutState;
    this.store.subscribe(() => {
      if (layoutState === this.store.getState().layout) return;
      layoutState = this.store.getState().layout;
      this.saver.poke();
    });
  }

  async setup(repo: RepoPath) {
    const path = [repo.path, ...repo.submodules].join("/");
    const loadState: Partial<LayoutState> = (await gwitch.getLayoutState(path)) || {};
    this.lastState = { ...initialLayoutState, ...loadState };
    this.store.dispatch(setLayout(this.lastState));

    this.saver.start(
      () =>
        cancellableRun(async (run) => {
          const state = this.store.getState().layout;
          if (Object.is(this.lastState, state)) return;
          this.lastState = state;
          await run(gwitch.setLayoutState(path, state));
        }),
      true,
    );
  }

  teardown() {
    this.saver.stop();
    this.store.dispatch(setLayout(initialLayoutState));
  }
}
