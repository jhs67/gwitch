import React from "react";
import { hot } from "react-hot-loader";
import { RecentRepos } from "../RecentRepos";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { RepoClient } from "../RepoClient";
import { createUseStyles } from "react-jss";
import { GwitchTheme } from "../../theme/theme";

const useStyles = createUseStyles((theme: GwitchTheme) => ({
  app: {
    fontFamily: theme.typography.bodyFace,
    fontSize: theme.typography.bodySize,
    color: theme.colors.primary,
    backgroundColor: theme.colors.background,
    position: "absolute",
    width: "100%",
    height: "100%",
  },
}));

export default function NotHotApp() {
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

export const App = hot(module)(NotHotApp);
