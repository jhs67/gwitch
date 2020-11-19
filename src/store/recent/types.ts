export interface RecentRepos {
  repos?: string[];
}

export const SET_RECENT_REPOS = "SET_RECENT_REPOS";
export const RESET_RECENT_REPOS = "RESET_RECENT_REPOS";

interface SetRecentReposAction {
  type: typeof SET_RECENT_REPOS;
  repos: string[];
}

interface ResetRecentReposAction {
  type: typeof RESET_RECENT_REPOS;
}

export type RecentReposAction = SetRecentReposAction | ResetRecentReposAction;
