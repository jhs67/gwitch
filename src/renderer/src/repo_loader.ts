import "./assets/base.css";
import * as React from "react";
import { rootReducer } from "@renderer/store";
import { createStore } from "redux";
import { resetRecentRepos, setRecentRepos } from "@renderer/store/recent/actions";
import { ipcRenderer } from "electron";
import { RepoPath } from "@ipc/repo";
import { RepoLoader } from "./repo/loader";
import { LayoutProxy } from "./repo/layout";
import { CancellableQueue } from "./repo/cancellable";
import { GO_BACK, OPEN_SUBMODULE } from "@ipc/ipc";

export const store = createStore(rootReducer);
const loader = new RepoLoader(store);
const layout = new LayoutProxy(store);
const eventQueue = new CancellableQueue(1);
export const LoaderContext = React.createContext<RepoLoader>(loader);

ipcRenderer.on("recent", (_event, repos: string[]) => {
  eventQueue.add(async () => {
    store.dispatch(setRecentRepos(repos));
    await Promise.all([loader.close(), layout.teardown()]);
  });
});

ipcRenderer.on("open", (_event, path: RepoPath) => {
  eventQueue.add(async () => {
    store.dispatch(resetRecentRepos());
    await layout.setup(path);
    await loader.open(path);
  });
});

export function goBack() {
  const path = store.getState().repo.path;
  ipcRenderer.send(GO_BACK, path);
  eventQueue.add(async () => {
    await Promise.all([loader.close(), layout.teardown()]);
  });
}

export function openSubmodule(sub: string, newWindow: boolean) {
  const path = store.getState().repo.path!;
  const newPath = { ...path, submodules: [...path.submodules, sub] };
  ipcRenderer.send(OPEN_SUBMODULE, newPath, newWindow);
  if (!newWindow) {
    eventQueue.add(async () => {
      await Promise.all([loader.close(), layout.teardown()]);
    });
  }
}
