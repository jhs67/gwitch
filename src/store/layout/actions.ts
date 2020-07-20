import {
  LayoutStateActions,
  SET_HISTORY_SPLIT,
  LayoutState,
  SET_LAYOUT,
  SET_ORIGIN_CLOSED,
  SET_TAGS_CLOSED,
  SET_PATCH_SHOW,
  ClientMode,
  SET_CLIENT_MODE,
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

export function setPatchShow(
  source: string,
  file: string,
  state: boolean,
): LayoutStateActions {
  return { type: SET_PATCH_SHOW, source, file, state };
}

export function setClientMode(mode: ClientMode): LayoutStateActions {
  return { type: SET_CLIENT_MODE, mode };
}
