import React from "react";
import SplitPane from "react-split-pane";
import { createUseStyles } from "react-jss";
import { useSelector, useDispatch } from "react-redux";
import classNames from "classnames";
import { RootState } from "../../store";
import { setWorkingSplit, setIndexSplit } from "../../store/layout/actions";
import { FileStatus } from "../../store/repo/types";

const useStyles = createUseStyles({
  working: {
    backgroundColor: "#ededed",
    "& .Resizer": {
      zIndex: 1,
      width: "5px",
      height: "100%",
      padding: "1px",
      cursor: "col-resize",
      "&:hover": {
        background: "#ddd",
      },
    },
    "& .fileView": {
      display: "flex",
      flexFlow: "column nowrap",
      height: "100%",
    },
    "& .fileHeader": {
      flex: "0 0 auto",
      paddingLeft: "6px",
      paddingTop: "3px",
      paddingBottom: "3px",
    },
    "& .fileItem": {
      whiteSpace: "nowrap",
    },
    "& .fileList": {
      flex: "1 1 auto",
      backgroundColor: "white",
      borderWidth: "1px",
      borderColor: "#bbb",
      borderStyle: "solid",
      overflow: "auto",
      outlineColor: "#888",

      "& svg": {
        height: "0.9em",
        verticalAlign: "middle",
      },
      "& .statusM path": {
        fill: "#00df49",
        strokeWidth: "1px",
        stroke: "#086a2d",
      },
      "& .statusU path": {
        fill: "#94e000",
        stroke: "#628622",
      },
      "& .statusD path": {
        fill: "#e01a00",
        stroke: "#863022",
      },
      "& .statusD.unmerged path": {
        fill: "#dd00e0",
        stroke: "#862285",
      },
      "& .statusA path": {
        fill: "#0054e0",
        stroke: "#224586",
      },
      "& .statusA.unmerged path": {
        fill: "#00e0d3",
        stroke: "#228683",
      },
      "& .statusR path": {
        fill: "#b800e0",
        stroke: "#772286",
      },
      "& .statusC path": {
        fill: "#b800e0",
        stroke: "#772286",
      },
      "& path": {
        fill: "#000000",
        strokeWidth: "1px",
        stroke: "#080808",
      },
      "& path.flap": {
        fill: "white",
      },
    },
    "& .commitMessage": {
      display: "flex",
      flexFlow: "column nowrap",
      height: "100%",

      "& .indexHeader": {
        flex: "0 0 auto",
        paddingLeft: "6px",
        paddingTop: "3px",
        paddingBottom: "3px",
      },
      "& .message": {
        flex: "1 1 auto",
        outlineColor: "#888",
        resize: "none",
      },
      "& .commitButtons": {
        flex: "0 0 auto",
        paddingTop: "9px",
        paddingBottom: "9px",
      },
      "& .commitButton": {
        float: "right",
      },
    },
  },
  secondPane: { position: "relative" },
});

interface FilesViewProps {
  header: string;
  files: FileStatus[];
}

function FilesView({ header, files }: FilesViewProps) {
  return (
    <div className="fileView">
      <div className="fileHeader">{header}</div>
      <div className="fileList" tabIndex={0}>
        {(files || []).map((f) => (
          <div
            className={classNames("fileItem", `status${f.status}`, {
              unmerged: f.unmerged,
            })}
            key={f.newFile || f.oldFile}
          >
            <svg viewBox="0 0 14 14">
              <path d="M 3,1 l 0,12 8,0 0,-7 -5,0 0,-5 z"></path>
              <path className="flap" d="M 6,1 l 1,0 4,4 0,1 -5,0 z"></path>
            </svg>
            {f.newFile || f.oldFile}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkingFiles() {
  const workingFiles = useSelector((state: RootState) => state.repo.workingStatus);
  return <FilesView header="Working Files" files={workingFiles} />;
}

function CommitCompose() {
  return (
    <div className="commitMessage">
      <div className="indexHeader">Commit Message</div>
      <textarea className="message"></textarea>
      <div className="commitButtons">
        <label>
          <input className="amend" type="checkbox" />
          Amend
        </label>
        <button className="commitButton">Commit</button>
      </div>
    </div>
  );
}

function IndexFiles() {
  const indexFiles = useSelector((state: RootState) => state.repo.indexStatus);
  return <FilesView header="Index Files" files={indexFiles} />;
}

export function Status() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const workingSplit = useSelector((state: RootState) => state.layout.workingSplit);
  const indexSplit = useSelector((state: RootState) => state.layout.indexSplit);

  return (
    <SplitPane
      className={classes.working}
      maxSize={-300}
      minSize={100}
      defaultSize={workingSplit}
      onChange={(nsplit) => {
        if (nsplit !== workingSplit) dispatch(setWorkingSplit(nsplit));
      }}
    >
      <WorkingFiles />
      <SplitPane
        className={classes.working}
        primary="second"
        maxSize={-200}
        minSize={100}
        defaultSize={indexSplit}
        onChange={(nsplit) => {
          if (nsplit !== indexSplit) dispatch(setIndexSplit(nsplit));
        }}
      >
        <CommitCompose />
        <IndexFiles />
      </SplitPane>
    </SplitPane>
  );
  return <div>status</div>;
}
