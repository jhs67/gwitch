import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { SelectDiff } from "../Diff";

export function Patch() {
  const workingStatus = useSelector((state: RootState) => state.repo.workingStatus);
  const indexStatus = useSelector((state: RootState) => state.repo.indexStatus);
  const workingSelected = useSelector((state: RootState) => state.repo.workingSelected);
  const indexSelected = useSelector((state: RootState) => state.repo.indexSelected);

  const isWorking = !indexSelected?.length;
  const [status, selected] = !isWorking
    ? [indexStatus || [], indexSelected]
    : [workingStatus || [], workingSelected];

  const patch = status.filter((s) =>
    selected?.length ? selected.indexOf(s.newFile || s.oldFile) !== -1 : true,
  );

  return (
    <SelectDiff
      patch={patch}
      diffLimit={400}
      addLimit={50}
      show={{}}
      setShow={() => undefined}
      lines={
        isWorking
          ? [
              { label: "discard", act: () => undefined },
              { label: "stage", act: () => undefined },
            ]
          : [{ label: "unsage", act: () => undefined }]
      }
    />
  );
}
