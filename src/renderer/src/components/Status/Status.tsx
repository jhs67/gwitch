import { ChangeEvent } from "react";
import { Allotment } from "allotment";
import { createUseStyles } from "react-jss";
import { useSelector, useDispatch } from "react-redux";
import { resolve } from "path";
import { shell } from "electron";
import { dialog, getCurrentWindow } from "@electron/remote";
import { RootState } from "@renderer/store";
import { RepoPath } from "@ipc/repo";
import { FileStatus } from "@renderer/store/repo/types";
import { setStatusSplit } from "@renderer/store/layout/actions";
import { setCommitMessage, setRepoAmend, setStageSelected } from "@renderer/store/repo/actions";
import { RepoLoader } from "@renderer/repo/loader";
import { LoaderContext } from "@renderer/repo_loader";
import { FilesView } from "./FilesView";
import { GwitchTheme } from "@renderer/theme/theme";
import classNames from "classnames";
import deepEqual from "deep-equal";

const useStyles = createUseStyles((theme: GwitchTheme) => ({
  working: {
    backgroundColor: theme.colors.frame,
    "& .fileView": {
      display: "flex",
      flexFlow: "column nowrap",
      height: "100%",
      paddingLeft: "1px",
      paddingRight: "1px",
      paddingBottom: "1px",
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
        backgroundColor: `${theme.colors.commitFocus.background}`,
        color: theme.colors.commitFocus.primary,
      },
      "&.focused": {
        outlineWidth: "1px",
        outlineColor: "#888",
        outlineStyle: "dashed",
      },
    },
    "& .fileList": {
      userSelect: "none",
      flex: "1 1 auto",
      backgroundColor: theme.colors.background,
      borderWidth: "1px",
      borderColor: theme.colors.hardBorder,
      borderStyle: "solid",
      overflow: "auto",

      "&:focus": {
        outlineColor: theme.colors.hardBorder,
        outlineStyle: "solid",
      },

      "& svg": {
        height: "0.9em",
        verticalAlign: "middle",
      },
      "& .statusM path": theme.colors.files.statusM,
      "& .statusU path": theme.colors.files.statusU,
      "& .statusD path": theme.colors.files.statusD,
      "& .statusD.unmerged path": theme.colors.files.statusDU,
      "& .statusA path": theme.colors.files.statusA,
      "& .statusA.unmerged path": theme.colors.files.statusAU,
      "& .statusR path": theme.colors.files.statusR,
      "& .statusC path": theme.colors.files.statusC,
      "& path": {
        strokeWidth: "1px",
        fill: theme.colors.primary,
        stroke: theme.colors.files.stroke,
      },
      "& path.flap": {
        fill: theme.colors.background,
      },
    },
    "& .commitMessage": {
      display: "flex",
      flexFlow: "column nowrap",
      height: "100%",
      paddingLeft: "1px",
      paddingRight: "1px",

      "& .indexHeader": {
        flex: "0 0 auto",
        paddingLeft: "6px",
        paddingTop: "3px",
        paddingBottom: "3px",
      },
      "& .message": {
        flex: "1 1 auto",
        resize: "none",
        backgroundColor: theme.colors.background,
        color: theme.colors.primary,
        borderWidth: "1px",
        borderColor: theme.colors.hardBorder,
        borderStyle: "solid",

        "&:focus": {
          outlineColor: theme.colors.hardBorder,
          outlineStyle: "solid",
        },
      },
      "& .commitButtons": {
        flex: "0 0 auto",
        paddingTop: "9px",
        paddingBottom: "9px",
      },
      "& .commitButton": {
        userSelect: "none",
        float: "right",
        padding: "4px 14px",
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: theme.colors.button.border,
        background: theme.colors.button.background,
        borderRadius: "2px",
        "&:hover:not(.disabled)": {
          backgroundColor: theme.colors.button.hover.background,
          borderColor: theme.colors.button.hover.border,
          "&:active": {
            backgroundColor: theme.colors.button.active.background,
            borderColor: theme.colors.button.active.border,
          },
        },
        "&.disabled": {
          color: theme.colors.button.disabled.primary,
          borderColor: theme.colors.button.disabled.border,
        },
      },
      "& .amend": {
        width: "10px",
        height: "10px",
      },
    },
  },
  secondPane: { position: "relative" },
}));

function statusToPath(s: FileStatus, r: RepoPath) {
  return resolve(r.path, ...r.submodules, s.fileName);
}

function WorkingFiles({ loader }: { loader: RepoLoader }) {
  const rootPath = useSelector((state: RootState) => state.repo.path)!;
  const selectedPaths = useSelector((state: RootState) => state.repo.workingSelected) || [];
  const workingFiles = useSelector((state: RootState) => state.repo.workingStatus) || [];
  const dispatch = useDispatch();

  const selected_ = selectedPaths
    .map((p) => workingFiles.findIndex((s) => (s.newFile || s.oldFile) === p))
    .filter((s) => s !== -1)
    .sort((l, r) => l - r);

  const setSelected = (s: number[]) => {
    const f = s.map((s) => workingFiles[s].fileName);
    dispatch(setStageSelected(f, undefined));
  };

  const menu = [
    {
      label: "Stage",
      click: () => loader.stageFiles(loader.workingSelected().map((s) => s.fileName)),
    },
    {
      label: "Open",
      click: () =>
        loader.workingSelected().forEach((s) => shell.openPath(statusToPath(s, rootPath))),
    },
    {
      label: "Show",
      click: () =>
        loader.workingSelected().forEach((s) => shell.showItemInFolder(statusToPath(s, rootPath))),
    },
    {
      label: "Discard",
      click: () => {
        const trashList: string[] = [];
        const discardList: string[] = [];
        let detail = loader
          .workingSelected()
          .map((s) => {
            const p = s.fileName;
            if (s.status === "?") trashList.push(statusToPath(s, rootPath));
            else discardList.push(p);
            return p;
          })
          .join("\n");
        const trash = trashList.length && !discardList.length;
        if (detail.length > 80) detail = detail.substr(0, 77) + "...";

        const r = dialog.showMessageBoxSync(getCurrentWindow(), {
          type: "warning",
          buttons: ["Cancel", "Continue"],
          title: trash ? "Move to Trash" : "Discard Changes",
          message: trash ? "Move to the Trash?" : "Discard Changes? This can not be undone.",
          detail,
        });

        if (!r) return;

        trashList.forEach((s) => shell.trashItem(s));
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
      onDoubleClick={() => loader.stageFiles(loader.workingSelected().map((s) => s.fileName))}
      menu={menu}
    />
  );
}

function CommitCompose({ loader }: { loader: RepoLoader }) {
  const amend = useSelector((state: RootState) => state.repo.amend);
  const message = useSelector((state: RootState) => state.repo.commitMessage);
  const status = useSelector((state: RootState) => state.repo.indexStatus);
  const dispatch = useDispatch();

  const toggleAmend = () => {
    dispatch(setRepoAmend(!amend));
  };

  const messageChange = (ev: ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(setCommitMessage(ev.target.value));
  };

  const commitClick = () => {
    loader.commit(amend, message);
  };

  const disabled = message === "" || !status || status.length === 0;

  return (
    <div className="commitMessage">
      <div className="indexHeader">Commit Message</div>
      <textarea className="message" value={message} onChange={messageChange} />
      <div className="commitButtons">
        <label>
          <input className="amend" type="checkbox" checked={amend} onChange={toggleAmend} />
          Amend
        </label>
        <div
          className={classNames("commitButton", { disabled })}
          onClick={!disabled ? commitClick : void 0}
        >
          Commit
        </div>
      </div>
    </div>
  );
}

function IndexFiles({ loader }: { loader: RepoLoader }) {
  const rootPath = useSelector((state: RootState) => state.repo.path)!;
  const selectedPaths = useSelector((state: RootState) => state.repo.indexSelected) || [];
  const indexFiles = useSelector((state: RootState) => state.repo.indexStatus) || [];
  const dispatch = useDispatch();

  const selected = selectedPaths
    .map((p) => indexFiles.findIndex((s) => (s.newFile || s.oldFile) === p))
    .filter((s) => s !== -1)
    .sort((l, r) => l - r);

  const setSelected = (s: number[]) => {
    const f = s.map((s) => indexFiles[s].fileName);
    dispatch(setStageSelected(undefined, f));
  };

  const menu = [
    {
      label: "Unstage",
      click: () => loader.unstageFiles(loader.indexSelected().map((s) => s.fileName)),
    },
    {
      label: "Open",
      click: () => loader.indexSelected().forEach((s) => shell.openPath(statusToPath(s, rootPath))),
    },
    {
      label: "Show",
      click: () =>
        loader.indexSelected().forEach((s) => shell.showItemInFolder(statusToPath(s, rootPath))),
    },
  ];

  return (
    <FilesView
      header="Index Files"
      files={indexFiles}
      selected={selected}
      setSelected={setSelected}
      menu={menu}
      onDoubleClick={() => loader.unstageFiles(loader.indexSelected().map((s) => s.fileName))}
    />
  );
}

export function Status() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const statusSplit = useSelector((state: RootState) => state.layout.statusSplit);

  return (
    <LoaderContext.Consumer>
      {(loader: RepoLoader) => (
        <Allotment
          className={classes.working}
          defaultSizes={statusSplit}
          onChange={(newSplit) => {
            if (!deepEqual(newSplit, statusSplit)) dispatch(setStatusSplit(newSplit));
          }}
        >
          <Allotment.Pane>
            <WorkingFiles loader={loader} />
          </Allotment.Pane>
          <Allotment.Pane minSize={200}>
            <CommitCompose loader={loader} />
          </Allotment.Pane>
          <Allotment.Pane>
            <IndexFiles loader={loader} />
          </Allotment.Pane>
        </Allotment>
      )}
    </LoaderContext.Consumer>
  );
}
