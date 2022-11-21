import {
  initialLayoutState,
  LayoutStateActions,
  LayoutState,
  SET_HISTORY_SPLIT,
  SET_LAYOUT,
  SET_ORIGIN_CLOSED,
  SET_TAGS_CLOSED,
  SET_PATCH_SHOW,
  SET_CLIENT_MODE,
  SET_STAGE_SPLIT,
  SET_STATUS_SPLIT,
  SET_SUBMODULES_CLOSED,
} from "./types";

export function layoutStateReducer(
  state: LayoutState = initialLayoutState,
  action: LayoutStateActions,
): LayoutState {
  switch (action.type) {
    case SET_HISTORY_SPLIT:
      return { ...state, historySplit: action.split };
    case SET_STAGE_SPLIT:
      return { ...state, stageSplit: action.split };
    case SET_STATUS_SPLIT:
      return { ...state, statusSplit: action.split };
    case SET_LAYOUT:
      return action.state;
    case SET_ORIGIN_CLOSED:
      return {
        ...state,
        originClosed: { ...state.originClosed, [action.origin]: action.closed },
      };
    case SET_TAGS_CLOSED:
      return { ...state, tagsClosed: action.closed };
    case SET_SUBMODULES_CLOSED:
      return { ...state, submodulesClosed: action.closed };
    case SET_PATCH_SHOW:
      return {
        ...state,
        patchShow: {
          ...state.patchShow,
          [action.source]: {
            ...state.patchShow[action.source],
            [action.file]: action.state,
          },
        },
      };
    case SET_CLIENT_MODE:
      return { ...state, clientMode: action.mode };
    default:
      return state;
  }
}
