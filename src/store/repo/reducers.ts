import {
  RepoState,
  RepoStateActions,
  SET_REPO_PATH,
  RESET_REPO_PATH,
  SET_REPO_REFS,
  SET_COMMITS,
  SET_FOCUS_COMMIT,
  SET_REPO_HEAD,
  SET_FOCUS_PATCH,
  SET_FOCUS_PATCH_DIFF,
  SET_STAGE_STATUS,
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
    case SET_FOCUS_PATCH:
      return { ...state, focusPatch: action.patch };
    case SET_FOCUS_PATCH_DIFF:
      return {
        ...state,
        focusPatch: state.focusPatch.map((s) => {
          if ((s.newFile || s.oldFile) !== (action.patch.newFile || action.patch.oldFile))
            return s;
          return { ...s, ...action.patch };
        }),
      };
    case SET_STAGE_STATUS:
      return { ...state, indexStatus: action.index, workingStatus: action.working };
    default:
      return state;
  }
}
