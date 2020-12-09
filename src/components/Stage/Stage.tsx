import React from "react";
import SplitPane from "react-split-pane";
import { createUseStyles } from "react-jss";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { setStageSplit } from "../../store/layout/actions";
import { Patch } from "../Patch";
import { Status } from "../Status";
import { GwitchTheme } from "../../theme/theme";

const useStyles = createUseStyles((theme: GwitchTheme) => ({
  history: {
    "&>.Resizer": {
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

export function Stage() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const split = useSelector((state: RootState) => state.layout.stageSplit);

  return (
    <SplitPane
      className={classes.history}
      split="horizontal"
      minSize={100}
      maxSize={-100}
      defaultSize={split}
      onChange={(nsplit) => {
        if (nsplit !== split) dispatch(setStageSplit(nsplit));
      }}
      primary="second"
      allowResize={true}
    >
      <div>
        <Patch />
      </div>
      <div>
        <Status />
      </div>
    </SplitPane>
  );
}
