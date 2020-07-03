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

const store = createStore(rootReducer);
const loader = new RepoLoader(store.dispatch);

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root"),
);

ipcRenderer.on("recent", (event, repos: string[]) => {
  loader.close();
  store.dispatch(setRecentRepos(repos));
});

ipcRenderer.on("open", (event, path: RepoPath) => {
  loader.open(path);
});
