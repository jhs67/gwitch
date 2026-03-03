import { darkTheme, lightTheme } from "@renderer/theme/theme";
import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import { ThemeProvider } from "react-jss";
import { App } from "./App";

export function ThemedApp() {
  const [theme, setTheme] = useState(lightTheme);

  useEffect(() => {
    const handler = (_event: Electron.IpcRendererEvent, theme: "dark" | "light") => {
      setTheme(theme === "dark" ? darkTheme : lightTheme);
    };
    ipcRenderer.on("theme", handler);
    return () => {
      ipcRenderer.removeListener("theme", handler);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
}
