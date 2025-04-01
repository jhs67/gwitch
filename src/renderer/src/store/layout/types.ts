import { ClientMode, LayoutState } from "@ipc/layout";

export const initialLayoutState: LayoutState = {
  historySplit: [200, 200],
  stageSplit: [200, 200],
  statusSplit: [200, 200, 200],
  originClosed: {},
  tagsClosed: true,
  submodulesClosed: false,
  patchShow: {},
  clientMode: "stage",
};

export const SET_HISTORY_SPLIT = "SET_HISTORY_SPLIT";
export const SET_STAGE_SPLIT = "SET_STAGE_SPLIT";
export const SET_STATUS_SPLIT = "SET_WORKING_SPLIT";
export const SET_LAYOUT = "SET_LAYOUT";
export const SET_ORIGIN_CLOSED = "SET_ORIGIN_CLOSED";
export const SET_TAGS_CLOSED = "SET_TAGS_CLOSED";
export const SET_SUBMODULES_CLOSED = "SET_SUBMODULES_CLOSED";
export const SET_PATCH_SHOW = "SET_PATCH_SHOW";
export const SET_CLIENT_MODE = "SET_CLIENT_MODE";

type SetHistorySplitAction = {
  type: typeof SET_HISTORY_SPLIT;
  split: number[];
};

type SetStageSplitAction = {
  type: typeof SET_STAGE_SPLIT;
  split: number[];
};

type SetStatusSplitAction = {
  type: typeof SET_STATUS_SPLIT;
  split: number[];
};

type SetLayoutAction = {
  type: typeof SET_LAYOUT;
  state: LayoutState;
};

type SetOriginClosedAction = {
  type: typeof SET_ORIGIN_CLOSED;
  origin: string;
  closed: boolean;
};

type SetTagsClosedAction = {
  type: typeof SET_TAGS_CLOSED;
  closed: boolean;
};

type SetSubmodulesClosedAction = {
  type: typeof SET_SUBMODULES_CLOSED;
  closed: boolean;
};

type SetPatchShow = {
  type: typeof SET_PATCH_SHOW;
  source: string;
  file: string;
  state: boolean;
};

type SetClientMode = {
  type: typeof SET_CLIENT_MODE;
  mode: ClientMode;
};

export type LayoutStateActions =
  | SetHistorySplitAction
  | SetStageSplitAction
  | SetStatusSplitAction
  | SetLayoutAction
  | SetOriginClosedAction
  | SetTagsClosedAction
  | SetSubmodulesClosedAction
  | SetPatchShow
  | SetClientMode;
