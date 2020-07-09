import { LayoutStateActions, SET_HISTORY_SPLIT, LayoutState, SET_LAYOUT } from "./types";

export function setHistorySplit(split: number): LayoutStateActions {
  return { type: SET_HISTORY_SPLIT, split };
}

export function setLayout(state: LayoutState): LayoutStateActions {
  return { type: SET_LAYOUT, state };
}
