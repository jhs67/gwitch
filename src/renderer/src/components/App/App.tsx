import { RecentRepos } from "../RecentRepos";
import { useSelector } from "react-redux";
import { RootState } from "@renderer/store";
import { RepoClient } from "../RepoClient";
import { createUseStyles } from "react-jss";
import { GwitchTheme } from "@renderer/theme/theme";

function svgUrl(body: string) {
  // return an svg string as an svg url
  return (
    "data:image/svg+xml," +
    body
      .replace(/\s+/g, " ")
      .replace(/[{}|\\^~[\]`"<>#%]/g, (m) => `%${m[0].charCodeAt(0).toString(16).toLowerCase()}`)
  );
}

function arrow(angle: number, color: string) {
  // svg arrow for the scrollbar buttons
  return svgUrl(
    `<svg fill='${color}' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
    <g transform='rotate(${angle},12,12)'><path d='m19 15h-14l7-8z'/></g></svg>`,
  );
}

const useStyles = createUseStyles((theme: GwitchTheme) => ({
  app: {
    fontFamily: theme.typography.bodyFace,
    fontSize: theme.typography.bodySize,
    color: theme.colors.primary,
    backgroundColor: theme.colors.background,
    position: "absolute",
    width: "100%",
    height: "100%",

    // scroll bar
    "& ::-webkit-scrollbar": {
      width: "14px",
      height: "14px",
    },
    "& ::-webkit-scrollbar-button:start:decrement, ::-webkit-scrollbar-button:end:increment": {
      display: "block",
    },
    "& ::-webkit-scrollbar-button:start:increment, ::-webkit-scrollbar-button:end:decrement": {
      display: "none",
    },
    "& ::-webkit-scrollbar-button": {
      backgroundColor: theme.colors.scroll.track,
      backgroundPosition: "center",
      width: "14px",
      height: "14px",
    },
    "& ::-webkit-scrollbar-button:hover:active": {
      backgroundColor: theme.colors.scroll.active,
    },
    "& ::-webkit-scrollbar-button:hover": {
      backgroundColor: theme.colors.scroll.hover,
    },
    "& ::-webkit-scrollbar-button:start:decrement": {
      backgroundImage: `url("${arrow(0, theme.colors.primary)}")`,
    },
    "& ::-webkit-scrollbar-button:end:increment:horizontal": {
      backgroundImage: `url("${arrow(90, theme.colors.primary)}")`,
    },
    "& ::-webkit-scrollbar-button:end:increment": {
      backgroundImage: `url("${arrow(180, theme.colors.primary)}")`,
    },
    "& ::-webkit-scrollbar-button:start:decrement:horizontal": {
      backgroundImage: `url("${arrow(270, theme.colors.primary)}")`,
    },
    "& ::-webkit-scrollbar-track": {
      backgroundColor: theme.colors.scroll.track,
    },
    "& ::-webkit-scrollbar-thumb": {
      backgroundColor: theme.colors.scroll.thumb,
      border: `2px solid ${theme.colors.scroll.track}`,
    },
    "& ::-webkit-scrollbar-corner": {
      backgroundColor: theme.colors.background,
    },
  },
}));

export function App() {
  const classes = useStyles();
  const path = useSelector((state: RootState) => state.repo.path);
  const recent = useSelector((state: RootState) => state.recent.repos);
  return (
    <>
      {path || recent ? (
        <div className={classes.app}>{path ? <RepoClient /> : <RecentRepos />}</div>
      ) : null}
    </>
  );
}
