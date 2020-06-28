import { SET_RECENT_REPOS, RecentReposAction } from "./types";

export function setRecentRepos(repos: string[]): RecentReposAction {
  return { type: SET_RECENT_REPOS, repos: repos };
}
