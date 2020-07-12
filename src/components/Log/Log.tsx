import React, { RefObject, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { createUseStyles } from "react-jss";
import classNames from "classnames";
import moment from "moment";
import { setFocusCommit } from "../../store/repo/actions";
import { RootState } from "../../store";

const useStyles = createUseStyles({
  logContainer: {
    position: "absolute",
    height: "100%",
    width: "100%",
    overflow: "auto",
  },
  logTable: {
    minWidth: "50em",
    tableLayout: "fixed",
    borderSpacing: "0",
    width: "100%",
    "& th": {
      textAlign: "left",
      fontWeight: "normal",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      padding: "2px",
      paddingLeft: "4px",
      position: "sticky",
      top: 0,
      zIndex: 10,
      background: "#fff",
      borderBottom: "1px solid #d8d8d8d8",
    },
    "& td": {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      paddingTop: 0,
      paddingBottom: 0,
      verticalAlign: "middle",
    },
    "& tr:nth-child(2n)": {
      backgroundColor: "#f4f4f4",
    },
    "& .graph-node": {
      fill: "#ffffff",
      strokeWidth: "1px",
      stroke: "#000000",
    },
    "& .graph-path": {
      fill: "none",
      strokeWidth: "2px",
      stroke: "#ee2e2b",
    },
  },
  shortHashHeader: {
    width: "6em",
    paddingLeft: "4px !important",
  },
  authorHeader: {
    width: "9em",
    borderLeft: "1px solid #d8d8d8d8",
  },
  dateHeader: {
    width: "14em",
    borderLeft: "1px solid #d8d8d8d8",
  },
  summaryHeader: {
    borderLeft: "1px solid #d8d8d8d8",
  },
  shortHash: {
    paddingLeft: "4px",
    fontFamily: 'Hack, "Lucida Console", Monaco, monospace',
  },
  subjectLine: {
    display: "flex",
    alignItems: "center",
    "& svg": {
      height: 20,
      flex: "0 0 auto",
    },
  },
  commitLine: {
    paddingLeft: "4px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  commitRef: {
    paddingLeft: "4px",
    paddingRight: "4px",
    borderStyle: "solid",
    borderWidth: "0px",
    borderRadius: "5px",
    backgroundColor: "#fefb57",
    color: "black",
    boxShadow: "0.5px 0.5px 1px 1px #555",
    marginRight: "4px",
    "&.heads": {
      backgroundColor: "#fdb672",
    },
    "&.remotes": {
      backgroundColor: "#b3daf0",
    },
    "&.tags": {
      backgroundColor: "#fcee94",
    },
  },
  focusRef: {
    backgroundColor: "#096ed3 !important",
    color: "#ffffff",
  },
});

function makePaths() {
  const pathSegs = [
    "M 0,12 a 8,8 0 0 1 8,8 l 0,4",
    "M 0,12 l 16,0",
    "M 0,12 a 8,8 0 0 0 8,-8 l 0,-4",
    "M 8,0 l 0,24",
    "M 16,12 a 8 8 0 0 1 -8,-8 l 0,-4",
    "M 16,12 a 8 8 0 0 0 -8,8 l 0,4",
  ];

  const nodeSegs = ["M 8,0 l 0,6", "M 0,12 l 2,0", "M 16,12 l -2,0", "M 8,24 l 0,-6"];

  const r = [];
  for (let i = 0; i < 64; i += 1) {
    let p = "";
    for (let j = 0; j < 6; ++j) {
      if (i & (1 << j)) p += pathSegs[j];
    }
    r.push(p);
  }

  for (let i = 0; i < 16; ++i) {
    let p = "";
    for (let j = 0; j < 4; ++j) {
      if (i & (1 << j)) p += nodeSegs[j];
    }
    r.push(p);
  }

  return r;
}

const graphPaths: string[] = makePaths();

function GraphNode({ type }: { type: number }) {
  return (
    <svg viewBox="0 0 16 24">
      {graphPaths[type] ? <path className="graph-path" d={graphPaths[type]} /> : null}
      {type < 64 ? null : <circle cx="8" cy="12" r="6" className="graph-node"></circle>}
    </svg>
  );
}

export function Log() {
  const classes = useStyles();
  const focusCommit = useSelector((state: RootState) => state.repo.focusCommit);
  const commits = useSelector((state: RootState) => state.repo.commits);
  const refs = useSelector((state: RootState) => state.repo.refs);
  const [scrollTarget, setScrollTarget] = useState<string>("");
  const dispatch = useDispatch();

  const elrefs = new Map<string, RefObject<HTMLTableRowElement>>();
  refs.forEach((r) => {
    elrefs.set(r.hash, React.createRef());
  });

  useEffect(() => {
    if (focusCommit === scrollTarget) return;
    setScrollTarget(focusCommit);
    elrefs.get(focusCommit)?.current?.scrollIntoView({ block: "center" });
  });

  return (
    <div className={classes.logContainer}>
      <table className={classes.logTable}>
        <thead>
          <tr>
            <th className={classes.shortHashHeader}>Short SHA</th>
            <th className={classes.summaryHeader}>Summary</th>
            <th className={classes.authorHeader}>Author</th>
            <th className={classes.dateHeader}>Date</th>
          </tr>
        </thead>
        <tbody>
          {commits.map((commit) => (
            <tr
              key={commit.hash}
              ref={elrefs.get(commit.hash)}
              onClick={() => {
                setScrollTarget(commit.hash);
                dispatch(setFocusCommit(commit.hash));
              }}
              className={classNames({
                [classes.focusRef]: commit.hash === focusCommit,
              })}
            >
              <td className={classes.shortHash}>{commit.hash.substr(0, 7)}</td>
              <td>
                <div className={classes.subjectLine}>
                  {commit.graph.map((type, i) => (
                    <GraphNode key={i} type={type} />
                  ))}
                  <div className={classes.commitLine}>
                    {refs
                      .filter(
                        (r) =>
                          r.hash === commit.hash &&
                          !(r.type === "remotes" && r.name.match(/\/HEAD$/)),
                      )
                      .map((r) => (
                        <span key={r.refName} className={`${classes.commitRef} ${r.type}`}>
                          {r.name}
                        </span>
                      ))}
                    {commit.subject}
                  </div>
                </div>
              </td>
              <td>{commit.authorName}</td>
              <td>{moment(commit.authorStamp * 1000).format("LLL")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
