import { SelectRange } from "../components/Diff";
import { FileStatus } from "../store/repo/types";

export function rangePatch(
  files: FileStatus[],
  select: SelectRange,
  forward: boolean,
): [string, string[]] {
  let cursor = 0;
  let patch = "";
  const toadd = [];
  for (const file of files) {
    if (cursor > select.end) break;

    let newoff = 0;
    let oldoff = 0;
    let filepatch = "";
    for (const hunk of file.hunks) {
      if (cursor > select.end) break;
      let origin = cursor;
      cursor += hunk.lines.length;
      if (cursor <= select.start) continue;

      const newstart = hunk.newStart + newoff;
      const oldstart = hunk.oldStart + oldoff;
      let newcount = 0;
      let oldcount = 0;
      let changes = false;
      let hunkpatch = "";
      for (const line of hunk.lines) {
        const on = origin >= select.start && origin <= select.end;
        origin += 1;

        if (line.origin === " ") {
          hunkpatch += " " + line.content + "\n";
          newcount += 1;
          oldcount += 1;
        } else if (line.origin === "-") {
          if (on) {
            hunkpatch += "-" + line.content + "\n";
            changes = true;
            oldcount += 1;
          } else if (forward) {
            hunkpatch += " " + line.content + "\n";
            oldcount += 1;
            newcount += 1;
            newoff += 1;
          } else {
            oldoff -= 1;
          }
        } else if (line.origin === "+") {
          if (on) {
            hunkpatch += "+" + line.content + "\n";
            changes = true;
            newcount += 1;
          } else if (!forward) {
            hunkpatch += " " + line.content + "\n";
            oldcount += 1;
            newcount += 1;
            oldoff += 1;
          } else {
            newoff -= 1;
          }
        }
      }

      if (changes)
        filepatch += `@@ -${oldstart},${oldcount} +${newstart},${newcount} @@\n${hunkpatch}`;
    }

    if (filepatch) {
      let oldFile = file.oldFile;
      if (!oldFile) {
        oldFile = file.newFile;
        toadd.push(file.newFile);
      }
      patch += `--- a/${oldFile}\n+++ b/${file.newFile}\n${filepatch}`;
    }
  }
  return [patch, toadd];
}
