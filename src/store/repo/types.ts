export interface RepoPath {
  path: string;
  submodules: string[];
}

export interface RepoState {
  path?: RepoPath;
  refs: RepoRef[];
}

export const SET_REPO_PATH = "SET_REPO_PATH";
export const RESET_REPO_PATH = "RESET_REPO_PATH";

interface SetRepoPathAction {
  type: typeof SET_REPO_PATH;
  path: RepoPath;
}

interface ResetRepoPathAction {
  type: typeof RESET_REPO_PATH;
}

export type RepoStateActions = SetRepoPathAction | ResetRepoPathAction;
