import React from "react";
import SplitPane from "react-split-pane";
import { createUseStyles } from "react-jss";
import { Log } from "../Log";
import { Commit } from "../Commit";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { setHistorySplit } from "../../store/layout/actions";
import { GwitchTheme } from "../../theme/theme";

const useStyles = createUseStyles((theme: GwitchTheme) => ({
  history: {
    "& .Resizer": {
      zIndex: 1,
      background: theme.sizer.vertical,
      height: "5px",
      cursor: "row-resize",
      "&:hover": {
        background: theme.sizer.verticalHover,
      },
    },
  },
}));

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
