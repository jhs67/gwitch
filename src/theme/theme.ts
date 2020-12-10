export const theme = {
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
  },
  sizer: {
    vertical: "#ececec",
    verticalHover: "#ccc",
    horizontalHover: "#ccc",
  },
};

export type GwitchTheme = typeof theme;
