import React, { Fragment } from "react";
import classNames from "classnames";
import { createUseStyles } from "react-jss";
import { FileStatus } from "../../store/repo/types";
import { GwitchTheme } from "../../theme/theme";

const useStyles = createUseStyles((theme: GwitchTheme) => ({
  patch: {
    fontFamily: theme.typography.monospaceFace,
    margin: "0",
    display: "table",
    width: "100%",
    tabSize: "4",

    borderRadius: "0.6em",
    borderWidth: "2px",
    borderColor: "#dedede",
    borderStyle: "solid",

    padding: "8px",
    marginTop: "1em",
    marginBottom: "2em",
    boxSizing: "border-box",

    "& .header": {
      fontSize: "1.2em",
      fontWeight: "bold",
      display: "flex",
      flexFlow: "row nowrap",
    },

    "& .hunk": {
      backgroundColor: "#ececec",
    },

    "& table": {
      borderCollapse: "collapse",
    },

    "& tr:first-child td:nth-child(-n+2)": {
      borderWidth: "1px 1px 0 1px",
    },

    "& tr:last-child td:nth-child(-n+2)": {
      borderWidth: "0 1px 1px 1px",
    },

    "& td:nth-child(-n+2)": {
      borderWidth: "0 1px 0 1px",
      borderColor: "#dddddd",
      borderStyle: "solid",

      backgroundColor: "#ececec",
      textAlign: "right",
    },

    "& td:nth-child(4)": {
      whiteSpace: "pre",
      width: "100%",
    },

    "& .new td:nth-child(n+3)": {
      backgroundColor: "#ddffdd",
      color: "#06772c",
    },

    "& .old td:nth-child(n+3)": {
      backgroundColor: "#ffeeee",
      color: "#bb0704",
    },

    "& .msg": {
      marginLeft: "2em",
    },

    "& .large": {
      color: "#6a6a6a",
      marginLeft: "2em",
      marginTop: "5px",
    },

    "& .large:hover": {
      color: "#1a54ab",
      textDecoration: "underline",
    },
  },
}));

type ClassesType = ReturnType<typeof useStyles>;

function Patch({
  patch,
  show,
  classes,
  diffLimit,
  addLimit,
  setShow,
}: {
  patch: FileStatus;
  show?: boolean;
  classes: ClassesType;
  diffLimit: number;
  addLimit: number;
  setShow: (state: boolean) => void;
}) {
  const msgs: string[] = [];

  const { status, newMode, oldMode, oldFile, newFile, binary, hunks } = patch;
  const loading = !binary && hunks == null;

  // add any additional info about the commit
  if (status === "A") {
    if (newMode) msgs.push(`new file mode ${newMode}`);
    else msgs.push("new file");
  }
  if (status === "D") {
    if (oldMode) msgs.push(`delete file mode ${oldMode}`);
    else msgs.push("delete file");
  }
  if (status === "C") msgs.push(`copy file from ${oldFile} to ${newFile}`);
  if (status === "R") msgs.push(`rename file from ${oldFile} to ${newFile}`);
  if (status !== "A" && status !== "D" && newMode != oldMode)
    msgs.push(`mode change from ${oldMode} to ${newMode}`);
  if (binary) msgs.push("binary files differ");

  function formatLine(l: number) {
    return l < 0 ? "" : l.toString();
  }

  const lines = (hunks || []).reduce((p, n) => p + n.lines.length, 0);
  const large = status === "A" || status === "D" ? lines > addLimit : lines > diffLimit;
  if (show == null) show = !large;

  return (
    <div className={classes.patch}>
      <div className="header" onClick={() => setShow(!show)}>
        <div className="name">{patch.newFile || patch.oldFile}</div>
      </div>
      {msgs.map((m, i) => (
        <div className="msg" key={i}>
          {m}
        </div>
      ))}
      {loading ? (
        <div className="loading">Loading...</div>
      ) : hunks == null ? null : !show ? (
        <div className="large" onClick={() => setShow(true)}>
          {lines} lines: click to open
        </div>
      ) : (
        <table>
          <tbody>
            {hunks.map((h, i) => (
              <Fragment key={i}>
                <tr className="hunk">
                  <td>...</td>
                  <td>...</td>
                  <td></td>
                  <td>{h.header}</td>
                </tr>
                {h.lines.map((l, j) => (
                  <tr
                    className={classNames("diff", {
                      new: l.origin === "+",
                      old: l.origin === "-",
                    })}
                    key={j}
                  >
                    <td>{formatLine(l.oldLine)}</td>
                    <td>{formatLine(l.newLine)}</td>
                    <td>{l.origin}</td>
                    <td>{l.content}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function Diff({
  patch,
  diffLimit,
  addLimit,
  setShow,
  show,
}: {
  patch: FileStatus[];
  diffLimit?: number;
  addLimit?: number;
  setShow: (file: string, state: boolean) => void;
  show: { [source: string]: boolean };
}) {
  const classes = useStyles();

  if (!diffLimit) diffLimit = 200;
  if (!addLimit) addLimit = 50;

  return (
    <div>
      {patch.map((p) => {
        const file = p.newFile || p.oldFile;
        return (
          <Patch
            patch={p}
            classes={classes}
            diffLimit={diffLimit}
            addLimit={addLimit}
            show={show[file]}
            setShow={(state: boolean) => setShow(file, state)}
            key={file}
          />
        );
      })}
    </div>
  );
}
