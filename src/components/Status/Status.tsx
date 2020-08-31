import React from "react";
import SplitPane from "react-split-pane";
import { createUseStyles } from "react-jss";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { setWorkingSplit, setIndexSplit } from "../../store/layout/actions";
import { setStageSelected } from "../../store/repo/actions";
import { FilesView } from "./FilesView";

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
      "&.selected": {
        backgroundColor: "#0b82f5",
        color: "white",
      },
      "&.focused": {
        outlineWidth: "1px",
        outlineColor: "#888",
        outlineStyle: "dashed",
      },
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

function WorkingFiles() {
  const selectedPaths = useSelector((state: RootState) => state.repo.workingSelected) || [];
  const workingFiles = useSelector((state: RootState) => state.repo.workingStatus) || [];
  const dispatch = useDispatch();

  const selected = selectedPaths
    .map((p) => workingFiles.findIndex((s) => (s.newFile || s.oldFile) === p))
    .filter((s) => s !== -1)
    .sort();

  const setSelected = (s: number[]) => {
    const f = s.map((s) => workingFiles[s].newFile || workingFiles[s].oldFile);
    dispatch(setStageSelected(f, undefined));
  };

  return (
    <FilesView
      header="Working Files"
      files={workingFiles || []}
      selected={selected}
      setSelected={setSelected}
    />
  );
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
  const selectedPaths = useSelector((state: RootState) => state.repo.indexSelected) || [];
  const indexFiles = useSelector((state: RootState) => state.repo.indexStatus) || [];
  const dispatch = useDispatch();

  const selected = selectedPaths
    .map((p) => indexFiles.findIndex((s) => (s.newFile || s.oldFile) === p))
    .filter((s) => s !== -1)
    .sort();

  const setSelected = (s: number[]) => {
    const f = s.map((s) => indexFiles[s].newFile || indexFiles[s].oldFile);
    dispatch(setStageSelected(undefined, f));
  };

  return (
    <FilesView
      header="Index Files"
      files={indexFiles}
      selected={selected}
      setSelected={setSelected}
    />
  );
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
