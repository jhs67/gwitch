import { SET_RECENT_REPOS, RecentReposAction, RESET_RECENT_REPOS } from "./types";

export function setRecentRepos(repos: string[]): RecentReposAction {
  return { type: SET_RECENT_REPOS, repos: repos };
}

export function resetRecentRepos(): RecentReposAction {
  return { type: RESET_RECENT_REPOS };
}
