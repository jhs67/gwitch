import React from "react";
import SplitPane from "react-split-pane";
import { createUseStyles } from "react-jss";
import { Log } from "../Log";
import { Commit } from "../Commit";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { setHistorySplit } from "../../store/layout/actions";

const useStyles = createUseStyles({
  history: {
    "& .Resizer": {
      zIndex: 1,
      background: "linear-gradient(#fcfcfc, #e0e0e0)",
      height: "5px",
      borderTop: "1px solid",
      borderBottom: "1px solid",
      borderColor: "#a8a8a8",
      padding: "1px",
      cursor: "row-resize",
      "&:hover": {
        background: "linear-gradient(#ccc, #eee)",
      },
    },
  },
});

export function History() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const split = useSelector((state: RootState) => state.layout.historySplit);

  return (
    <SplitPane
      className={classes.history}
      split="horizontal"
      minSize={50}
      maxSize={-50}
      defaultSize={split}
      onChange={(nsplit) => {
        if (nsplit !== split) dispatch(setHistorySplit(nsplit));
      }}
      primary="second"
      allowResize={true}
    >
      <div>
        <Log />
      </div>
      <div>
        <Commit />
      </div>
    </SplitPane>
  );
}
