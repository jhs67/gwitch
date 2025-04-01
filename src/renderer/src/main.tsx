import "./assets/base.css";
import ReactDOM from "react-dom/client";
import { ThemedApp } from "./components/App";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { store } from "./repo_loader";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Provider store={store}>
      <ThemedApp />
    </Provider>
  </StrictMode>,
);
