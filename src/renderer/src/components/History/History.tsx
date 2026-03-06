import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { Log } from "../Log";
import { Commit } from "../Commit";
import { CommitFiles } from "../CommitFiles";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@renderer/store";
import { setHistorySplit, setHistoryMode } from "@renderer/store/layout/actions";
import { createUseStyles } from "react-jss";
import { GwitchTheme } from "@renderer/theme/theme";
import classNames from "classnames";
import deepEqual from "deep-equal";

const useStyles = createUseStyles((theme: GwitchTheme) => ({
  lowerPane: {
    position: "absolute",
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  toolbar: {
    flex: "0 0 auto",
    display: "flex",
    borderBottom: `1px solid ${theme.colors.softBorder}`,
    backgroundColor: theme.colors.background,
  },
  tab: {
    padding: "3px 10px",
    cursor: "pointer",
    color: theme.colors.secondary,
    fontSize: theme.typography.bodySize,
    "&:hover": {
      color: theme.colors.primary,
    },
  },
  activeTab: {
    color: theme.colors.primary,
    borderBottom: `2px solid ${theme.colors.primary}`,
    marginBottom: "-1px",
  },
  body: {
    flex: "1 1 auto",
    position: "relative",
  },
}));

export function History() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const split = useSelector((state: RootState) => state.layout.historySplit);
  const historyMode = useSelector((state: RootState) => state.layout.historyMode);

  return (
    <Allotment
      vertical={true}
      defaultSizes={split}
      onChange={(newSplit) => {
        if (!deepEqual(newSplit, split)) dispatch(setHistorySplit(newSplit));
      }}
    >
      <Allotment.Pane>
        <Log />
      </Allotment.Pane>
      <Allotment.Pane>
        <div className={classes.lowerPane}>
          <div className={classes.toolbar}>
            <div
              className={classNames(classes.tab, { [classes.activeTab]: historyMode === "diff" })}
              onClick={() => dispatch(setHistoryMode("diff"))}
            >
              Diff
            </div>
            <div
              className={classNames(classes.tab, { [classes.activeTab]: historyMode === "files" })}
              onClick={() => dispatch(setHistoryMode("files"))}
            >
              Files
            </div>
          </div>
          <div className={classes.body}>
            {historyMode === "diff" ? <Commit /> : <CommitFiles />}
          </div>
        </div>
      </Allotment.Pane>
    </Allotment>
  );
}
