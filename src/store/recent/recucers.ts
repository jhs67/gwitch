import {
  RecentRepos,
  RecentReposAction,
  RESET_RECENT_REPOS,
  SET_RECENT_REPOS,
} from "./types";

const initialState: RecentRepos = {
  repos: null,
};

export function recentReposReducer(
  state: RecentRepos = initialState,
  action: RecentReposAction,
): RecentRepos {
  switch (action.type) {
    case SET_RECENT_REPOS:
      return { ...state, repos: action.repos };
    case RESET_RECENT_REPOS:
      return { ...state, repos: null };
    default:
      return state;
  }
}
