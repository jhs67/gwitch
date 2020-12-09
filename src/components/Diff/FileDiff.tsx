import React, { Fragment } from "react";
import classNames from "classnames";
import { FileStatus } from "../../store/repo/types";
import { GwitchTheme } from "../../theme/theme";
import { createUseStyles } from "react-jss";
import { LineOption } from "./SelectDiff";
import ContractIcon from "../../assets/contract.svg";
import ExpandIcon from "../../assets/expand.svg";

const useStyles = createUseStyles((theme: GwitchTheme) => ({
  patch: {
    fontFamily: theme.typography.monospaceFace,
    margin: "0",
    display: "table",
    width: "100%",
    tabSize: "4",

    borderRadius: "0.6em",
    borderWidth: "2px",
    borderColor: theme.colors.softBorder,
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

      "& .name": {
        flex: "1 1",
      },
      "& .expand": {
        width: 16,
        height: 16,
        fill: theme.colors.primary,
      },
    },

    "& .hunk": {
      backgroundColor: theme.colors.frame,

      "& .hunktop": {
        display: "flex",
        alignItems: "center",
      },

      "& .hunklabel": {
        flex: 1,
      },

      "&:hover .buttons": {
        display: "flex",
      },
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
      borderColor: theme.colors.softBorder,
      borderStyle: "solid",

      backgroundColor: theme.colors.frame,
      textAlign: "right",
    },

    "& td:nth-child(4)": {
      whiteSpace: "pre",
      width: "100%",
    },

    "& .new td:nth-child(n+3)": {
      backgroundColor: theme.colors.diff.new.background,
      color: theme.colors.diff.new.primary,
    },

    "& .old td:nth-child(n+3)": {
      backgroundColor: theme.colors.diff.old.background,
      color: theme.colors.diff.old.primary,
    },

    "& .selected td:nth-child(n+3)": {
      backgroundColor: theme.colors.diff.selected.background,
    },

    "& td:nth-child(1),td:nth-child(2),td:nth-child(3)": {
      userSelect: "none",
    },

    "& .msg": {
      marginLeft: "2em",
    },

    "& .large": {
      color: theme.colors.lessprimary,
      marginLeft: "2em",
      marginTop: "5px",
    },

    "& .large:hover": {
      color: theme.colors.link.primary,
      textDecoration: "underline",
    },

    "& .buttons": {
      display: "none",
      flexFlow: "row",
      flex: "0",
      "& div": {
        fontFamily: theme.typography.bodyFace,
        border: `1px solid ${theme.colors.diff.buttons.border}`,
        padding: "0px 2px 1px 2px",
        fontSize: "80%",
        backgroundColor: theme.colors.diff.buttons.background,
        borderRadius: "3px",
        color: theme.colors.diff.buttons.primary,
        marginLeft: "3px",
        "&:hover": {
          borderColor: theme.colors.diff.buttons.hover.border,
          color: theme.colors.diff.buttons.hover.primary,
        },
      },
    },
  },
}));

type LineRefType = HTMLTableRowElement | null;

interface FileDiffProps {
  patch: FileStatus;
  show?: boolean;
  diffLimit: number;
  addLimit: number;
  setShow: (state: boolean) => void;
  origin?: number;
  clickLine?: ((a: MouseEvent) => void) | undefined;
  actions?: LineOption[];
  lineRefs?: LineRefType[];
}

export function FileDiff({
  patch,
  show,
  diffLimit,
  addLimit,
  setShow,
  origin,
  clickLine,
  actions,
  lineRefs,
}: FileDiffProps) {
  const classes = useStyles();
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
  let cursor = origin || 0;

  return (
    <div
      className={classes.patch}
      onMouseDown={clickLine && ((ev) => clickLine(ev.nativeEvent))}
    >
      <div className="header" onClick={() => setShow(!show)}>
        <div className="name">{patch.newFile || patch.oldFile}</div>
        {!loading && !binary ? (
          <div className="expand">{show ? <ContractIcon /> : <ExpandIcon />}</div>
        ) : null}
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
            {hunks.map((h, i) => {
              const origin = cursor;
              return (
                <Fragment key={i}>
                  <tr className="hunk">
                    <td>...</td>
                    <td>...</td>
                    <td></td>
                    <td>
                      <div className="hunktop">
                        <div className="hunklabel">{h.header}</div>
                        {actions ? (
                          <div className="buttons">
                            {actions.map((a) => (
                              <div
                                key={a.label}
                                onClick={() =>
                                  a.act({ start: origin, end: origin + h.lines.length - 1 })
                                }
                              >
                                {a.label}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {h.lines.map((l, j) => {
                    const line = cursor;
                    cursor += 1;
                    return (
                      <tr
                        className={classNames("diff", {
                          new: l.origin === "+",
                          old: l.origin === "-",
                        })}
                        key={j}
                        data-line={line}
                        ref={lineRefs && ((v) => (lineRefs[line] = v))}
                      >
                        <td>{formatLine(l.oldLine)}</td>
                        <td>{formatLine(l.newLine)}</td>
                        <td>{l.origin}</td>
                        <td>{l.content + "\n"}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
