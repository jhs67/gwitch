import { recentReposReducer } from "./recent/reducers";
import { combineReducers } from "redux";
import { repoStateReducer } from "./repo/reducers";
import { layoutStateReducer } from "./layout/reducers";

export const rootReducer = combineReducers({
  recent: recentReposReducer,
  repo: repoStateReducer,
  layout: layoutStateReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
