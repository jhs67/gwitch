import {
  RepoState,
  RepoStateActions,
  SET_REPO_PATH,
  RESET_REPO_PATH,
  SET_REPO_REFS,
  SET_COMMITS,
  SET_FOCUS_COMMIT,
  SET_REPO_HEAD,
} from "./types";

const initialState: RepoState = { refs: [], commits: [] };

export function repoStateReducer(
  state: RepoState = initialState,
  action: RepoStateActions,
): RepoState {
  switch (action.type) {
    case SET_REPO_PATH:
      return { ...state, path: action.path };
    case RESET_REPO_PATH: {
      return { ...initialState };
    }
    case SET_REPO_REFS:
      return { ...state, refs: action.refs };
    case SET_COMMITS:
      return { ...state, commits: action.commits };
    case SET_FOCUS_COMMIT:
      return { ...state, focusCommit: action.commit };
    case SET_REPO_HEAD:
      return { ...state, head: action.head };
    default:
      return state;
  }
}
