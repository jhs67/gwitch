import { useRef } from "react";
import moment from "moment";
import classNames from "classnames";
import { createUseStyles } from "react-jss";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@renderer/store";
import { Commit as CommitType, FileStatus } from "@renderer/store/repo/types";
import { setFocusCommit } from "@renderer/store/repo/actions";
import { Diff } from "../Diff";
import { GwitchTheme } from "@renderer/theme/theme";
import { setPatchShow } from "@renderer/store/layout/actions";

const useStyles = createUseStyles((theme: GwitchTheme) => ({
  commit: {
    position: "absolute",
    height: "100%",
    width: "100%",
    overflow: "auto",
  },
  info: {
    display: "flex",
    flexFlow: "row wrap",
    margin: "1em 1em 0 1em",
    borderBottom: `solid ${theme.colors.softBorder} 1px`,
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
    color: theme.colors.secondary,
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
    fontFamily: theme.typography.monospaceFace,
  },
  parentRef: {
    color: theme.colors.link.primary,
    "&:hover": {
      textDecoration: "underline",
    },
  },
  summary: {
    margin: "1em",
    marginBottom: "0",
    "& .subject": {
      whiteSpace: "pre",
      fontFamily: theme.typography.monospaceFace,
      margin: "1.5em 0 1.4em 0",
    },
    "& .body": {
      whiteSpace: "pre",
      fontSize: "90%",
      fontFamily: theme.typography.monospaceFace,
      margin: "1.1em 0 1.4em 1.0em",
    },
    "& .file": {
      color: theme.colors.lessprimary,
      marginLeft: "2em",
    },
    "& .file:hover": {
      color: theme.colors.link.primary,
      textDecoration: "underline",
    },
  },
}));

type ClassesType = ReturnType<typeof useStyles>;

function CommitInfo({ commit, classes }: { commit: CommitType; classes: ClassesType }) {
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
            <td className={classes.metaData}>{`${commit.authorName} <${commit.authorEmail}>`}</td>
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

function CommitSummary({
  commit,
  patch,
  classes,
  onFileClick,
}: {
  commit: CommitType;
  patch: FileStatus[];
  classes: ClassesType;
  onFileClick: (f: FileStatus) => void;
}) {
  return (
    <div className={classes.summary}>
      <div className="subject">{commit.subject}</div>
      {commit.body && <div className="body">{commit.body}</div>}
      <div className="files">
        {patch.map((p) => (
          <div key={p.newFile || p.oldFile}>
            <span onClick={() => onFileClick(p)} className="file">
              {p.newFile || p.oldFile}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Commit() {
  const focusCommit = useSelector((state: RootState) => state.repo.focusCommit);
  const commits = useSelector((state: RootState) => state.repo.commits);
  const patch = useSelector((state: RootState) => state.repo.focusPatch) || [];
  const commit = commits.find((commit) => commit.hash == focusCommit);
  const show = useSelector((state: RootState) => state.layout.patchShow);
  const dispatch = useDispatch();
  const classes = useStyles();

  const ref = useRef<Map<string, HTMLDivElement>>(new Map<string, HTMLDivElement>());

  return commit ? (
    <div className={classes.commit}>
      <CommitInfo commit={commit} classes={classes} />
      <CommitSummary
        commit={commit}
        classes={classes}
        patch={patch}
        onFileClick={(p) => {
          const el = ref.current.get(p.newFile || p.oldFile);
          if (el != null) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
      <Diff
        patch={patch}
        show={show[focusCommit] || {}}
        setShow={(file, state) => dispatch(setPatchShow(focusCommit, file, state))}
        patchRef={(p, e) => ref.current.set(p.newFile || p.oldFile, e)}
      />
    </div>
  ) : null;
}
