import React from "react";
import { ipcRenderer } from "electron";
import { basename } from "path";
import DeleteIcon from "../../assets/delete.svg";
import { createUseStyles } from "react-jss";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { OPEN_PATH, OPEN_OTHER } from "../../main/ipc";

const useStyles = createUseStyles({
  recentRepos: {
    marginLeft: "auto",
    marginRight: "auto",
    padding: "10vh 0 10vh 0",
    maxWidth: "40em",
    height: "100vh",
  },
  noRecent: {
    fontSize: "2em",
    textAlign: "center",
    marginTop: "25vh",
  },
  repoList: {
    margin: "5vh 0 10vh 0",
    padding: "3px 6px 3px 6px",
    borderRadius: "0.6em",
    borderWidth: "2px",
    borderColor: "#dedede",
    borderStyle: "solid",
    overflow: "auto",
    height: "60vh",
  },
  repoItem: {
    borderRadius: "0.4em",
    borderWidth: "1px",
    borderColor: "#dedede",
    borderStyle: "solid",
    background: "linear-gradient(#fcfcfc, #e0e0e0)",
    marginBottom: "4px",
    marginTop: "4px",
    textAlign: "center",
    padding: "3px",
    position: "relative",
    "&:hover": {
      padding: "2px",
      borderWidth: "2px",
      borderColor: "#cdcdcd",
    },
    "&:hover $repoRm": {
      display: "inline-block",
    },
  },
  repoName: {
    fontWeight: "bold",
    fontSize: "1.2em",
    paddingBottom: "5px",
  },
  repoPath: {
    fontSize: "0.9em",
    color: "#888888",
  },
  repoRm: {
    position: "absolute",
    right: "10px",
    top: "12px",
    width: "14px",
    height: "14px",
    display: "none",
    "&:hover": {
      right: "9px",
      top: "11px",
      width: "16px",
      height: "16px",
    },
  },
  repoButton: {
    height: "10vh",
    textAlign: "center",
  },
});

export function RecentRepos() {
  const classes = useStyles();
  const repos = useSelector((state: RootState) => state.recent.repos);

  function openRepo() {
    ipcRenderer.send(OPEN_OTHER);
  }

  function itemClick(path: string) {
    ipcRenderer.send(OPEN_PATH, path);
  }

  return (
    <div className={classes.recentRepos}>
      <div className={classes.repoList}>
        {repos.length == 0 ? (
          <div className={classes.noRecent}>Welcome to Gwitch</div>
        ) : (
          repos.map((l) => (
            <div key={l} className={classes.repoItem} onClick={() => itemClick(l)}>
              <DeleteIcon className={classes.repoRm} />
              <div className={classes.repoName}>{basename(l, ".git")}</div>
              <div className={classes.repoPath}>{l}</div>
            </div>
          ))
        )}
      </div>
      <div className={classes.repoButton}>
        <button type="button" onClick={openRepo}>
          Open Repository
        </button>
      </div>
    </div>
  );
}
