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
  const [data, setData] = useState<{
    hash: string;
    nodes: FileTreeNode[];
    submodules: Map<string, string>;
  } | null>(null);

  useEffect(() => {
    if (!focusCommit) return;
    gwitch.getCommitTree(focusCommit).then((entries) => {
      const submodules = new Map<string, string>();
      const paths: string[] = [];
      for (const entry of entries) {
        paths.push(entry.path);
        if (entry.submoduleHash) submodules.set(entry.path, entry.submoduleHash);
      }
      setData({ hash: focusCommit, nodes: buildFileTree(paths), submodules });
      onSelectPath(undefined);
    });
  }, [focusCommit, onSelectPath]);

  const current = data !== null && data.hash === focusCommit ? data : null;
  const nodes = current?.nodes ?? [];
  const submoduleHash = selectedPath ? current?.submodules.get(selectedPath) : undefined;

  return (
    <Allotment>
      <Allotment.Pane minSize={120} preferredSize={220}>
        <FileTree nodes={nodes} selected={selectedPath} onSelect={onSelectPath} />
      </Allotment.Pane>
      <Allotment.Pane>
        <FileContent
          hash={focusCommit}
          path={selectedPath}
          svgTextMode={svgTextMode}
          submoduleHash={submoduleHash}
        />
      </Allotment.Pane>
    </Allotment>
  );
}
