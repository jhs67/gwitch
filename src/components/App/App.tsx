import React from "react";
import { hot } from "react-hot-loader";
import { RecentRepos } from "../RecentRepos";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { RepoClient } from "../RepoClient";

export default function NotHotApp() {
  const path = useSelector((state: RootState) => state.repo.path);
  return path == null ? <RecentRepos /> : <RepoClient />;
}

export const App = hot(module)(NotHotApp);
