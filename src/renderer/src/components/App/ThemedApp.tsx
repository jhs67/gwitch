import { darkTheme, lightTheme } from "@renderer/theme/theme";
import { useEffect, useState } from "react";
import { ThemeProvider } from "react-jss";
import { App } from "./App";

export function ThemedApp() {
  const [theme, setTheme] = useState(lightTheme);

  useEffect(() => {
    return gwitch.onTheme((theme) => {
      setTheme(theme === "dark" ? darkTheme : lightTheme);
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
}
