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
  SET_STAGE_SELECTED,
  SET_REPO_AMEND,
  SET_COMMIT_MESSAGE,
  SET_SUBMODULES,
} from "./types";

const initialState: RepoState = {
  refs: [],
  commits: [],
  amend: false,
  commitMessage: "",
  submodules: [],
};

function same(a: string[] | undefined, b: string[] | undefined) {
  if (a === undefined || b === undefined) return a === undefined && b === undefined;
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

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
    case SET_STAGE_STATUS: {
      // filter the selected list of missing files
      const { workingSelected, indexSelected } = state;
      let i = indexSelected
        ? indexSelected
            .map((p) => action.index.findIndex((s) => (s.newFile || s.oldFile) === p))
            .filter((s) => s !== -1)
            .sort()
            .map((i) => action.index[i].newFile || action.index[i].oldFile)
        : indexSelected;
      let w = workingSelected
        ? workingSelected
            .map((p) => action.working.findIndex((s) => (s.newFile || s.oldFile) === p))
            .filter((s) => s !== -1)
            .sort()
            .map((i) => action.working[i].newFile || action.working[i].oldFile)
        : workingSelected;

      // don't change if nothing changed
      if (same(i, indexSelected)) i = indexSelected;
      if (same(w, workingSelected)) w = workingSelected;

      return {
        ...state,
        indexStatus: action.index,
        workingStatus: action.working,
        indexSelected: i,
        workingSelected: w,
      };
    }
    case SET_STAGE_SELECTED:
      return { ...state, indexSelected: action.index, workingSelected: action.working };
    case SET_REPO_AMEND:
      return { ...state, amend: action.amend };
    case SET_COMMIT_MESSAGE:
      return { ...state, commitMessage: action.message };
    case SET_SUBMODULES:
      return { ...state, submodules: action.submodules };
    default:
      return state;
  }
}
