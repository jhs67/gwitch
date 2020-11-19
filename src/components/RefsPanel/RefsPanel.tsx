import React from "react";
import { createUseStyles } from "react-jss";
import { useSelector, useDispatch } from "react-redux";
import classNames from "classnames";
import { basename } from "path";
import { RootState } from "../../store";
import StageIcon from "../../assets/stage.svg";
import BranchIcon from "../../assets/branch.svg";
import OriginIcon from "../../assets/cloud.svg";
import TagIcon from "../../assets/tag.svg";
import ActiveBadge from "../../assets/active.svg";
import { setOriginClosed, setTagsClosed, setClientMode } from "../../store/layout/actions";
import { RepoRef } from "../../store/repo/types";
import { setFocusCommit } from "../../store/repo/actions";
import { goBack } from "../../renderer";

const useStyles = createUseStyles({
  refsPanel: {
    flex: "0 0 auto",
    padding: "5px",
    maxWidth: "20vw",
    minWidth: "12rem",
    backgroundColor: "#eef1f1",
    borderRight: "1px solid #d5d5d5",
    display: "flex",
    flexFlow: "column nowrap",
    overflow: "hidden",
  },
  refsSect: {
    flex: "1 1 auto",
    flexFlow: "column nowrap",
  },
  stageSection: {
    marginBottom: "0.5rem",
  },
  title: {
    fontWeight: "bold",
    marginBottom: "0.2rem",
  },
  stageLine: {
    padding: "2px",
    display: "flex",
    flexFlow: "row nowrap",
  },
  stage: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  refIcon: {
    height: "1em",
    marginRight: "5px",
    marginLeft: "5px",
    flex: "0 0 auto",
  },
  branches: {
    marginBottom: "0.5rem",
  },
  branchLine: {
    padding: "2px",
    display: "flex",
    flexFlow: "row nowrap",
  },
  localBranch: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: "1 1 auto",
  },
  activeBadge: {
    height: "1em",
    flex: "0 0 auto",
  },
  remotes: {
    marginBottom: "0.5rem",
  },
  remoteSection: {},
  remoteHeader: {
    height: "1em",
    verticalAlign: "middle",
    display: "flex",
    flexFlow: "row nowrap",
  },
  originIcon: {
    height: "1em",
    marginRight: "5px",
    flex: "0 0 auto",
  },
  arrow: {
    height: "1em",
    verticalAlign: "middle",
    marginLeft: "2px",
    flex: "0 0 auto",
  },
  remoteName: {},
  remoteLine: {
    padding: "2px",
    display: "flex",
    flexFlow: "row nowrap",
  },
  remoteBranch: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  remoteRefIcon: {
    height: "1em",
    marginRight: "5px",
    marginLeft: "12px",
    flex: "0 0 auto",
  },
  tags: {
    marginBottom: "0.5rem",
  },
  tagsHeader: {
    height: "1em",
    verticalAlign: "middle",
    display: "flex",
    flexFlow: "row nowrap",
  },
  tagLine: {
    padding: "2px",
    display: "flex",
    flexFlow: "row nowrap",
  },
  tagName: {},
  tagIcon: {
    height: "1em",
    marginRight: "5px",
    flex: "0 0 auto",
  },
  focusRef: {
    backgroundColor: "#ccd7da",
  },
  navButtons: {
    flex: "0 0 auto",
    "& button": {
      padding: "1px",
    },
    "& svg": {
      verticalAlign: "middle",
      height: "1.2em",
    },
  },
});

export function RefsPanel() {
  const classes = useStyles();
  const refs = useSelector((state: RootState) => state.repo.refs);
  const path = useSelector((state: RootState) => state.repo.path);
  const head = useSelector((state: RootState) => state.repo.head);
  const focusCommit = useSelector((state: RootState) => state.repo.focusCommit);
  const originClosed = useSelector((state: RootState) => state.layout.originClosed);
  const tagsClosed = useSelector((state: RootState) => state.layout.tagsClosed);
  const mode = useSelector((state: RootState) => state.layout.clientMode);
  const dispatch = useDispatch();

  const origins = new Map<string, RepoRef[]>();
  refs
    .filter((r) => r.type === "remotes")
    .forEach((r) => {
      const s = r.name.split("/");
      const o = s.shift();
      const n = s.join("/");
      if (n !== "HEAD") origins.set(o, (origins.get(o) || []).concat(r));
    });

  const clickBranch = (hash: string) => {
    dispatch(setFocusCommit(hash));
    if (mode !== "history") dispatch(setClientMode("history"));
  };

  return (
    <div className={classes.refsPanel}>
      <div className={classes.refsSect}>
        <div className={classes.stageSection}>
          <div className={classes.title}>{basename(path.path, ".git")}</div>
          <div
            className={classNames(classes.stageLine, {
              [classes.focusRef]: mode === "stage",
            })}
            onClick={() => {
              dispatch(setClientMode(mode === "history" ? "stage" : "history"));
            }}
          >
            <StageIcon className={classes.refIcon} />
            <div className={classes.stage}>Stage</div>
          </div>
        </div>
        <div className={classes.branches}>
          <div className={classes.title}>Branches</div>
          {refs
            .filter((r) => r.type === "heads")
            .map((r) => (
              <div
                className={classNames(classes.branchLine, {
                  [classes.focusRef]: mode === "history" && r.hash === focusCommit,
                })}
                key={r.refName}
                onClick={() => clickBranch(r.hash)}
              >
                <BranchIcon className={classes.refIcon} />
                <div className={classes.localBranch}>{r.name}</div>
                {r.refName === head ? (
                  <ActiveBadge className={classes.activeBadge} />
                ) : null}
              </div>
            ))}
        </div>
        <div className={classes.remotes}>
          <div className={classes.title}>Remotes</div>
          {[...origins.entries()].map(([origin, refs]) => (
            <div className={classes.remoteSection} key={origin}>
              <div
                className={classes.remoteHeader}
                onClick={(ev) => {
                  dispatch(setOriginClosed(origin, !originClosed[origin]));
                  ev.preventDefault();
                }}
              >
                {originClosed[origin] ? (
                  <svg className={classes.arrow} viewBox="0 0 24 24">
                    <path d="M 5 4 l 14 8 -14 8 z" />
                  </svg>
                ) : (
                  <svg className={classes.arrow} viewBox="0 0 24 24">
                    <path d="M 4 5 l 16 0 -8 14 z" />
                  </svg>
                )}
                <OriginIcon className={classes.originIcon} />
                <div className={classes.remoteName}>{origin}</div>
              </div>
              {originClosed[origin]
                ? null
                : refs.map((ref) => (
                    <div
                      className={classNames(classes.remoteLine, {
                        [classes.focusRef]: mode === "history" && ref.hash === focusCommit,
                      })}
                      key={ref.refName}
                      onClick={() => clickBranch(ref.hash)}
                    >
                      <BranchIcon className={classes.remoteRefIcon} />
                      <div className={classes.remoteBranch}>
                        {ref.name.replace(/^[^/]+\//, "")}
                      </div>
                    </div>
                  ))}
            </div>
          ))}
        </div>
        {refs.some((r) => r.type === "tags") ? (
          <div className={classes.tags}>
            <div
              className={classes.tagsHeader}
              onClick={(ev) => {
                dispatch(setTagsClosed(!tagsClosed));
                ev.preventDefault();
              }}
            >
              {tagsClosed ? (
                <svg className={classes.arrow} viewBox="0 0 24 24">
                  <path d="M 5 4 l 14 8 -14 8 z" />
                </svg>
              ) : (
                <svg className={classes.arrow} viewBox="0 0 24 24">
                  <path d="M 4 5 l 16 0 -8 14 z" />
                </svg>
              )}
              <div className={classes.title}>Tags</div>
            </div>
            {tagsClosed
              ? null
              : refs
                  .filter((r) => r.type === "tags")
                  .map((r) => (
                    <div className={classes.tagLine} key={r.refName}>
                      <TagIcon className={classes.remoteRefIcon} />
                      <div className={classes.tagName}>{r.name}</div>
                    </div>
                  ))}
          </div>
        ) : undefined}
      </div>
      <div className={classes.navButtons}>
        <button className="showRecent" onClick={() => goBack()}>
          <svg viewBox="0 0 24 24">
            <path d="M 2 12 l 10 10 l 0 -6.5 l 10 0 l 0 -7 l -10 0 l 0 -6.5 z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
