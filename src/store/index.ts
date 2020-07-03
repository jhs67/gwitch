import { recentReposReducer } from "./recent/recucers";
import { combineReducers } from "redux";
import { repoStateReducer } from "./repo/reducers";

export const rootReducer = combineReducers({
  recent: recentReposReducer,
  repo: repoStateReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
