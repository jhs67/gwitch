export interface RecentRepos {
  repos?: string[];
}

export const SET_RECENT_REPOS = "SET_RECENT_REPOS";
export const RESET_RECENT_REPOS = "RESET_RECENT_REPOS";
export const REMOVE_RECENT_REPO = "REMOVE_RECENT_REPO";

type SetRecentReposAction = {
  type: typeof SET_RECENT_REPOS;
  repos: string[];
};

type ResetRecentReposAction = {
  type: typeof RESET_RECENT_REPOS;
};

type RemoveRecentRepoAction = {
  type: typeof REMOVE_RECENT_REPO;
  repo: string;
};

export type RecentReposAction =
  | SetRecentReposAction
  | ResetRecentReposAction
  | RemoveRecentRepoAction;
