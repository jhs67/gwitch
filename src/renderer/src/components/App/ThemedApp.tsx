import { darkTheme, GwitchTheme, lightTheme } from "@renderer/theme/theme";
import { ipcRenderer } from "electron";
import { useState } from "react";
import { ThemeProvider } from "react-jss";
import { App } from "./App";

let setTheme: (a: GwitchTheme) => void;

ipcRenderer.on("theme", (_event, theme: "dark" | "light") => {
  setTheme(theme === "dark" ? darkTheme : lightTheme);
});

export function ThemedApp() {
  const [theme, _setTheme] = useState(lightTheme);
  setTheme = _setTheme;

  return (
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
}
