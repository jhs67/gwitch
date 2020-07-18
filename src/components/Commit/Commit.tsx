import React from "react";
import moment from "moment";
import classNames from "classnames";
import { createUseStyles } from "react-jss";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { Commit } from "../../store/repo/types";
import { setFocusCommit } from "../../store/repo/actions";

const useStyles = createUseStyles({
  info: {
    display: "flex",
    flexFlow: "row wrap",
    margin: "1em 1em 0 1em",
    borderBottom: "solid #dfdfdf 1px",
    borderCollapse: "collapse",
    alignItems: "stretch",
  },
  meta: {
    flexGrow: 0,
    margin: "0 2em 0 1em",
  },
  infoLabel: {
    textAlign: "right",
    fontWeight: "bold",
    color: "#838394",
  },
  metaSubject: {
    fontWeight: "bold",
    maxWidth: "30em",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
  metaData: {},
  refs: {
    flexGrow: 1,
    margin: "0 2em 0 1em",
  },
  refsData: {
    fontFamily: 'Hack, "Lucida Console", Monaco, monospace',
  },
  parentRef: {
    color: "#1a54ab",
    "&:hover": {
      textDecoration: "underline",
    },
  },
});

type ClassesType = ReturnType<typeof useStyles>;

function CommitInfo({ commit, classes }: { commit: Commit; classes: ClassesType }) {
  const dispatch = useDispatch();

  return (
    <div className={classes.info}>
      <table className={classes.meta}>
        <tbody>
          <tr>
            <td className={classes.infoLabel}>Subject:</td>
            <td className={classes.metaSubject}>{commit.subject}</td>
          </tr>
          <tr>
            <td className={classes.infoLabel}>Author:</td>
            <td
              className={classes.metaData}
            >{`${commit.authorName} <${commit.authorEmail}>`}</td>
          </tr>
          <tr>
            <td className={classes.infoLabel}>Date:</td>
            <td className={classes.metaData}>
              {moment(new Date(commit.authorStamp * 1000)).format("LLL")}
            </td>
          </tr>
        </tbody>
      </table>
      <table className={classes.refs}>
        <tbody>
          <tr>
            <td className={classes.infoLabel}>SHA:</td>
            <td className={classes.refsData}>{commit.hash}</td>
          </tr>
          {commit.parents.map((hash) => (
            <tr key={hash}>
              <td className={classes.infoLabel}>Parent:</td>
              <td
                className={classNames(classes.refsData, classes.parentRef)}
                onClick={() => {
                  dispatch(setFocusCommit(hash));
                }}
              >
                {hash}
              </td>
            </tr>
          ))}
          {commit.children.map((hash) => (
            <tr key={hash}>
              <td className={classes.infoLabel}>Child:</td>
              <td
                className={classNames(classes.refsData, classes.parentRef)}
                onClick={() => {
                  dispatch(setFocusCommit(hash));
                }}
              >
                {hash}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Commit() {
  const focusCommit = useSelector((state: RootState) => state.repo.focusCommit);
  const commits = useSelector((state: RootState) => state.repo.commits);
  const commit = commits.find((commit) => commit.hash == focusCommit);
  const classes = useStyles();

  return commit ? (
    <>
      <CommitInfo commit={commit} classes={classes} />
    </>
  ) : null;
}
