export interface RepoPath {
  path: string;
  submodules: string[];
}

export interface RepoRef {
  hash: string;
  refName: string;
  name: string;
  type: "HEAD" | "stash" | "heads" | "remotes" | "tags";
}

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

export interface FileStatus {
  oldFile?: string;
  newFile?: string;
  status: StatusLetter;
  similarity?: number;
  oldMode?: string;
  newMode?: string;
  binary?: boolean;
  unmerged?: boolean;
  hunks?: DiffHunk[];
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
  amend: boolean;
  commitMessage: string;
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

interface SetRepoPathAction {
  type: typeof SET_REPO_PATH;
  path: RepoPath;
}

interface ResetRepoPathAction {
  type: typeof RESET_REPO_PATH;
}

interface SetRepoRefsAction {
  type: typeof SET_REPO_REFS;
  refs: RepoRef[];
}

interface SetCommitsAction {
  type: typeof SET_COMMITS;
  commits: Commit[];
}

interface SetFocusCommit {
  type: typeof SET_FOCUS_COMMIT;
  commit: string;
}

interface SetRepoHead {
  type: typeof SET_REPO_HEAD;
  head?: string;
}

interface SetFocusPatch {
  type: typeof SET_FOCUS_PATCH;
  patch: FileStatus[];
}

interface SetFocusPatchDiff {
  type: typeof SET_FOCUS_PATCH_DIFF;
  patch: FileStatus;
}

interface SetStageStatus {
  type: typeof SET_STAGE_STATUS;
  working: FileStatus[];
  index: FileStatus[];
}

interface SetStageSelected {
  type: typeof SET_STAGE_SELECTED;
  working?: string[];
  index?: string[];
}

interface SetRepoAmend {
  type: typeof SET_REPO_AMEND;
  amend: boolean;
}

interface SetCommitMessage {
  type: typeof SET_COMMIT_MESSAGE;
  message: string;
}

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
  | SetCommitMessage;
