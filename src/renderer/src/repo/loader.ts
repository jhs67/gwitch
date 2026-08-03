import { Dispatch, Store } from "redux";
import { FileStatus } from "@renderer/store/repo/types";
import { RepoPath } from "@ipc/repo";
import {
  setRepoPath,
  resetRepoPath,
  setRepoRefs,
  setCommits,
  setRepoHead,
  setFocusCommit,
  setFocusPatch,
  setFocusPatchDiff,
  setStageStatus,
  setCommitMessage,
  setRepoAmend,
  setSubmodules,
  setRepoFixup,
} from "@renderer/store/repo/actions";
import { RootState } from "@renderer/store";
import { rangePatch } from "./range_patch";

export class RepoLoader {
  private dispatch: Dispatch;

  // Track signalled state to avoid redundant IPC calls
  private currentFocusCommit: string | undefined;
  private currentAmend = false;
  private currentFixup: string | undefined;

  constructor(private store: Store<RootState>) {
    this.dispatch = store.dispatch;

    // Set up per-window subscriptions — these persist for the window lifetime.
    gwitch.subscribeRefs((msg) => {
      this.dispatch(setRepoRefs(msg.refs));
      // head is undefined for a detached HEAD; dispatch it so a stale branch
      // name from a previous checkout doesn't stick around.
      this.dispatch(setRepoHead(msg.head));
      this.dispatch(setCommits(msg.commits));
      if (msg.focusCommit !== undefined) this.dispatch(setFocusCommit(msg.focusCommit));
    });

    gwitch.subscribeStatus((msg) => {
      this.dispatch(setStageStatus(msg.working, msg.index));
    });

    gwitch.subscribeFocusPatch((msg) => {
      if (msg.type === "files") this.dispatch(setFocusPatch(msg.files));
      else this.dispatch(setFocusPatchDiff(msg.diff));
    });

    gwitch.subscribeSubmodules((msg) => {
      this.dispatch(setSubmodules(msg.submodules.map((s) => ({ path: s.path }))));
    });

    // Store subscription: signal main on focusCommit/amend changes;
    // derive commit message from already-loaded Redux data (stays renderer-side).
    this.store.subscribe(() => {
      const { focusCommit, amend, fixup, commitMessage, head, refs, commits } =
        this.store.getState().repo;

      if (focusCommit && this.currentFocusCommit !== focusCommit) {
        this.currentFocusCommit = focusCommit;
        gwitch.setFocusCommit(focusCommit);
      }

      if (this.currentAmend !== amend) {
        this.currentAmend = amend;
        gwitch.setAmend(amend);

        // Resolve the amend target from the HEAD ref, which is present whether
        // HEAD is attached to a branch or dangling.
        const h =
          refs.find((r) => r.refName === "HEAD")?.hash ??
          refs.find((r) => r.refName === head)?.hash;
        const c = h ? commits.find((c) => c.hash === h) : undefined;
        const m = c ? (c.body ? `${c.subject}\n\n${c.body}` : c.subject) : "";
        if (amend && commitMessage === "") this.dispatch(setCommitMessage(m));
        if (!amend && commitMessage === m) this.dispatch(setCommitMessage(""));
      }

      if (this.currentFixup !== fixup) {
        this.currentFixup = fixup;
        if (fixup) {
          const c = commits.find((c) => c.hash === fixup);
          this.dispatch(setCommitMessage(c ? `fixup! ${c.subject}` : ""));
        } else {
          this.dispatch(setCommitMessage(""));
        }
      }
    });
  }

  open(path: RepoPath) {
    this.dispatch(setRepoPath(path));
    // Main process starts pushing data via the already-registered ports
    // when Gwitch.sendOpenPath() calls RepoLoaderMain.open(path).
  }

  close() {
    this.dispatch(resetRepoPath());
    this.currentFocusCommit = undefined;
    this.currentAmend = false;
    this.currentFixup = undefined;
  }

  workingSelected(): FileStatus[] {
    const { workingSelected, workingStatus } = this.store.getState().repo;
    return workingStatus?.filter((s) => workingSelected?.indexOf(s.fileName) !== -1) || [];
  }

  indexSelected(): FileStatus[] {
    const { indexSelected, indexStatus } = this.store.getState().repo;
    return indexStatus?.filter((s) => indexSelected?.indexOf(s.fileName) !== -1) || [];
  }

  async discardChanges(files: string[]): Promise<void> {
    await gwitch.discardChanges(files);
  }

  async stageFiles(files: string[]): Promise<void> {
    await gwitch.stageFiles(files);
  }

  async unstageFiles(files: string[]): Promise<void> {
    await gwitch.unstageFiles(files);
  }

  async commit(amend: boolean, fixup: string | undefined, message: string): Promise<void> {
    this.dispatch(setCommitMessage(""));
    this.dispatch(setRepoAmend(false));
    this.dispatch(setRepoFixup(undefined));
    await gwitch.commitRepo(amend, fixup, message);
  }

  async stageRange(files: FileStatus[], start: number, end: number): Promise<void> {
    const [patch, toAdd] = rangePatch(files, { start, end }, true);
    await gwitch.stagePatch(patch, toAdd);
  }

  async unstageRange(files: FileStatus[], start: number, end: number): Promise<void> {
    const [patch] = rangePatch(files, { start, end }, false);
    await gwitch.unstagePatch(patch);
  }

  async discardRange(files: FileStatus[], start: number, end: number): Promise<void> {
    const [patch] = rangePatch(files, { start, end }, false);
    await gwitch.discardPatch(patch);
  }
}
