import React from "react";
import SplitPane from "react-split-pane";
import { createUseStyles } from "react-jss";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { setWorkingSplit, setIndexSplit } from "../../store/layout/actions";

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
  },
  secondPane: { position: "relative" },
});

function WorkingFiles() {
  return <div>Working Files</div>;
}

function CommitCompose() {
  return <div>Commit Message</div>;
}

function IndexFiles() {
  return <div>Index Files</div>;
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
