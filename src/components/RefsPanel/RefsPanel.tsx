import React, { useState } from "react";
import { createUseStyles } from "react-jss";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { basename } from "path";
import StageIcon from "../../assets/stage.svg";
import BranchIcon from "../../assets/branch.svg";
import OriginIcon from "../../assets/cloud.svg";
import TagIcon from "../../assets/tag.svg";

const useStyles = createUseStyles({
  refsPanel: {
    flex: "0 0 auto",
    padding: "5px",
    maxWidth: "20vw",
    minWidth: "15rem",
    backgroundColor: "#eef1f1",
    borderRight: "1px solid #d5d5d5",
    display: "flex",
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
  stage: {},
  refIcon: {
    height: "1em",
    marginRight: "5px",
    marginLeft: "5px",
  },
  branches: {
    marginBottom: "0.5rem",
  },
  branchLine: {
    padding: "2px",
    display: "flex",
    flexFlow: "row nowrap",
  },
  localBranch: {},
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
  },
  arrow: {
    height: "1em",
    verticalAlign: "middle",
    marginLeft: "2px",
  },
  remoteName: {},
  remoteLine: {
    padding: "2px",
    display: "flex",
    flexFlow: "row nowrap",
  },
  remoteBranch: {},
  remoteRefIcon: {
    height: "1em",
    marginRight: "5px",
    marginLeft: "12px",
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
  },
});

export function RefsPanel() {
  const classes = useStyles();
  const refs = useSelector((state: RootState) => state.repo.refs);
  const path = useSelector((state: RootState) => state.repo.path);
  const [originClosed, setOriginClosed] = useState<{ [key: string]: boolean }>({});
  const [tagsClosed, setTagsClosed] = useState<boolean>(true);

  const origins = new Map<string, string[]>();
  refs
    .filter((r) => r.type === "remotes")
    .forEach((r) => {
      const s = r.name.split("/");
      const o = s.shift();
      const n = s.join("/");
      if (n !== "HEAD") origins.set(o, (origins.get(o) || []).concat(n));
    });

  return (
    <div className={classes.refsPanel}>
      <div className={classes.stageSection}>
        <div className={classes.title}>{basename(path.path, ".git")}</div>
        <div className={classes.stageLine}>
          <StageIcon className={classes.refIcon} />
          <div className={classes.stage}>Stage</div>
        </div>
      </div>
      <div className={classes.branches}>
        <div className={classes.title}>Branches</div>
        {refs
          .filter((r) => r.type === "heads")
          .map((r) => (
            <div className={classes.branchLine} key={r.refName}>
              <BranchIcon className={classes.refIcon} />
              <div className={classes.localBranch}>{r.name}</div>
            </div>
          ))}
      </div>
      <div className={classes.remotes}>
        <div className={classes.title}>Remotes</div>
        {[...origins.entries()].map(([origin, names]) => (
          <div className={classes.remoteSection} key={origin}>
            <div
              className={classes.remoteHeader}
              onClick={(ev) => {
                setOriginClosed({ ...originClosed, [origin]: !originClosed[origin] });
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
              : names.map((name) => (
                  <div className={classes.remoteLine} key={name}>
                    <BranchIcon className={classes.remoteRefIcon} />
                    <div className={classes.remoteBranch}>{name}</div>
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
              setTagsClosed(!tagsClosed);
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
  );
}
