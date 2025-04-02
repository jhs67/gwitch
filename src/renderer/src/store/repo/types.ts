import { RepoPath } from "@ipc/repo";

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

export interface RepoState {
  path?: RepoPath;
  refs: RepoRef[];
  commits: Commit[];
  focusCommit?: string;
  head?: string;
  focusPatch?: FileStatus[];
  workingStatus?: FileStatus[];
  indexStatus?: FileStatus[];
  workingSelected?: string[];
  indexSelected?: string[];
  submodules: Submodule[];
  amend: boolean;
  commitMessage: string;
  fixup: string | undefined;
}

export const SET_REPO_PATH = "SET_REPO_PATH";
export const RESET_REPO_PATH = "RESET_REPO_PATH";
export const SET_REPO_REFS = "SET_REPO_REFS";
export const SET_COMMITS = "SET_COMMITS";
export const SET_FOCUS_COMMIT = "SET_FOCUS_COMMIT";
export const SET_REPO_HEAD = "SET_REPO_HEAD";
export const SET_FOCUS_PATCH = "SET_FOCUS_PATCH";
export const SET_FOCUS_PATCH_DIFF = "SET_FOCUS_PATCH_DIFF";
export const SET_STAGE_STATUS = "SET_STAGE_STATUS";
export const SET_STAGE_SELECTED = "SET_STAGE_SELECTED";
export const SET_REPO_AMEND = "SET_REPO_AMEND";
export const SET_COMMIT_MESSAGE = "SET_COMMIT_MESSAGE";
export const SET_SUBMODULES = "SET_SUBMODULES";
export const SET_FIXUP = "SET_FIXUP";

type SetRepoPathAction = {
  type: typeof SET_REPO_PATH;
  path: RepoPath;
};

type ResetRepoPathAction = {
  type: typeof RESET_REPO_PATH;
};

type SetRepoRefsAction = {
  type: typeof SET_REPO_REFS;
  refs: RepoRef[];
};

type SetCommitsAction = {
  type: typeof SET_COMMITS;
  commits: Commit[];
};

type SetFocusCommit = {
  type: typeof SET_FOCUS_COMMIT;
  commit: string;
};

type SetRepoHead = {
  type: typeof SET_REPO_HEAD;
  head?: string;
};

type SetFocusPatch = {
  type: typeof SET_FOCUS_PATCH;
  patch: FileStatus[];
};

type SetFocusPatchDiff = {
  type: typeof SET_FOCUS_PATCH_DIFF;
  patch: FileStatus;
};

type SetStageStatus = {
  type: typeof SET_STAGE_STATUS;
  working: FileStatus[];
  index: FileStatus[];
};

type SetStageSelected = {
  type: typeof SET_STAGE_SELECTED;
  working?: string[];
  index?: string[];
};

type SetRepoAmend = {
  type: typeof SET_REPO_AMEND;
  amend: boolean;
};

type SetCommitMessage = {
  type: typeof SET_COMMIT_MESSAGE;
  message: string;
};

type SetSubmodules = {
  type: typeof SET_SUBMODULES;
  submodules: Submodule[];
};

type SetFixup = {
  type: typeof SET_FIXUP;
  fixup: string | undefined;
};

export type RepoStateActions =
  | SetRepoPathAction
  | ResetRepoPathAction
  | SetRepoRefsAction
  | SetCommitsAction
  | SetFocusCommit
  | SetRepoHead
  | SetFocusPatch
  | SetFocusPatchDiff
  | SetStageStatus
  | SetStageSelected
  | SetRepoAmend
  | SetCommitMessage
  | SetSubmodules
  | SetFixup;
