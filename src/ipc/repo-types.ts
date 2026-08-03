export type OtherRepoRef = {
  hash: string;
  refName: string;
  name: string;
  type: "HEAD" | "stash" | "remotes" | "tags";
};

export type BranchRepoRef = {
  hash: string;
  refName: string;
  name: string;
  upstreams: string[];
  type: "heads";
};

export type RepoRef = OtherRepoRef | BranchRepoRef;

export interface Commit {
  hash: string;
  tree: string;
  authorName: string;
  authorEmail: string;
  authorStamp: number;
  parents: string[];
  children: string[];
  subject: string;
  body: string;
  graph: number[];
}

export type StatusLetter = "A" | "C" | "D" | "M" | "R" | "T" | "U" | "X" | " " | "?";
export type DiffLineOrigin = " " | "-" | "+" | "\\";

export interface DiffLine {
  origin: DiffLineOrigin;
  content: string;
  oldLine: number;
  newLine: number;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export type FileStatus = {
  fileName: string;
  oldFile?: string;
  newFile?: string;
  status: StatusLetter;
  similarity?: number;
  oldMode?: string;
  newMode?: string;
  binary?: boolean;
  unmerged?: boolean;
  hunks?: DiffHunk[];
};

export interface Submodule {
  path: string;
}

// Port message types — sent from RepoLoaderMain to the renderer via MessageChannel ports

export type RefsMessage = {
  refs: RepoRef[];
  head: string | undefined;
  commits: Commit[];
  focusCommit: string | undefined;
};

export type StatusMessage = {
  working: FileStatus[];
  index: FileStatus[];
};

export type FocusPatchMessage =
  { type: "files"; hash: string; files: FileStatus[] } | { type: "diff"; diff: FileStatus };

export type SubmodulesMessage = {
  submodules: Submodule[];
};
