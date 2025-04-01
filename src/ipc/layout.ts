export interface PatchShow {
  [source: string]: {
    [file: string]: boolean;
  };
}

export type ClientMode = "history" | "stage";

export interface LayoutState {
  historySplit: number[];
  stageSplit: number[];
  statusSplit: number[];
  originClosed: { [key: string]: boolean };
  tagsClosed: boolean;
  submodulesClosed: boolean;
  patchShow: PatchShow;
  clientMode: ClientMode;
}
