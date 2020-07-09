import {
  initialLayoutState,
  LayoutStateActions,
  LayoutState,
  SET_HISTORY_SPLIT,
  SET_LAYOUT,
  SET_ORIGIN_CLOSED,
  SET_TAGS_CLOSED,
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
    case SET_ORIGIN_CLOSED:
      return {
        ...state,
        originClosed: { ...state.originClosed, [action.origin]: action.closed },
      };
    case SET_TAGS_CLOSED:
      return { ...state, tagsClosed: action.closed };
    default:
      return state;
  }
}
