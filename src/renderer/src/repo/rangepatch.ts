import { SelectRange } from "../components/Diff";
import { FileStatus } from "@renderer/store/repo/types";

export function rangePatch(
  files: FileStatus[],
  select: SelectRange,
  forward: boolean,
): [string, string[]] {
  let cursor = 0;
  let patch = "";
  const to_add: string[] = [];
  for (const file of files) {
    if (cursor > select.end) break;
    if (!file.hunks) continue;

    let new_off = 0;
    let old_off = 0;
    let file_patch = "";
    for (const hunk of file.hunks) {
      if (cursor > select.end) break;
      let origin = cursor;
      cursor += hunk.lines.length;
      if (cursor <= select.start) continue;

      const new_start = hunk.newStart + new_off;
      const old_start = hunk.oldStart + old_off;
      let new_count = 0;
      let old_count = 0;
      let changes = false;
      let hunk_patch = "";
      for (const line of hunk.lines) {
        const on = origin >= select.start && origin <= select.end;
        origin += 1;

        if (line.origin === " ") {
          hunk_patch += " " + line.content + "\n";
          new_count += 1;
          old_count += 1;
        } else if (line.origin === "-") {
          if (on) {
            hunk_patch += "-" + line.content + "\n";
            changes = true;
            old_count += 1;
          } else if (forward) {
            hunk_patch += " " + line.content + "\n";
            old_count += 1;
            new_count += 1;
            new_off += 1;
          } else {
            old_off -= 1;
          }
        } else if (line.origin === "+") {
          if (on) {
            hunk_patch += "+" + line.content + "\n";
            changes = true;
            new_count += 1;
          } else if (!forward) {
            hunk_patch += " " + line.content + "\n";
            old_count += 1;
            new_count += 1;
            old_off += 1;
          } else {
            new_off -= 1;
          }
        }
      }

      if (changes)
        file_patch += `@@ -${old_start},${old_count} +${new_start},${new_count} @@\n${hunk_patch}`;
    }

    if (file_patch) {
      let oldFile = file.oldFile;
      if (!oldFile) {
        oldFile = file.newFile as string;
        to_add.push(oldFile);
      }
      patch += `--- a/${oldFile}\n+++ b/${file.newFile}\n${file_patch}`;
    }
  }
  return [patch, to_add];
}
