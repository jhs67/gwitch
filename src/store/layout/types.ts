export interface LayoutState {
  historySplit: number;
}

export const initialLayoutState: LayoutState = { historySplit: 200 };

export const SET_HISTORY_SPLIT = "SET_HISTORY_SPLIT";
export const SET_LAYOUT = "SET_LAYOUT";

interface SetHistorySplitAction {
  type: typeof SET_HISTORY_SPLIT;
  split: number;
}

interface SetLayoutAction {
  type: typeof SET_LAYOUT;
  state: LayoutState;
}

export type LayoutStateActions = SetHistorySplitAction | SetLayoutAction;
