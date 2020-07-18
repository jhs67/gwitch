/* eslint-disable @typescript-eslint/no-use-before-define */
import { Commit } from "../store/repo/types";

export interface GraphCommit {
  commit: Commit;
  parents?: GraphCommit[];
  children: GraphCommit[];
  search: number;
  index: number;
}

export function createGraph(log: Commit[], heads: string[]): Commit[] {
  let search = 0;
  const byOrder: GraphCommit[] = [];
  const byHash = new Map<string, GraphCommit>(
    log.map((commit) => {
      return [
        commit.hash,
        {
          commit,
          children: [],
          search: 0,
          index: -1,
        },
      ];
    }),
  );
  log.forEach((commit) => {
    const c = byHash.get(commit.hash);
    commit.parents.forEach((hash) => {
      const d = byHash.get(hash);
      d.children.push(c);
      d.commit.children.push(commit.hash);
    });
  });

  function getTip(c: GraphCommit): GraphCommit | GraphCommit[] {
    if (c.index !== -1 || c.search === search) return [];
    for (;;) {
      c.search = search;
      if (c.children.length === 0) return c;
      if (c.children.length > 1) {
        const t = getTips(c.children);
        return t.length === 0 ? c : t;
      }
      const k = c.children[0];
      if (k.index !== -1 || k.search === search) return c;
      c = k;
    }
  }

  function getTips(o: GraphCommit[]): GraphCommit[] {
    return [].concat(...o.map(getTip));
  }

  function ordering(l: GraphCommit, r: GraphCommit) {
    return r.commit.authorStamp - l.commit.authorStamp;
  }

  function reverseOrdering(l: GraphCommit, r: GraphCommit) {
    return -ordering(l, r);
  }

  const headCommits = heads.map((r) => byHash.get(r)).sort(ordering);
  headCommits.sort(ordering);
  while (headCommits.length > 0) {
    const c = headCommits.shift();
    if (c.index !== -1) continue;

    search += 1;
    const tips = getTips(c.children);
    if (tips.length !== 0) {
      headCommits.unshift(c);
      tips.sort(reverseOrdering).forEach((c) => headCommits.unshift(c));
    } else {
      c.index = byOrder.length;
      byOrder.push(c);
      c.parents = c.commit.parents.map((hash) => byHash.get(hash)).sort(reverseOrdering);
      c.parents.forEach((c) => headCommits.unshift(c));
    }
  }

  function chooseStrandParent(c: GraphCommit) {
    return c.parents.reduce((p, k) => {
      return p || graphDepth(k.commit.graph) !== -1 ? p : k;
    }, null);
  }

  function isPassable(g: number) {
    return !(g & 125);
  }

  function isPassDown(g: number) {
    return !(g & (64 + 32 + 1)) && g & (8 + 16 + 4);
  }

  function isPassUp(g: number) {
    return !(g & (64 + 16 + 4)) && g & (8 + 32 + 1);
  }

  function canBranchOff(g: number) {
    return g & 64 || !(g & 8);
  }

  function isPassableLane(s: GraphCommit, e: GraphCommit, depth: number) {
    let i = s.index,
      j = e.index;
    if (i <= j && canBranchOff(byOrder[i].commit.graph[depth])) {
      i += 1;
      while (i <= j && isPassDown(byOrder[i].commit.graph[depth])) i += 1;
    }
    if (i <= j && canBranchOff(byOrder[j].commit.graph[depth])) {
      j -= 1;
      while (i <= j && isPassUp(byOrder[j].commit.graph[depth])) j -= 1;
    }
    while (i <= j) {
      if (!isPassable(byOrder[i].commit.graph[depth])) return false;
      i += 1;
    }
    return true;
  }

  function findPassableLane(s: GraphCommit, e: GraphCommit, depth: number) {
    for (let d = depth; d >= 0; d -= 1) if (isPassableLane(s, e, d)) return d;
    for (let d = depth + 1; ; d += 1) if (isPassableLane(s, e, d)) return d;
  }

  function isStrandDepthOk(strand: GraphCommit[], depth: number) {
    for (let i = 0; i < strand.length; i += 1) {
      const c = strand[i];
      if (c.commit.graph[depth]) return false;
      if (i + 1 < strand.length && !isPassableLane(c, strand[i + 1], depth)) return false;
    }
    return true;
  }

  function getStrandDepth(c: GraphCommit, strand: GraphCommit[]) {
    while (c) {
      strand.push(c);
      c = chooseStrandParent(c);
    }

    for (let depth = 0; ; depth += 1) {
      if (isStrandDepthOk(strand, depth)) return depth;
    }
  }

  function branchUp(graph: number[], from: number, to: number) {
    if (from < to) {
      graph[to] |= 4;
      graph[from] |= 4;
      for (let i = from + 1; i < to; i += 1) graph[i] |= 2;
    } else if (from > to) {
      graph[to] |= 16;
      graph[from] |= 2;
      for (let i = to + 1; i < from; i += 1) graph[i] |= 2;
    } else {
      graph[from] |= 1;
    }
  }

  function branchDown(graph: number[], from: number, to: number) {
    if (from < to) {
      graph[to] |= 1;
      graph[from] |= 4;
      for (let i = from + 1; i < to; i += 1) graph[i] |= 2;
    } else if (from > to) {
      graph[to] |= 32;
      graph[from] |= 2;
      for (let i = to + 1; i < from; i += 1) graph[i] |= 2;
    } else {
      graph[from] |= 8;
    }
  }

  function setStrandDepth(strand: GraphCommit[], depth: number) {
    // Set the dots.
    strand.forEach((p) => {
      //assert(!p.commit.graph[depth]);
      p.commit.graph[depth] = 64;
    });

    strand.forEach((p) => {
      // Draw a connection to each child.
      for (const j in p.children) {
        const k = p.children[j];
        const kdepth = graphDepth(k.commit.graph);
        if (kdepth === -1) continue;

        const ldepth = findPassableLane(k, p, depth);
        branchDown(k.commit.graph, kdepth, ldepth);
        branchUp(p.commit.graph, depth, ldepth);
        for (let i = k.index + 1; i < p.index; i += 1) byOrder[i].commit.graph[ldepth] |= 8;
      }

      // Draw a connection to each parent.
      for (const j in p.parents) {
        const k = p.parents[j];
        const kdepth = graphDepth(k.commit.graph);
        if (kdepth === -1) continue;

        const ldepth = findPassableLane(p, k, depth);
        branchDown(p.commit.graph, depth, ldepth);
        branchUp(k.commit.graph, kdepth, ldepth);
        for (let i = p.index + 1; i < k.index; i += 1) byOrder[i].commit.graph[ldepth] |= 8;
      }
    });
  }

  function graphDepth(g: number[]) {
    return g.reduce((p, n, i) => {
      return n & 64 ? i : p;
    }, -1);
  }

  byOrder.forEach((c) => {
    let depth = graphDepth(c.commit.graph);
    if (depth !== -1) return;
    const strand: GraphCommit[] = [];
    depth = getStrandDepth(c, strand);
    setStrandDepth(strand, depth);
  });

  byOrder.forEach((c) => {
    const g = c.commit.graph;
    for (let j = 0; j < g.length; j += 1) g[j] = g[j] || 0;
  });

  return byOrder.map((gc) => gc.commit);
}
