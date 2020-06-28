import { recentReposReducer } from "./recent/recucers";
import { combineReducers } from "redux";

export const rootReducer = combineReducers({
  recent: recentReposReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
