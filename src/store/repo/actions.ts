import {
  RepoPath,
  SET_REPO_PATH,
  RepoStateActions,
  RESET_REPO_PATH,
  SET_REPO_REFS,
  RepoRef,
  SET_COMMITS,
  Commit,
  SET_FOCUS_COMMIT,
} from "./types";

export function setRepoPath(path: RepoPath): RepoStateActions {
  return { type: SET_REPO_PATH, path };
}

export function resetRepoPath(): RepoStateActions {
  return { type: RESET_REPO_PATH };
}

export function setRepoRefs(refs: RepoRef[]): RepoStateActions {
  return { type: SET_REPO_REFS, refs };
}

export function setCommits(commits: Commit[]): RepoStateActions {
  return { type: SET_COMMITS, commits };
}

export function setFocusCommit(commit: string): RepoStateActions {
  return { type: SET_FOCUS_COMMIT, commit };
}
