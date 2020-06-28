export interface RecentRepos {
  repos: string[];
}

export const SET_RECENT_REPOS = "SET_RECENT_REPOS";

interface SetRecentReposAction {
  type: typeof SET_RECENT_REPOS;
  repos: string[];
}

export type RecentReposAction = SetRecentReposAction;
