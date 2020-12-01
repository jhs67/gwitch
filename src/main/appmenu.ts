import { Menu, MenuItemConstructorOptions } from "electron";
import { gwitch } from "../index";

const isMac = process.platform === "darwin";

const template: MenuItemConstructorOptions[] = [
  ...(isMac ? [{ role: "appMenu" } as MenuItemConstructorOptions] : []),
  {
    label: "File",
    submenu: [
      {
        label: "Open Repository",
        accelerator: "CmdOrCtrl+O",
        click: (menu, window) => gwitch.openOther(window),
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
  { role: "viewMenu" },
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

export function setAppMenu() {
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
