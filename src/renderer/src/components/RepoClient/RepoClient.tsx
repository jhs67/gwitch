import { History } from "../History";
import { RefsPanel } from "../RefsPanel";
import { createUseStyles } from "react-jss";
import { useSelector } from "react-redux";
import { RootState } from "@renderer/store";
import { Stage } from "../Stage";

const useStyles = createUseStyles({
  repoClient: {
    display: "flex",
    flexFlow: "row nowrap",
    boxSizing: "border-box",
    position: "absolute",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  repoBody: {
    flex: "1 1 auto",
    position: "relative",
  },
});

export function RepoClient() {
  const classes = useStyles();
  const mode = useSelector((state: RootState) => state.layout.clientMode);
  return (
    <div className={classes.repoClient}>
      <RefsPanel />
      <div className={classes.repoBody}>{mode === "history" ? <History /> : <Stage />}</div>
    </div>
  );
}
