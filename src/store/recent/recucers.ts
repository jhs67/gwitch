import { RecentRepos, RecentReposAction, SET_RECENT_REPOS } from "./types";

const initialState: RecentRepos = {
  repos: [],
};

export function recentReposReducer(
  state: RecentRepos = initialState,
  action: RecentReposAction,
): RecentRepos {
  switch (action.type) {
    case SET_RECENT_REPOS:
      return { ...state, repos: action.repos };
    default:
      return state;
  }
}
