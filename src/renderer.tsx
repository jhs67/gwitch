import "./index.css";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { App } from "./components/App";
import { rootReducer } from "./store";
import { createStore } from "redux";
import { Provider } from "react-redux";
import { setRecentRepos } from "./store/recent/actions";
import { ipcRenderer } from "electron";

const store = createStore(rootReducer);

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root"),
);

ipcRenderer.on("recent", (event, repos: string[]) => {
  store.dispatch(setRecentRepos(repos));
});
