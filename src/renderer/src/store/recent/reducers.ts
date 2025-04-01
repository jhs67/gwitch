import {
  RecentRepos,
  RecentReposAction,
  REMOVE_RECENT_REPO,
  RESET_RECENT_REPOS,
  SET_RECENT_REPOS,
} from "./types";

const initialState: RecentRepos = {
  repos: undefined,
};

export function recentReposReducer(
  state: RecentRepos = initialState,
  action: RecentReposAction,
): RecentRepos {
  switch (action.type) {
    case SET_RECENT_REPOS:
      return { ...state, repos: action.repos };
    case RESET_RECENT_REPOS:
      return { ...state, repos: undefined };
    case REMOVE_RECENT_REPO:
      return { ...state, repos: state.repos && state.repos.filter((r) => r != action.repo) };
    default:
      return state;
  }
}
