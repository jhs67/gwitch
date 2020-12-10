import "./index.css";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { ThemeProvider } from "react-jss";
import { App } from "./components/App";
import { rootReducer } from "./store";
import { createStore } from "redux";
import { Provider } from "react-redux";
import { resetRecentRepos, setRecentRepos } from "./store/recent/actions";
import { ipcRenderer } from "electron";
import { RepoPath } from "./store/repo/types";
import { RepoLoader } from "./repo/loader";
import { LayoutProxy } from "./repo/layout";
import { CancellableQueue } from "./repo/cancellable";
import { darkTheme, GwitchTheme, lightTheme } from "./theme/theme";
import { GO_BACK, OPEN_SUBMODULE } from "./main/ipc";

const store = createStore(rootReducer);
const loader = new RepoLoader(store);
const layout = new LayoutProxy(store);
const eventQueue = new CancellableQueue(1);

export const LoaderContext = React.createContext<RepoLoader>(loader);

let setTheme: (a: GwitchTheme) => void;

function ThemedApp() {
  const [theme, _setTheme] = React.useState(lightTheme);
  setTheme = _setTheme;
  return (
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
}

ReactDOM.render(
  <Provider store={store}>
    <ThemedApp />
  </Provider>,
  document.getElementById("root"),
);

ipcRenderer.on("recent", (event, repos: string[]) => {
  eventQueue.add(async () => {
    store.dispatch(setRecentRepos(repos));
    await Promise.all([loader.close(), layout.teardown()]);
  });
});

ipcRenderer.on("open", (event, path: RepoPath) => {
  eventQueue.add(async () => {
    store.dispatch(resetRecentRepos());
    await layout.setup(path);
    await loader.open(path);
  });
});

ipcRenderer.on("theme", (event, theme: "dark" | "light") => {
  setTheme(theme === "dark" ? darkTheme : lightTheme);
});

export function goBack() {
  const path = store.getState().repo.path;
  ipcRenderer.send(GO_BACK, path);
  eventQueue.add(async () => {
    await Promise.all([loader.close(), layout.teardown()]);
  });
}

export function openSubmodule(sub: string, newWindow: boolean) {
  const path = store.getState().repo.path;
  const newPath = { ...path, submodules: [...path.submodules, sub] };
  ipcRenderer.send(OPEN_SUBMODULE, newPath, newWindow);
  if (!newWindow) {
    eventQueue.add(async () => {
      await Promise.all([loader.close(), layout.teardown()]);
    });
  }
}
