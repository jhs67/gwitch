import "./index.css";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { App } from "./components/App";
import { rootReducer } from "./store";
import { createStore } from "redux";
import { Provider } from "react-redux";
import { setRecentRepos } from "./store/recent/actions";
import { ipcRenderer } from "electron";
import { RepoPath } from "./store/repo/types";
import { RepoLoader } from "./repo/loader";
import { CancellableQueue } from "./repo/cancellable";

const store = createStore(rootReducer);
const loader = new RepoLoader(store.dispatch);
const eventQueue = new CancellableQueue(1);

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root"),
);

ipcRenderer.on("recent", (event, repos: string[]) => {
  eventQueue.add(async () => {
    store.dispatch(setRecentRepos(repos));
    await loader.close();
  });
});

ipcRenderer.on("open", (event, path: RepoPath) => {
  eventQueue.add(async () => {
    await loader.open(path);
  });
});
