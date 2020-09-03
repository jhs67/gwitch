import React, { useState } from "react";
import { remote, MenuItemConstructorOptions } from "electron";
import classNames from "classnames";
import { SelectList, ItemProps } from "../SelectList";
import { FileStatus } from "../../store/repo/types";

interface FilesViewProps {
  header: string;
  files: FileStatus[];
  selected: number[];
  menu?: MenuItemConstructorOptions[];
  setSelected: (s: number[]) => void;
  onDoubleClick?: (ev: MouseEvent) => void;
}

function FileItem({ item, selected, focused }: ItemProps<FileStatus>) {
  return (
    <div
      className={classNames("fileItem", `status${item.status}`, {
        unmerged: item.unmerged,
        selected,
        focused,
      })}
    >
      <svg viewBox="0 0 14 14">
        <path d="M 3,1 l 0,12 8,0 0,-7 -5,0 0,-5 z"></path>
        <path className="flap" d="M 6,1 l 1,0 4,4 0,1 -5,0 z"></path>
      </svg>
      {item.newFile || item.oldFile}
    </div>
  );
}

export function FilesView({
  header,
  files,
  selected,
  setSelected,
  menu,
  onDoubleClick,
}: FilesViewProps) {
  const [focused, setFocused] = useState<number | undefined>();

  function onContext() {
    if (menu)
      remote.Menu.buildFromTemplate(menu).popup({ window: remote.getCurrentWindow() });
  }

  return (
    <div className="fileView">
      <div className="fileHeader">{header}</div>
      <SelectList<FileStatus>
        items={files}
        selected={selected}
        focused={focused}
        itemComponent={FileItem}
        itemKey={(i) => i.newFile || i.oldFile}
        setSelected={setSelected}
        setFocused={setFocused}
        onContext={onContext}
        onDoubleClick={onDoubleClick}
        rootClass="fileList"
      />
    </div>
  );
}
