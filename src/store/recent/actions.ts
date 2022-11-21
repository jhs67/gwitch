import { SET_RECENT_REPOS, RecentReposAction, RESET_RECENT_REPOS, REMOVE_RECENT_REPO } from "./types";

export function setRecentRepos(repos: string[]): RecentReposAction {
  return { type: SET_RECENT_REPOS, repos: repos };
}

export function resetRecentRepos(): RecentReposAction {
  return { type: RESET_RECENT_REPOS };
}

export function removeRecentRepo(repo: string): RecentReposAction {
  return { type: REMOVE_RECENT_REPO, repo };
}
