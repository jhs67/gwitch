import React from "react";
import { FileStatus } from "../../store/repo/types";
import { FileDiff } from "./FileDiff";

export function Diff({
  patch,
  diffLimit,
  addLimit,
  setShow,
  show,
}: {
  patch: FileStatus[];
  diffLimit?: number;
  addLimit?: number;
  setShow: (file: string, state: boolean) => void;
  show: { [source: string]: boolean };
}) {
  if (!diffLimit) diffLimit = 200;
  if (!addLimit) addLimit = 50;

  return (
    <div>
      {patch.map((p) => {
        const file = p.newFile || p.oldFile;
        return (
          <FileDiff
            patch={p}
            diffLimit={diffLimit}
            addLimit={addLimit}
            show={show[file]}
            setShow={(state: boolean) => setShow(file, state)}
            key={file}
          />
        );
      })}
    </div>
  );
}
