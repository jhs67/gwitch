import {
  RepoPath,
  SET_REPO_PATH,
  RepoStateActions,
  RESET_REPO_PATH,
  SET_REPO_REFS,
  RepoRef,
} from "./types";

export function setRepoPath(path: RepoPath): RepoStateActions {
  return { type: SET_REPO_PATH, path };
}

export function resetRepoPath(): RepoStateActions {
  return { type: RESET_REPO_PATH };
}
