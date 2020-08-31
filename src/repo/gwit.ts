import {
  RepoPath,
  RepoRef,
  Commit,
  FileStatus,
  StatusLetter,
  DiffHunk,
  DiffLine,
  DiffLineOrigin,
} from "../store/repo/types";
function parseNameStatus(out: string): FileStatus[] {
  const lines = out.trim().split("\n");
  return lines.map(
    (line): FileStatus => {
      const r = line.split("\t");
      let status = r[0] as StatusLetter;
      let similarity: number;
      let oldFile, newFile;
      if (status.length > 1) {
        similarity = parseInt(status.substr(1));
        status = status[0] as StatusLetter;
      }
      if (status === "A") {
        newFile = r[1];
      } else if (status === "D") {
        oldFile = r[1];
      } else if (status === "R" || status === "C") {
        oldFile = r[1];
        newFile = r[2];
      } else {
        oldFile = r[1];
        newFile = r[2] || r[1];
      }
      return { newFile, oldFile, status, similarity };
    },
  );
}

function diffEHeader(l: string, m: string) {
  if (l.startsWith(m)) return l.substr(m.length);
}

function unEscapePath(v: string) {
  if (v[0] !== '"') return v;
  let r = "",
    i = 1;
  while (i < v.length + 1) {
    const e = v.indexOf("/", i);
    if (e === i) {
      i += 1;
      if (v[i] === "t") r += "\t";
      else if (v[i] === "n") r += "\n";
      else r += v[i];
      i += 1;
    } else if (e === -1) {
      r += v.substr(i, v.length - 1 - i);
      break;
    } else {
      r += v.substr(i, e - v.length);
      i = e;
    }
  }
  return r;
}

function isDiffLine(c: string) {
  return c === " " || c === "-" || c === "+" || c === "\\";
}

function parseDiff(
  diff: string,
  defaults?: Partial<FileStatus>,
): { patches: FileStatus[] } {
  defaults = defaults || {};
  const ret = { patches: [] as FileStatus[] };
  const lines = diff.trim().split("\n");
  let i = 0;
  while (i < lines.length) {
    const d = lines[i++];
    if (!d.startsWith("diff --git")) throw new Error("invalid diff line: " + d);

    let binary = false,
      empty = false,
      status = defaults.status || "M";
    let oldMode, newMode, oldFile, newFile;
    while (i < lines.length) {
      let w = lines[i],
        v;
      if ((v = diffEHeader(w, "--- "))) {
        if (!oldFile) {
          oldFile = unEscapePath(v);
          if (oldFile === "/dev/null") {
            oldFile = null;
          } else if (oldFile.startsWith("a/")) {
            oldFile = oldFile.substr(2);
          } else {
            throw new Error("unexpected from path in diff: " + w);
          }
        }

        i += 1;
        w = lines[i];
        v = diffEHeader(w, "+++ ");
        if (!v) {
          throw new Error("expected +++ diff header line: " + w);
        }
        if (!newFile) {
          newFile = unEscapePath(v);
          if (newFile === "/dev/null") {
            newFile = null;
          } else if (newFile.startsWith("b/")) {
            newFile = newFile.substr(2);
          } else {
            throw new Error("unexpected to path in diff: " + w);
          }
        }

        i += 1;
        break;
      } else if ((v = diffEHeader(w, "Binary files "))) {
        const m = v.match(/(.*) and (.*) differ/);
        if (!m) {
          throw new Error("unexpected binary diff message: " + w);
        }

        if (!oldFile) {
          oldFile = unEscapePath(m[1]);
          if (oldFile === "/dev/null") {
            oldFile = null;
          } else if (oldFile.startsWith("a/")) {
            oldFile = oldFile.substr(2);
          } else {
            throw new Error("unexpected from path in diff: " + w);
          }
        }

        if (!newFile) {
          newFile = unEscapePath(m[2]);
          if (newFile === "/dev/null") {
            newFile = null;
          } else if (newFile.startsWith("b/")) {
            newFile = newFile.substr(2);
          } else {
            throw new Error("unexpected to path in diff: " + w);
          }
        }

        binary = true;
        i += 1;
        break;
      } else if ((v = diffEHeader(w, "diff --git "))) {
        empty = true;
        break;
      } else if ((v = diffEHeader(w, "old mode "))) {
        oldMode = v;
      } else if ((v = diffEHeader(w, "deleted file mode "))) {
        status = "D";
        oldMode = v;
      } else if ((v = diffEHeader(w, "new mode "))) {
        newMode = v;
      } else if ((v = diffEHeader(w, "new file mode "))) {
        status = "A";
        newMode = v;
      } else if ((v = diffEHeader(w, "copy from "))) {
        status = "C";
        oldFile = unEscapePath(v);
      } else if ((v = diffEHeader(w, "rename from "))) {
        status = "R";
        oldFile = unEscapePath(v);
      } else if ((v = diffEHeader(w, "copy to "))) {
        status = "C";
        newFile = unEscapePath(v);
      } else if ((v = diffEHeader(w, "rename to "))) {
        status = "R";
        newFile = unEscapePath(v);
      } else if ((v = diffEHeader(w, "index "))) {
        const m = v.match("[0-9a-fA-F]*...[0-9a-fA-F]*( ([0-7]*))?");
        if (!m) {
          throw new Error("unexected index header: " + w);
        }
        if (m[1]) {
          oldMode = newMode = m[1];
        }
      } else if (
        !diffEHeader(w, "similarity index ") &&
        !diffEHeader(w, "similarity index ")
      ) {
        throw new Error("unrecognized git extended header line: " + w);
      }
      i += 1;
    }

    if (!oldFile && !newFile) {
      let m = d.match(/diff --git a\/(.*) b\/\1/);
      if (m) {
        newFile = m[1];
      } else {
        m = d.match(/diff --git a\/(.*) b\/(.*)/);
        oldFile = m[1];
        newFile = m[2];
      }
    }

    const patch: FileStatus = { status, oldMode, newMode, oldFile, newFile };

    if (binary) {
      patch.binary = true;
      patch.hunks = [];
    } else if (empty) {
      patch.hunks = [];
    } else {
      patch.hunks = [];

      while (i < lines.length) {
        let l = lines[i++];
        const m = l.match(/(@@\s*-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s*@@.*)/);
        if (!m) throw new Error("invalid hunk header: " + l);
        const hunk: DiffHunk = {
          header: m[1],
          oldStart: parseInt(m[2]),
          oldCount: m[3] ? parseInt(m[3]) : 0,
          newStart: parseInt(m[4]),
          newCount: m[5] ? parseInt(m[5]) : 0,
          lines: [],
        };

        let oldLineno = hunk.oldStart;
        let newLineno = hunk.newStart;
        while (i < lines.length) {
          if (!isDiffLine(lines[i][0])) break;
          l = lines[i++];
          const o = l[0] as DiffLineOrigin;
          const line: DiffLine = {
            origin: o as "+" | "-",
            content: l.substr(1),
            oldLine: o !== "\\" && o !== "+" ? oldLineno++ : -1,
            newLine: o !== "\\" && o !== "-" ? newLineno++ : -1,
          };

          hunk.lines.push(line);
        }

        patch.hunks.push(hunk);

        if (i === lines.length || lines[i][0] !== "@") break;
      }
    }

    ret.patches.push(patch);
  }

  return ret;
}

export interface StageFileStatus {
  file: string;
  oldFile?: string;
  workingStatus: StatusLetter;
  indexStatus: StatusLetter;
  unmerged: boolean;
}

function isUnmerged(indexStatus: StatusLetter, workingStatus: StatusLetter) {
  if (indexStatus === "U" || workingStatus === "U") return true;
  if (indexStatus === "D" && workingStatus === "D") return true;
  if (indexStatus === "A" && workingStatus === "A") return true;
  return false;
}

function statusLine(line: string, next: string): StageFileStatus {
  const indexStatus = line[0] as StatusLetter;
  const workingStatus = line[1] as StatusLetter;
  return {
    indexStatus,
    workingStatus,
    file: line.substr(3),
    unmerged: isUnmerged(indexStatus, workingStatus),
    oldFile: line[0] === "R" ? next : undefined,
  };
}

    return this.repoPath;
            body: v[7],
            children: [],

  commitStatus(ref: string): Cancellable<FileStatus[]> {
    return cancellableX(
      this.git("show", "--name-status", "--format=", "-M50", "-C50", ref),
      (output) => parseNameStatus(output),
    );
  }

  diffCommitFile(from: string | undefined, to: string, record: Partial<FileStatus>) {
    if (!from) from = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
    const file = record.newFile || record.oldFile;
    const old = record.oldFile;
    return cancellableX(
      old && old !== file
        ? this.git("diff", from + ":" + old, to + ":" + file)
        : this.git("diff", from, to, "--", file),
      (output) => parseDiff(output),
    );
  }

  isIgnored(path: string) {
    return cancellableX(this.gitRc("check-ignore", path), (res) => {
      return res.code === 0;
    });
  }

  stageStatus() {
    return cancellableX(this.git("status", "-z", "-uall"), (out) => {
      const r = [];
      const lines = out.split("\x00");
      while (lines.length > 1) {
        const line = lines.shift();
        const e = statusLine(line, lines[0]);
        if (e.indexStatus === "R") lines.shift();
        r.push(e);
      }
      return r;
    });
  }

  diffFileUntracked(file: string) {
    return cancellableX(
      this.gitRc("diff", "-M50", "-C50", "--no-index", "--", "/dev/null", file),
      (res) => parseDiff(res.out).patches[0],
    );
  }

  diffFileWorkingToHead(file: string) {
    return cancellableX(
      this.git("diff", "-M50", "-C50", "HEAD", "--", file),
      (out) => parseDiff(out).patches[0],
    );
  }

  diffFileWorkingToIndex(file: string) {
    return cancellableX(
      this.git("diff", "-M50", "-C50", "--", file),
      (out) => parseDiff(out).patches[0],
    );
  }

  diffFileIndexToHead(file: string, from?: string) {
    return cancellableX(
      from
        ? this.git("diff", "-M50", "-C50", "-M01", "--cached", "--", from, file)
        : this.git("diff", "-M50", "-C50", "--cached", "--", file),
      (out) => parseDiff(out).patches[0],
    );
  }