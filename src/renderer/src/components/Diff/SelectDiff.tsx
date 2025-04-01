import { createUseStyles } from "react-jss";
import { FileStatus } from "@renderer/store/repo/types";
import { useMouseTrack } from "@renderer/hooks/mousetrack";
import { FileDiff } from "./FileDiff";
import { GwitchTheme } from "@renderer/theme/theme";
import { useEffect, useRef } from "react";

const useStyles = createUseStyles((theme: GwitchTheme) => ({
  buttons: {
    position: "absolute",
    right: "17px",
    flexFlow: "row",
    display: "none",
    "&.show": {
      display: "flex",
    },
    "&.show.pending": {
      display: "none",
    },
    "& div": {
      border: `1px solid ${theme.colors.diff.buttons.border}`,
      padding: "0px 2px 1px 2px",
      fontSize: "80%",
      backgroundColor: theme.colors.diff.buttons.background,
      borderRadius: "3px",
      color: theme.colors.diff.buttons.primary,
      marginLeft: "3px",
      "&:hover": {
        borderColor: theme.colors.diff.buttons.hover.border,
        color: theme.colors.diff.buttons.hover.primary,
      },
    },
  },
  selectScroll: {
    position: "absolute",
    height: "100%",
    width: "100%",
    overflow: "auto",
    padding: 5,

    "&.selected .hunk .buttons": {
      display: "none",
    },

    "&.pending .hunk .buttons": {
      display: "none",
    },
  },
}));

export interface SelectRange {
  start: number;
  end: number;
}

export interface LineOption {
  label: string;
  act: (r: SelectRange) => Promise<void>;
}

export function SelectDiff({
  patch,
  diffLimit,
  addLimit,
  setShow,
  show,
  lines,
}: {
  patch: FileStatus[];
  diffLimit?: number;
  addLimit?: number;
  setShow: (file: string, state: boolean) => void;
  show: { [source: string]: boolean };
  lines?: LineOption[];
}) {
  const classes = useStyles();
  const lastPatch = useRef<FileStatus[]>();
  const anchorRef = useRef<number | undefined>();
  const buttonsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const selectRef = useRef<SelectRange | undefined>();

  const setLineUnselected = (n: number) => {
    lineRefs.current[n]?.classList.remove("selected");
  };

  const setLineSelected = (n: number) => {
    lineRefs.current[n]?.classList.add("selected");
  };

  const showButtons = () => {
    buttonsRef.current?.classList.add("show");
  };

  const hideButtons = () => {
    buttonsRef.current?.classList.remove("show");
  };

  const setSelectRange = (r: SelectRange | undefined) => {
    const c = selectRef.current;
    if (r != null && c != null) {
      const bs = c.start,
        be = Math.min(c.end, r.start - 1);
      for (let i = bs; i <= be; ++i) setLineUnselected(i);
      const ms = r.start,
        me = Math.min(r.end, c.start - 1);
      for (let i = ms; i <= me; ++i) setLineSelected(i);
      const ns = Math.max(r.start, c.end + 1),
        ne = r.end;
      for (let i = ns; i <= ne; ++i) setLineSelected(i);
      const es = Math.max(c.start, r.end + 1),
        ee = c.end;
      for (let i = es; i <= ee; ++i) setLineUnselected(i);
    } else if (r != null) {
      const ms = r.start,
        me = r.end;
      for (let i = ms; i <= me; ++i) setLineSelected(i);
    } else if (c != null) {
      const ms = c.start,
        me = c.end;
      for (let i = ms; i <= me; ++i) setLineUnselected(i);
    }
    selectRef.current = r;
    if (selectRef.current) scrollRef.current?.classList.add("selected");
    else scrollRef.current?.classList.remove("selected");
  };

  const startAction = async (act: (r: SelectRange) => Promise<void>, range: SelectRange) => {
    buttonsRef.current?.classList.add("pending");
    scrollRef.current?.classList.add("pending");
    setSelectRange(undefined);
    hideButtons();
    try {
      await act(range);
    } finally {
      finishAction();
    }
  };

  const finishAction = () => {
    scrollRef.current?.classList.remove("pending");
    buttonsRef.current?.classList.remove("pending");
  };

  if (!diffLimit) diffLimit = 200;
  if (!addLimit) addLimit = 50;

  if (lastPatch.current !== patch) {
    lastPatch.current = patch;
    if (selectRef.current != null) setSelectRange(undefined);
  }

  const getLine = function (e: HTMLElement): number | undefined {
    if (e === scrollRef.current) return;
    if (e.nodeName !== "TR") return getLine(e.parentElement!);
    const r = parseInt(e.dataset.line!);
    return isNaN(r) ? undefined : r;
  };

  const onMove = (ev: MouseEvent) => {
    const line = getLine(ev.target as HTMLElement);
    if (line == null) return;
    setSelectRange({
      start: Math.min(line, anchorRef.current!),
      end: Math.max(line, anchorRef.current!),
    });
  };

  const onUp = () => {
    if (selectRef.current) {
      showButtons();
      positionButtons();
    }
  };

  const [startTrack] = useMouseTrack(onMove, onUp);

  const clickStart = (ev: MouseEvent) => {
    const line = getLine(ev.target as HTMLElement);
    if (line == null) {
      setSelectRange(undefined);
      hideButtons();
      return;
    }
    anchorRef.current = line;
    setSelectRange({ start: line, end: line });
    startTrack();
    hideButtons();
  };

  const positionButtons = () => {
    if (!lines || !buttonsRef.current || !selectRef.current) return;
    const sel = lineRefs.current[selectRef.current.start];
    const top =
      sel!.offsetTop +
      sel!.parentElement!.offsetTop +
      sel!.parentElement!.parentElement!.offsetTop +
      1;
    const eel = lineRefs.current[selectRef.current.end];
    const bot =
      eel!.offsetTop +
      eel!.parentElement!.offsetTop +
      eel!.parentElement!.parentElement!.offsetTop +
      3;
    const ceil = scrollRef.current!.scrollTop;
    const set = Math.max(top, Math.min(ceil, bot));
    buttonsRef.current.style.top = `${set}px`;
  };

  useEffect(() => {
    if (selectRef.current) {
      for (let i = 0; i < selectRef.current.start; ++i) setLineUnselected(i);
      for (let i = selectRef.current.start; i <= selectRef.current.end; ++i) setLineSelected(i);
      for (let i = selectRef.current.end + 1; i < lineRefs.current.length; ++i)
        setLineUnselected(i);
    } else {
      buttonsRef.current?.classList.remove("show");
      for (let i = 0; i < lineRefs.current.length; ++i) setLineUnselected(i);
    }
  });

  let cursor = 0;
  lineRefs.current.length = 0;
  return (
    <div ref={scrollRef} className={classes.selectScroll} onScroll={() => positionButtons()}>
      <div>
        {lines ? (
          <div className={classes.buttons} ref={buttonsRef}>
            {lines.map((l) => (
              <div key={l.label} onClick={async () => startAction(l.act, selectRef.current!)}>
                {l.label}
              </div>
            ))}
          </div>
        ) : null}
        {patch.map((p) => {
          const file = p.fileName;

          const origin = cursor;
          cursor += (p.hunks || []).reduce((p, h) => p + h.lines.length, 0);

          return (
            <FileDiff
              patch={p}
              diffLimit={diffLimit}
              addLimit={addLimit}
              show={show[file]}
              setShow={(state: boolean) => setShow(file, state)}
              key={file}
              origin={origin}
              clickLine={clickStart}
              actions={
                lines &&
                lines.map((l) => ({
                  ...l,
                  act: async (range) => startAction(l.act, range),
                }))
              }
              lineRefs={lineRefs.current}
            />
          );
        })}
      </div>
    </div>
  );
}
