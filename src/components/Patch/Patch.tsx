import React from "react";
import { useSelector } from "react-redux";
import { createUseStyles } from "react-jss";
import { RootState } from "../../store";
import { Diff } from "../Diff";

const useStyles = createUseStyles({
  patchContainer: {
    position: "absolute",
    height: "100%",
    width: "100%",
    overflow: "auto",
    padding: 5,
  },
});

export function Patch() {
  const workingStatus = useSelector((state: RootState) => state.repo.workingStatus);
  const indexStatus = useSelector((state: RootState) => state.repo.indexStatus);
  const workingSelected = useSelector((state: RootState) => state.repo.workingSelected);
  const indexSelected = useSelector((state: RootState) => state.repo.indexSelected);
  const classes = useStyles();

  const [status, selected] = indexSelected?.length
    ? [indexStatus || [], indexSelected]
    : [workingStatus || [], workingSelected];

  const patch = status.filter((s) =>
    selected?.length ? selected.indexOf(s.newFile || s.oldFile) !== -1 : true,
  );

  return (
    <div className={classes.patchContainer}>
      <Diff
        patch={patch}
        diffLimit={400}
        addLimit={50}
        show={{}}
        setShow={() => undefined}
      />
    </div>
  );
}
