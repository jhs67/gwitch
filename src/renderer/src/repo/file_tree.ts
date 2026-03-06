export interface FileTreeNode {
  name: string;
  // Full repo-relative path for leaf nodes; directory path prefix for directory nodes.
  path: string;
  children?: FileTreeNode[];
}

export function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const filePath of paths) {
    const parts = filePath.split("/");
    let nodes = root;
    let prefix = "";

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      prefix = prefix ? `${prefix}/${name}` : name;
      const isLeaf = i === parts.length - 1;

      let node = nodes.find((n) => n.name === name);
      if (!node) {
        node = isLeaf ? { name, path: filePath } : { name, path: prefix, children: [] };
        nodes.push(node);
      }

      if (!isLeaf) {
        nodes = node.children!;
      }
    }
  }

  return root;
}
