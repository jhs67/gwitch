import React, { useEffect, useRef } from "react";
import { createUseStyles } from "react-jss";
import { FileStatus } from "../../store/repo/types";
import { useMouseTrack } from "../../hooks/mousetrack";
import { FileDiff } from "./FileDiff";

const useStyles = createUseStyles({
  buttons: {
    position: "absolute",
    right: "17px",
    flexFlow: "row",
    display: "none",
    "&.show": {
      display: "flex",
    },
    "& div": {
      border: "1px solid #7f8db7",
      padding: "0px 2px 1px 2px",
      fontSize: "80%",
      backgroundColor: "#d4ebff",
      borderRadius: "3px",
      color: "#34426b",
      marginLeft: "3px",
      "&:hover": {
        borderColor: "#34426b",
        color: "#131d3a",
      },
    },
  },
  selectScroll: {
    position: "absolute",
    height: "100%",
    width: "100%",
    overflow: "auto",
    padding: 5,
  },
});

export interface SelectRange {
  start: number;
  end: number;
}

export interface LineOption {
  label: string;
  act: (r: SelectRange) => void;
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
  const buttonsRef = useRef<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>();
  const lineRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const selectRef = useRef<SelectRange | undefined>();

  const setLineUnselected = (n: number) => {
    if (lineRefs.current[n]) lineRefs.current[n].classList.remove("selected");
  };

  const setLineSelected = (n: number) => {
    if (lineRefs.current[n]) lineRefs.current[n].classList.add("selected");
  };

  const showButtons = () => {
    buttonsRef.current && buttonsRef.current.classList.add("show");
  };

  const hideButtons = () => {
    buttonsRef.current && buttonsRef.current.classList.remove("show");
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
  };

  if (!diffLimit) diffLimit = 200;
  if (!addLimit) addLimit = 50;

  if (lastPatch.current !== patch) {
    lastPatch.current = patch;
    if (selectRef.current != null) setSelectRange(undefined);
  }

  const getLine = function (e: HTMLElement): number {
    if (e.nodeName === "TR") {
      if (e.dataset.line == null) throw new Error("not a diff line");
      return parseInt(e.dataset.line);
    }
    return getLine(e.parentElement);
  };

  const onMove = (ev: MouseEvent) => {
    try {
      const line = getLine(ev.target as HTMLElement);
      setSelectRange({
        start: Math.min(line, anchorRef.current),
        end: Math.max(line, anchorRef.current),
      });
    } catch (err) {
      err;
    }
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
    anchorRef.current = line;
    setSelectRange({ start: line, end: line });
    startTrack();
    hideButtons();
  };

  const positionButtons = () => {
    if (!lines || !buttonsRef.current || !selectRef.current) return;
    const sel = lineRefs.current[selectRef.current.start];
    const top =
      sel.offsetTop +
      sel.parentElement.offsetTop +
      sel.parentElement.parentElement.offsetTop +
      1;
    const eel = lineRefs.current[selectRef.current.end];
    const bot =
      eel.offsetTop +
      eel.parentElement.offsetTop +
      eel.parentElement.parentElement.offsetTop +
      3;
    const ceil = scrollRef.current.scrollTop;
    const set = Math.max(top, Math.min(ceil, bot));
    buttonsRef.current.style.top = `${set}px`;
  };

  useEffect(() => {
    if (selectRef.current) {
      for (let i = 0; i < selectRef.current.start; ++i) setLineUnselected(i);
      for (let i = selectRef.current.start; i <= selectRef.current.end; ++i)
        setLineSelected(i);
      for (let i = selectRef.current.end + 1; i < lineRefs.current.length; ++i)
        setLineUnselected(i);
    } else {
      buttonsRef.current.classList.remove("show");
      for (let i = 0; i < lineRefs.current.length; ++i) setLineUnselected(i);
    }
  });

  let cursor = 0;
  lineRefs.current.length = 0;
  return (
    <div
      ref={scrollRef}
      className={classes.selectScroll}
      onScroll={() => positionButtons()}
    >
      <div>
        {lines ? (
          <div className={classes.buttons} ref={buttonsRef}>
            {lines.map((l) => (
              <div
                key={l.label}
                onClick={() => {
                  l.act(selectRef.current);
                  setSelectRange(undefined);
                  hideButtons();
                }}
              >
                {l.label}
              </div>
            ))}
          </div>
        ) : null}
        {patch.map((p) => {
          const file = p.newFile || p.oldFile;

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
              lineRefs={lineRefs.current}
            />
          );
        })}
      </div>
    </div>
  );
}
