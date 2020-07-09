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
});

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
              <td>{commit.subject}</td>
              <td>{commit.authorName}</td>
              <td>{moment(commit.authorStamp * 1000).format("LLL")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
