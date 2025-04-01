import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@renderer/store";
import { SelectDiff } from "../Diff";
import { LoaderContext } from "@renderer/main";
import { RepoLoader } from "@renderer/repo/loader";
import { dialog, getCurrentWindow } from "@electron/remote";

export function Patch() {
  const workingStatus = useSelector((state: RootState) => state.repo.workingStatus);
  const indexStatus = useSelector((state: RootState) => state.repo.indexStatus);
  const workingSelected = useSelector((state: RootState) => state.repo.workingSelected);
  const indexSelected = useSelector((state: RootState) => state.repo.indexSelected);
  const [show, setShow] = useState<{ [file: string]: boolean }>({});

  const isWorking = !indexSelected?.length;
  const [status, selected] = !isWorking
    ? [indexStatus || [], indexSelected]
    : [workingStatus || [], workingSelected];

  const patch = status.filter((s) =>
    selected?.length ? selected.indexOf(s.newFile || s.oldFile) !== -1 : true,
  );

  return (
    <LoaderContext.Consumer>
      {(loader: RepoLoader) => (
        <SelectDiff
          patch={patch}
          diffLimit={400}
          addLimit={50}
          show={show}
          setShow={(file, state) => setShow({ ...show, [file]: state })}
          lines={
            isWorking
              ? [
                  {
                    label: "discard",
                    act: (range) => {
                      const r = dialog.showMessageBoxSync(getCurrentWindow(), {
                        type: "warning",
                        buttons: ["Cancel", "Continue"],
                        title: "Discard Changes",
                        message: "Discard Changes? This can not be undone.",
                      });

                      if (!r) return;
                      return loader.discardRange(patch, range.start, range.end);
                    },
                  },
                  {
                    label: "stage",
                    act: (range) => loader.stageRange(patch, range.start, range.end),
                  },
                ]
              : [
                  {
                    label: "unstage",
                    act: (range) => loader.unstageRange(patch, range.start, range.end),
                  },
                ]
          }
        />
      )}
    </LoaderContext.Consumer>
  );
}
