export interface LayoutState {
  historySplit: number;
  originClosed: { [key: string]: boolean };
  tagsClosed: boolean;
}

export const initialLayoutState: LayoutState = {
  historySplit: 200,
  originClosed: {},
  tagsClosed: true,
};

export const SET_HISTORY_SPLIT = "SET_HISTORY_SPLIT";
export const SET_LAYOUT = "SET_LAYOUT";
export const SET_ORIGIN_CLOSED = "SET_ORIGIN_CLOSED";
export const SET_TAGS_CLOSED = "SET_TAGS_CLOSED";

interface SetHistorySplitAction {
  type: typeof SET_HISTORY_SPLIT;
  split: number;
}

interface SetLayoutAction {
  type: typeof SET_LAYOUT;
  state: LayoutState;
}

interface SetOriginClosedAction {
  type: typeof SET_ORIGIN_CLOSED;
  origin: string;
  closed: boolean;
}

interface SetTagsClosedAction {
  type: typeof SET_TAGS_CLOSED;
  closed: boolean;
}

export type LayoutStateActions =
  | SetHistorySplitAction
  | SetLayoutAction
  | SetOriginClosedAction
  | SetTagsClosedAction;
