import React from "react";
import { hot } from "react-hot-loader";

export default function NotHotApp() {
  return <div>hello world from gwitch!</div>;
}

export const App = hot(module)(NotHotApp);
