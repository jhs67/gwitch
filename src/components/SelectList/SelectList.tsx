import React, { KeyboardEvent, FunctionComponent } from "react";

export interface ItemProps<T> {
  item: T;
  index: number;
  selected: boolean;
  focused: boolean;
}

export type ItemComponent<T> = FunctionComponent<ItemProps<T>>;

export interface SelectListProps<T> {
  items: T[];
  selected: number[];
  focused: number | undefined;
  itemComponent?: ItemComponent<T>;
  itemKey?: (t: T, i: number) => string;
  setSelected: (s: number[]) => void;
  setFocused: (f: number | undefined) => void;
  onContext?: (ev: MouseEvent) => void;
  onDoubleClick?: (ev: MouseEvent) => void;
  rootClass?: string;
  itemClass?: string;
}

const KeyCode = {
  UP: 38,
  DOWN: 40,
  ENTER: 13,
  SPACE: 32,
};

export function SelectList<T>(props: SelectListProps<T>) {
  const {
    items,
    selected,
    focused,
    rootClass,
    itemClass,
    setSelected,
    setFocused,
    onContext,
    onDoubleClick,
    itemComponent,
    itemKey,
  } = props;

  function lowerBound(i: number, c: number[]) {
    let n = 0;
    let count = c.length;
    while (count > 0) {
      const s = count >> 1;
      const t = n + s;
      if (c[t] < i) {
        n = t + 1;
        count -= s + 1;
      } else {
        count = s;
      }
    }
    return n;
  }

  function isSelected(i: number, s = selected) {
    return s[lowerBound(i, s)] === i;
  }

  function addSelected(i: number, s: number[], l?: number) {
    if (l === undefined) l = lowerBound(i, s);
    if (s[l] !== i) s.splice(l, 0, i);
    return s;
  }

  function rmSelected(i: number, s: number[], l?: number) {
    if (l === undefined) l = lowerBound(i, s);
    if (s[l] === i) s.splice(l, 1);
    return s;
  }

  function selectRange(focused: number, s: number[]) {
    let rl = focused;
    for (let l = lowerBound(focused, s); rl === s[l] && rl - 1 === s[l - 1]; --rl, --l);
    let rh = focused;
    for (let l = lowerBound(focused, s); rh === s[l] && rh + 1 === s[l + 1]; ++rh, ++l);
    return [rl, rh];
  }

  function focusItem(index: number, shift: boolean, ctrl: boolean) {
    if (shift && focused !== undefined) {
      // calculate the new selection set
      const s = [...selected];

      // find the selected range around the focused item
      const [rl, rh] = selectRange(focused, s);

      // find the new range to be selected
      const [nl, nh] = index < focused ? [index, focused] : [focused, index];

      // clear the part before
      for (let l = rl; l < nl; ++l) rmSelected(l, s);
      // set the range
      for (let l = nl; l <= nh; ++l) addSelected(l, s);
      // clear the range after
      for (let l = nh + 1; l <= rh; ++l) rmSelected(l, s);

      setSelected(s);
    } else if (ctrl) {
      setFocused(index);
      const l = lowerBound(index, selected);
      if (selected[l] !== index) setSelected(addSelected(index, [...selected], l));
      else setSelected(rmSelected(index, [...selected], l));
    } else {
      setFocused(index);
      setSelected([index]);
    }
  }

  function contextItem(index: number) {
    if (isSelected(index, selected)) return;
    setFocused(index);
    setSelected([index]);
  }

  function onKeyDown(event: KeyboardEvent) {
    switch (event.keyCode) {
      case KeyCode.DOWN:
        {
          // find the selected range around the focused item
          const [rl, rh] = selectRange(focused, selected);
          if (rl < focused) setSelected(rmSelected(rl, [...selected]));
          else if (rh + 1 < items.length) setSelected(addSelected(rh + 1, [...selected]));
          event.preventDefault();
        }
        break;
      case KeyCode.UP:
        {
          // find the selected range around the focused item
          const [rl, rh] = selectRange(focused, selected);
          if (rh > focused) setSelected(rmSelected(rh, [...selected]));
          else if (rl > 0) setSelected(addSelected(rl - 1, [...selected]));
          event.preventDefault();
        }
        break;
      case KeyCode.SPACE:
      case KeyCode.ENTER:
        if (focused !== undefined) focusItem(focused, false, true);
        event.preventDefault();
        break;
    }
  }

  function clearSelected() {
    setFocused(undefined);
    setSelected([]);
  }

  return (
    <div
      className={rootClass}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onClick={() => {
        clearSelected();
      }}
    >
      {items.map((t, i) => {
        const s = isSelected(i);
        const f = focused === i;
        return (
          <div
            className={itemClass}
            key={itemKey(t, i)}
            onClick={(event) => {
              focusItem(i, event.shiftKey, event.ctrlKey);
              event.stopPropagation();
            }}
            onContextMenu={(ev) => {
              contextItem(i);
              onContext && onContext(ev.nativeEvent);
            }}
            onDoubleClick={(ev) => {
              contextItem(i);
              onDoubleClick && onDoubleClick(ev.nativeEvent);
            }}
          >
            {itemComponent({ item: t, index: i, selected: s, focused: f })}
          </div>
        );
      })}
    </div>
  );
}

SelectList.defaultProps = {
  itemComponent: ({ item }: ItemProps<unknown>) =>
    React.isValidElement(item) ? item : "" + item,
  itemKey: (_: unknown, n: number) => n.toString(),
};
