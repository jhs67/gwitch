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
  subject: string;
  body: string;
  graph: number[];
}

export interface RepoState {
  path?: RepoPath;
  refs: RepoRef[];
  commits: Commit[];
}

export const SET_REPO_PATH = "SET_REPO_PATH";
export const RESET_REPO_PATH = "RESET_REPO_PATH";
export const SET_REPO_REFS = "SET_REPO_REFS";
export const SET_COMMITS = "SET_COMMITS";

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

export type RepoStateActions =
  | SetRepoPathAction
  | ResetRepoPathAction
  | SetRepoRefsAction
  | SetCommitsAction;
