import { useState } from "react";
import { createUseStyles } from "react-jss";
import { FileTreeNode } from "@renderer/repo/file_tree";
import { GwitchTheme } from "@renderer/theme/theme";

const useStyles = createUseStyles((theme: GwitchTheme) => ({
  tree: {
    position: "absolute",
    height: "100%",
    width: "100%",
    overflow: "auto",
    userSelect: "none",
  },
  altRow: {
    backgroundColor: theme.colors.backAlt,
  },
  node: {
    cursor: "pointer",
    padding: "2px 4px",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    "&:hover": {
      backgroundColor: theme.colors.softHighlight,
    },
  },
  selected: {
    backgroundColor: `${theme.colors.commitFocus.background} !important`,
    color: theme.colors.commitFocus.primary,
  },
  arrow: {
    display: "inline-block",
    width: "1em",
    flex: "0 0 auto",
    textAlign: "center",
    fontStyle: "normal",
  },
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontFamily: theme.typography.monospaceFace,
    fontSize: "11px",
  },
}));

interface FlatNode {
  node: FileTreeNode;
  depth: number;
}

function flattenVisible(nodes: FileTreeNode[], depth: number, expanded: Set<string>): FlatNode[] {
  const result: FlatNode[] = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.children && expanded.has(node.path)) {
      result.push(...flattenVisible(node.children, depth + 1, expanded));
    }
  }
  return result;
}

export function FileTree({
  nodes,
  selected,
  onSelect,
}: {
  nodes: FileTreeNode[];
  selected: string | undefined;
  onSelect: (path: string) => void;
}) {
  const classes = useStyles();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const onToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const flat = flattenVisible(nodes, 0, expanded);

  return (
    <div className={classes.tree}>
      {flat.map(({ node, depth }, index) => {
        const isDir = !!node.children;
        const isExpanded = isDir && expanded.has(node.path);
        const isSelected = !isDir && node.path === selected;
        return (
          <div
            key={node.path}
            className={`${classes.node} ${index % 2 === 1 ? classes.altRow : ""} ${isSelected ? classes.selected : ""}`}
            style={{ paddingLeft: `${4 + depth * 14}px` }}
            onClick={() => (isDir ? onToggle(node.path) : onSelect(node.path))}
          >
            <span className={classes.arrow}>{isDir ? (isExpanded ? "▾" : "▸") : " "}</span>
            <span className={classes.name}>{node.name}</span>
          </div>
        );
      })}
    </div>
  );
}
