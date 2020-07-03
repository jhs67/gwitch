import { RepoState, RepoStateActions, SET_REPO_PATH, RESET_REPO_PATH } from "./types";

const initialState: RepoState = { refs: [] };

export function repoStateReducer(
  state: RepoState = initialState,
  action: RepoStateActions,
): RepoState {
  switch (action.type) {
    case SET_REPO_PATH:
      return { ...state, path: action.path };
    case RESET_REPO_PATH: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { path, ...rest } = state;
      return rest;
    }
    default:
      return state;
  }
}
