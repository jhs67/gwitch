import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { createUseStyles } from "react-jss";
import moment from "moment";

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
  const commits = useSelector((state: RootState) => state.repo.commits);

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
            <tr key={commit.hash}>
              <td className={classes.shortHash}>{commit.hash.substr(0, 7)}</td>
              <td>
                <div className={classes.subjectLine}>
                  {commit.graph.map((type, i) => (
                    <GraphNode key={i} type={type} />
                  ))}
                  <div className={classes.commitLine}>{commit.subject}</div>
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
