import { themeCopy } from "./themecopy";
import Color from "color";

const baseTheme = {
  typography: {
    bodySize: "12px",
    bodyFace: "freesans, Helvetica, arial, nimbussansl, liberationsans, clean, sans-serif",
    monospaceFace: 'Hack, "Lucida Console", Monaco, monospace',
  },
  colors: {
    primary: "#000",
    secondary: "#888",
    lessprimary: "#666",
    background: "#fff",
    backalt: "#f4f4f4",
    softBorder: "#dedede",
    softHilight: "#cdcdcd",
    hardBorder: "#bbb",
    recentTop: "#fcfcfc",
    recentBot: "#e0e0e0",
    buttonBack: "rgb(239,239,239)",
    frame: "#ececec",
    button: {
      background: "rgb(239,239,239)",
      border: "rgb(165,165,165)",
      hover: {
        background: "rgb(224,224,224)",
        border: "rgb(165,165,165)",
      },
      active: {
        background: "rgb(210,210,210)",
        border: "rgb(125,125,125)",
      },
      disabled: {
        primary: "#888",
        border: "rgb(165,165,165)",
      },
    },
    panel: {
      background: "#eef1f1",
      focus: {
        background: "#ccd7da",
      },
    },
    commitFocus: {
      primary: "#ffffff",
      background: "#096ed3",
    },
    link: {
      primary: "#1a54ab",
    },
    diff: {
      new: {
        background: "#ddffdd",
        primary: "#06772c",
      },
      old: {
        background: "#ffeeee",
        primary: "#bb0704",
      },
      selected: {
        background: "#b7d6fb",
      },
      buttons: {
        background: "#d4ebff",
        primary: "#34426b",
        border: "#7f8db7",
        hover: {
          border: "#34426b",
          primary: "#131d3a",
        },
      },
    },
    files: {
      stroke: "#080808",
      statusM: {
        fill: "#00df49",
        stroke: "#086a2d",
      },
      statusU: {
        fill: "#94e000",
        stroke: "#628622",
      },
      statusD: {
        fill: "#e01a00",
        stroke: "#863022",
      },
      statusDU: {
        fill: "#dd00e0",
        stroke: "#862285",
      },
      statusA: {
        fill: "#0054e0",
        stroke: "#224586",
      },
      statusAU: {
        fill: "#00e0d3",
        stroke: "#228683",
      },
      statusR: {
        fill: "#b800e0",
        stroke: "#772286",
      },
      statusC: {
        fill: "#b800e0",
        stroke: "#772286",
      },
    },
    scroll: {
      track: "#eeeeee",
      thumb: "#c0c0c0",
      hover: "#cccccc",
      active: "#999999",
    },
  },
  sizer: {
    vertical: "#ececec",
    verticalHover: "#ccc",
    horizontalHover: "#ccc",
  },
};

export type GwitchTheme = typeof baseTheme;

export const lightTheme = themeCopy(baseTheme, {});

function darkFill(color: string) {
  const f = Color(color);
  return { fill: f.hex(), stroke: f.lighten(0.8).saturate(-0.4).hex() };
}

export const darkTheme = themeCopy(baseTheme, {
  colors: {
    primary: "#ddd",
    secondary: "#aaa",
    lessprimary: "#aaa",
    background: "#1e1e1e",
    backalt: "#282828",
    softBorder: "#3e3e3e",
    hardBorder: "#555",
    softHilight: "#888",
    recentTop: "#555",
    recentBot: "#333",
    buttonBack: "rgb(59,59,59)",
    frame: "#383838",
    button: {
      background: "rgb(59,59,59)",
      border: "rgb(125,125,125)",
      hover: {
        background: "rgb(80,80,80)",
        border: "rgb(125,125,125)",
      },
      active: {
        background: "rgb(100,100,100)",
        border: "rgb(155,155,155)",
      },
      disabled: {
        primary: "#777",
        border: "rgb(95,95,95)",
      },
    },
    panel: {
      background: "#151622",
      focus: {
        background: "#393b5f",
      },
    },
    commitFocus: {
      primary: "#ffffff",
      background: "#144a80",
    },
    link: {
      primary: "#b3daf0",
    },
    diff: {
      new: {
        primary: "#daffda",
        background: "#1f3c29",
      },
      old: {
        primary: "#ffdada",
        background: "#422322",
      },
      selected: {
        background: "#304056",
      },
      buttons: {
        background: "#0a3458",
        primary: "#bbb",
        border: "#888",
        hover: {
          border: "#bbb",
          primary: "#ddd",
        },
      },
    },
    files: {
      stroke: "#ccc",
      statusM: darkFill("#1c9042"),
      statusU: darkFill("#5e8f00"),
      statusD: darkFill("#992719"),
      statusDU: darkFill("#8a008c"),
      statusA: darkFill("#164ca5"),
      statusAU: darkFill("#008c84"),
      statusR: darkFill("#73008c"),
      statusC: darkFill("#73008c"),
    },
    scroll: {
      track: "#222222",
      thumb: "#666666",
      hover: "#444444",
      active: "#777777",
    },
  },
  sizer: {
    vertical: "#383838",
    verticalHover: "#555",
    horizontalHover: "#555",
  },
});
