import { initialLayoutState } from "@renderer/store/layout/types";
import { Store } from "redux";
import { RepoPath } from "@ipc/repo";
import { setLayout } from "@renderer/store/layout/actions";
import { RootState } from "@renderer/store";
import { LayoutState } from "@ipc/layout";

function layoutKey(repo: RepoPath): string {
  return "gwitch-layout:" + [repo.path, ...repo.submodules].join("/");
}

export class LayoutProxy {
  private unsubscribe: (() => void) | null = null;

  constructor(private store: Store<RootState>) {}

  setup(repo: RepoPath) {
    const key = layoutKey(repo);
    const saved = localStorage.getItem(key);
    const loadState: Partial<LayoutState> = saved ? JSON.parse(saved) : {};
    this.store.dispatch(setLayout({ ...initialLayoutState, ...loadState }));

    let currentLayout = this.store.getState().layout;
    this.unsubscribe = this.store.subscribe(() => {
      const layout = this.store.getState().layout;
      if (layout === currentLayout) return;
      currentLayout = layout;
      localStorage.setItem(key, JSON.stringify(layout));
    });
  }

  teardown() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.store.dispatch(setLayout(initialLayoutState));
  }
}
