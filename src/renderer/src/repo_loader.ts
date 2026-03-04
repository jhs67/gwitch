import "./assets/base.css";
import * as React from "react";
import { rootReducer } from "@renderer/store";
import { createStore } from "redux";
import { resetRecentRepos, setRecentRepos } from "@renderer/store/recent/actions";
import { RepoPath } from "@ipc/repo";
import { RepoLoader } from "./repo/loader";
import { LayoutProxy } from "./repo/layout";
import { CancellableQueue } from "./repo/cancellable";

export const store = createStore(rootReducer);
const loader = new RepoLoader(store);
const layout = new LayoutProxy(store);
const eventQueue = new CancellableQueue(1);
export const LoaderContext = React.createContext<RepoLoader>(loader);

gwitch.onRecent((repos) => {
  eventQueue.add(async () => {
    store.dispatch(setRecentRepos(repos));
    await Promise.all([loader.close(), layout.teardown()]);
  });
});

gwitch.onOpen((path: RepoPath) => {
  eventQueue.add(async () => {
    store.dispatch(resetRecentRepos());
    await layout.setup(path);
    await loader.open(path);
  });
});

export function goBack() {
  const path = store.getState().repo.path;
  if (!path) return;
  gwitch.goBack(path);
  eventQueue.add(async () => {
    await Promise.all([loader.close(), layout.teardown()]);
  });
}

export function openSubmodule(sub: string, newWindow: boolean) {
  const path = store.getState().repo.path!;
  const newPath = { ...path, submodules: [...path.submodules, sub] };
  gwitch.openSubmodule(newPath, newWindow);
  if (!newWindow) {
    eventQueue.add(async () => {
      await Promise.all([loader.close(), layout.teardown()]);
    });
  }
}
