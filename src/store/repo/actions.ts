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
  SET_REPO_HEAD,
  FileStatus,
  SET_FOCUS_PATCH,
  SET_FOCUS_PATCH_DIFF,
  SET_STAGE_STATUS,
  SET_STAGE_SELECTED,
  SET_REPO_AMEND,
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

export function setRepoHead(head: string): RepoStateActions {
  return { type: SET_REPO_HEAD, head };
}

export function setFocusPatch(patch: FileStatus[]): RepoStateActions {
  return { type: SET_FOCUS_PATCH, patch };
}

export function setFocusPatchDiff(patch: FileStatus): RepoStateActions {
  return { type: SET_FOCUS_PATCH_DIFF, patch };
}

export function setStageStatus(
  working: FileStatus[],
  index: FileStatus[],
): RepoStateActions {
  return { type: SET_STAGE_STATUS, working, index };
}

export function setStageSelected(working: string[], index: string[]): RepoStateActions {
  return { type: SET_STAGE_SELECTED, working, index };
}

export function setRepoAmend(amend: boolean): RepoStateActions {
  return { type: SET_REPO_AMEND, amend };
}
