import {
  initialLayoutState,
  LayoutStateActions,
  LayoutState,
  SET_HISTORY_SPLIT,
  SET_LAYOUT,
} from "./types";

export function layoutStateReducer(
  state: LayoutState = initialLayoutState,
  action: LayoutStateActions,
): LayoutState {
  switch (action.type) {
    case SET_HISTORY_SPLIT:
      return { ...state, historySplit: action.split };
    case SET_LAYOUT:
      return action.state;
    default:
      return state;
  }
}
