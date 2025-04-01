import { BrowserWindow, Menu, MenuItemConstructorOptions } from "electron";
import { gwitch } from "./index";
import { ThemeType } from "./gwitch";

const isMac = process.platform === "darwin";

export function setAppMenu(theme: ThemeType) {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: "appMenu" } as MenuItemConstructorOptions] : []),
    {
      label: "File",
      submenu: [
        {
          label: "Open Repository",
          accelerator: "CmdOrCtrl+O",
          click: (_menu, window) => window && gwitch.openOther(window as BrowserWindow),
        },
        {
          type: "separator",
        },
        {
          label: "Quit",
          accelerator: "CmdOrCtrl+Q",
          role: "quit",
        },
      ],
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        {
          label: "Theme",
          submenu: [
            {
              type: "radio",
              label: "System",
              click: () => gwitch.setTheme("system"),
              checked: theme === "system",
            },
            {
              type: "radio",
              label: "Light",
              click: () => gwitch.setTheme("light"),
              checked: theme === "light",
            },
            {
              type: "radio",
              label: "Dark",
              click: () => gwitch.setTheme("dark"),
              checked: theme === "dark",
            },
          ],
        },
        { type: "separator" },
        {
          label: "Debug",
          submenu: [{ role: "reload" }, { role: "forceReload" }, { role: "toggleDevTools" }],
        },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      role: "windowMenu",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: () => gwitch.createWindow(),
        },
        {
          type: "separator",
        },
        {
          role: "minimize",
        },
        ...(isMac ? [{ role: "zoom" } as MenuItemConstructorOptions] : []),
        {
          type: "separator",
        },
        {
          role: "close",
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
