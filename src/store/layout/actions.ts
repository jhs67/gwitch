import {
  LayoutStateActions,
  SET_HISTORY_SPLIT,
  LayoutState,
  SET_LAYOUT,
  SET_ORIGIN_CLOSED,
  SET_TAGS_CLOSED,
} from "./types";

export function setHistorySplit(split: number): LayoutStateActions {
  return { type: SET_HISTORY_SPLIT, split };
}

export function setLayout(state: LayoutState): LayoutStateActions {
  return { type: SET_LAYOUT, state };
}

export function setOriginClosed(origin: string, closed: boolean): LayoutStateActions {
  return { type: SET_ORIGIN_CLOSED, origin, closed };
}

export function setTagsClosed(closed: boolean): LayoutStateActions {
  return { type: SET_TAGS_CLOSED, closed };
}
