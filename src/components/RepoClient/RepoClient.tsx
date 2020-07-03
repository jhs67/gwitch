import React from "react";
import { RefsPanel } from "../RefsPanel";
import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  repoClient: {
    display: "flex",
    flexFlow: "row nowrap",
    boxSizing: "border-box",
    position: "absolute",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  repoBody: {},
});

export function RepoClient() {
  const classes = useStyles();
  return (
    <div className={classes.repoClient}>
      <RefsPanel />
      <div className={classes.repoBody}></div>
    </div>
  );
}
