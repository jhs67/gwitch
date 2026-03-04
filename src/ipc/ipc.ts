export const OPEN_OTHER = "open-other";
export const OPEN_PATH = "open-path";
export const GET_LAYOUT_STATE = "get-layout-state";
export const SET_LAYOUT_STATE = "set-layout-state";
export const GO_BACK = "go-back";
export const OPEN_SUBMODULE = "open-submodule";
export const REMOVE_RECENT = "remove-recent";

// Subscription channels — renderer sends a MessagePort via postMessage
export const SUBSCRIBE_REFS = "subscribe-refs";
export const SUBSCRIBE_STATUS = "subscribe-status";
export const SUBSCRIBE_FOCUS_PATCH = "subscribe-focus-patch";
export const SUBSCRIBE_SUBMODULES = "subscribe-submodules";

// Repo loader control — renderer invokes to signal state changes
export const SET_FOCUS_COMMIT = "set-focus-commit";
export const SET_AMEND = "set-amend";

// Mutation channels — renderer invokes to modify the repo
export const DISCARD_CHANGES = "discard-changes";
export const STAGE_FILES = "stage-files";
export const UNSTAGE_FILES = "unstage-files";
export const COMMIT_REPO = "commit-repo";
export const STAGE_PATCH = "stage-patch";
export const UNSTAGE_PATCH = "unstage-patch";
export const DISCARD_PATCH = "discard-patch";
