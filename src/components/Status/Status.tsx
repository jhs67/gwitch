import React, { ChangeEvent } from "react";
import SplitPane from "react-split-pane";
import { createUseStyles } from "react-jss";
import { useSelector, useDispatch } from "react-redux";
import { resolve } from "path";
import { shell, remote } from "electron";
import { RootState } from "../../store";
import { FileStatus, RepoPath } from "../../store/repo/types";
import { setWorkingSplit, setIndexSplit } from "../../store/layout/actions";
import { setCommitMessage, setRepoAmend, setStageSelected } from "../../store/repo/actions";
import { RepoLoader } from "../../repo/loader";
import { LoaderContext } from "../../renderer";
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

function statusToPath(s: FileStatus, r: RepoPath) {
  return resolve(r.path, ...r.submodules, s.newFile || s.oldFile);
}

function WorkingFiles({ loader }: { loader: RepoLoader }) {
  const rootPath = useSelector((state: RootState) => state.repo.path);
  const selectedPaths = useSelector((state: RootState) => state.repo.workingSelected) || [];
  const workingFiles = useSelector((state: RootState) => state.repo.workingStatus) || [];
  const dispatch = useDispatch();

  const selected_ = selectedPaths
    .map((p) => workingFiles.findIndex((s) => (s.newFile || s.oldFile) === p))
    .filter((s) => s !== -1)
    .sort();

  const setSelected = (s: number[]) => {
    const f = s.map((s) => workingFiles[s].newFile || workingFiles[s].oldFile);
    dispatch(setStageSelected(f, undefined));
  };

  const menu = [
    {
      label: "Stage",
      click: () =>
        loader.stageFiles(loader.workingSelected().map((s) => s.newFile || s.oldFile)),
    },
    {
      label: "Open",
      click: () =>
        loader.workingSelected().forEach((s) => shell.openPath(statusToPath(s, rootPath))),
    },
    {
      label: "Show",
      click: () =>
        loader
          .workingSelected()
          .forEach((s) => shell.showItemInFolder(statusToPath(s, rootPath))),
    },
    {
      label: "Discard",
      click: () => {
        const trashList: string[] = [];
        const discardList: string[] = [];
        let detail = loader
          .workingSelected()
          .map((s) => {
            const p = s.newFile || s.oldFile;
            if (s.status === "?") trashList.push(p);
            else discardList.push(p);
            return p;
          })
          .join("\n");
        const trash = trashList.length && !discardList.length;
        if (detail.length > 80) detail = detail.substr(0, 77) + "...";

        const r = remote.dialog.showMessageBoxSync(remote.getCurrentWindow(), {
          type: "warning",
          buttons: ["Cancel", "Continue"],
          title: trash ? "Move to Trash" : "Discard Changes",
          message: trash
            ? "Move to the Trash?"
            : "Discard Changes? This can not be undone.",
          detail,
        });

        if (!r) return;

        trashList.forEach((s) => shell.moveItemToTrash(s));
        loader.discardChanges(discardList);
      },
    },
  ];

  return (
    <FilesView
      header="Working Files"
      files={workingFiles || []}
      selected={selected_}
      setSelected={setSelected}
      onDoubleClick={() =>
        loader.stageFiles(loader.workingSelected().map((s) => s.newFile || s.oldFile))
      }
      menu={menu}
    />
  );
}

function CommitCompose() {
  const amend = useSelector((state: RootState) => state.repo.amend);
  const message = useSelector((state: RootState) => state.repo.commitMessage);
  const dispatch = useDispatch();

  const toggleAmend = () => {
    dispatch(setRepoAmend(!amend));
  };

  const messageChange = (ev: ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(setCommitMessage(ev.target.value));
  };

  return (
    <div className="commitMessage">
      <div className="indexHeader">Commit Message</div>
      <textarea className="message" value={message} onChange={messageChange} />
      <div className="commitButtons">
        <label>
          <input className="amend" type="checkbox" checked={amend} onChange={toggleAmend} />
          Amend
        </label>
        <button className="commitButton">Commit</button>
      </div>
    </div>
  );
}

function IndexFiles({ loader }: { loader: RepoLoader }) {
  const rootPath = useSelector((state: RootState) => state.repo.path);
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

  const menu = [
    {
      label: "Unstage",
      click: () =>
        loader.unstageFiles(loader.indexSelected().map((s) => s.newFile || s.oldFile)),
    },
    {
      label: "Open",
      click: () =>
        loader.indexSelected().forEach((s) => shell.openPath(statusToPath(s, rootPath))),
    },
    {
      label: "Show",
      click: () =>
        loader
          .indexSelected()
          .forEach((s) => shell.showItemInFolder(statusToPath(s, rootPath))),
    },
  ];

  return (
    <FilesView
      header="Index Files"
      files={indexFiles}
      selected={selected}
      setSelected={setSelected}
      menu={menu}
      onDoubleClick={() =>
        loader.unstageFiles(loader.indexSelected().map((s) => s.newFile || s.oldFile))
      }
    />
  );
}

export function Status() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const workingSplit = useSelector((state: RootState) => state.layout.workingSplit);
  const indexSplit = useSelector((state: RootState) => state.layout.indexSplit);

  return (
    <LoaderContext.Consumer>
      {(loader: RepoLoader) => (
        <SplitPane
          className={classes.working}
          maxSize={-300}
          minSize={100}
          defaultSize={workingSplit}
          onChange={(nsplit) => {
            if (nsplit !== workingSplit) dispatch(setWorkingSplit(nsplit));
          }}
        >
          <WorkingFiles loader={loader} />
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
            <IndexFiles loader={loader} />
          </SplitPane>
        </SplitPane>
      )}
    </LoaderContext.Consumer>
  );
  return <div>status</div>;
}
