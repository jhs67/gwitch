import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Allotment } from "allotment";
import { RootState } from "@renderer/store";
import { buildFileTree, FileTreeNode } from "@renderer/repo/file_tree";
import { FileTree } from "./FileTree";
import { FileContent } from "./FileContent";

export function CommitFiles({
  selectedPath,
  onSelectPath,
  svgTextMode,
}: {
  selectedPath: string | undefined;
  onSelectPath: (path: string | undefined) => void;
  svgTextMode: boolean;
}) {
  const focusCommit = useSelector((state: RootState) => state.repo.focusCommit);
  const [data, setData] = useState<{ hash: string; nodes: FileTreeNode[] } | null>(null);

  useEffect(() => {
    if (!focusCommit) return;
    gwitch.getCommitTree(focusCommit).then((paths) => {
      setData({ hash: focusCommit, nodes: buildFileTree(paths) });
      onSelectPath(undefined);
    });
  }, [focusCommit, onSelectPath]);

  const nodes = data !== null && data.hash === focusCommit ? data.nodes : [];

  return (
    <Allotment>
      <Allotment.Pane minSize={120} preferredSize={220}>
        <FileTree nodes={nodes} selected={selectedPath} onSelect={onSelectPath} />
      </Allotment.Pane>
      <Allotment.Pane>
        <FileContent hash={focusCommit} path={selectedPath} svgTextMode={svgTextMode} />
      </Allotment.Pane>
    </Allotment>
  );
}
