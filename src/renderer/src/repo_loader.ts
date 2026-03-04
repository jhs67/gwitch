import "./assets/base.css";
import * as React from "react";
import { rootReducer } from "@renderer/store";
import { configureStore } from "@reduxjs/toolkit";
import { resetRecentRepos, setRecentRepos } from "@renderer/store/recent/actions";
import { RepoPath } from "@ipc/repo";
import { RepoLoader } from "./repo/loader";
import { LayoutProxy } from "./repo/layout";

export const store = configureStore({ reducer: rootReducer });
const loader = new RepoLoader(store);
const layout = new LayoutProxy(store);
export const LoaderContext = React.createContext<RepoLoader>(loader);

gwitch.onRecent((repos) => {
  loader.close();
  layout.teardown();
  store.dispatch(setRecentRepos(repos));
});

gwitch.onOpen((path: RepoPath) => {
  loader.close();
  layout.teardown();
  store.dispatch(resetRecentRepos());
  layout.setup(path);
  loader.open(path);
});

export function goBack() {
  const path = store.getState().repo.path;
  if (!path) return;
  gwitch.goBack(path);
}

export function openSubmodule(sub: string, newWindow: boolean) {
  const path = store.getState().repo.path!;
  const newPath = { ...path, submodules: [...path.submodules, sub] };
  gwitch.openSubmodule(newPath, newWindow);
}
