import React from "react";
import { hot } from "react-hot-loader";
import { RecentRepos } from "../RecentRepos";

export default function NotHotApp() {
  return <RecentRepos />;
}

export const App = hot(module)(NotHotApp);
