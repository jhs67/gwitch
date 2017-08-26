"use strict";

let assert = require('assert');

exports.createGraph = createGraph;
function createGraph(byId, heads) {
	var byOrder = [];
	var concat = [].concat, search = 0;
	function getTip(c) {
		if (c.index !== -1 || c.search === search)
			return [];
		for (;;) {
			c.search = search;
			if (c.children.length === 0)
				return c;
			if (c.children.length > 1) {
				let t = getTips(c.children);
				return t.length === 0 ? c : t;
			}
			let k = c.children[0];
			if (k.index !== -1 || k.search === search)
				return c;
			c = k;
		}
	}
	function getTips(o) { return concat.apply([], o.map(getTip)); }

	function idToRecord(id) { return byId.get(id); }
	function ordering(l, r) { return l.commit.authorStamp < r.commit.authorStamp; }
	function reverseOrdering(l, r) { return !ordering(l, r); }
	function addHead(c) { heads.unshift(c); }

	heads.sort(ordering);
	while (heads.length > 0) {
		let c = heads.shift();
		if (c.index !== -1) continue;

		search += 1;
		var tips = getTips(c.children);
		if (tips.length !== 0) {
			heads.unshift(c);
			tips.sort(reverseOrdering).forEach(addHead);
		}
		else {
			c.index = byOrder.length;
			byOrder.push(c);
			c.parents = c.commit.parents.map(idToRecord).sort(reverseOrdering);
			c.parents.forEach(addHead);
		}
	}

	function chooseStrandParent(c) {
		return c.parents.reduce(function(p, k) {
			return p || graphDepth(k.graph) !== -1 ? p : k;
		}, null);
	}

	function isPassable(g) {
		/*jslint bitwise: true */
		return !(g & 125);
	}

	function isPassDown(g) {
		/*jslint bitwise: true */
		return !(g & (64 + 32 + 1)) && (g & (8 + 16 + 4));
	}

	function isPassUp(g) {
		/*jslint bitwise: true */
		return !(g & (64 + 16 + 4)) && (g & (8 + 32 + 1));
	}

	function canBranchOff(g) {
		/*jslint bitwise: true */
		return (g & 64) || !(g & 8);
	}

	function isPassableLane(s, e, depth) {
		let i = s.index, j = e.index;
		if (i <= j && canBranchOff(byOrder[i].graph[depth])) {
			i += 1;
			while (i <= j && isPassDown(byOrder[i].graph[depth]))
				i += 1;
		}
		if (i <= j && canBranchOff(byOrder[j].graph[depth])) {
			j -= 1;
			while (i <= j && isPassUp(byOrder[j].graph[depth]))
				j -= 1;
		}
		while (i <= j) {
			if (!isPassable(byOrder[i].graph[depth]))
				return false;
			i += 1;
		}
		return true;
	}

	function findPassableLane(s, e, depth) {
		/*jslint bitwise: true */
		for (let d = depth; d >= 0; d -= 1)
			if (isPassableLane(s, e, d))
				return d;
		for (let d = depth + 1; ; d += 1)
			if (isPassableLane(s, e, d))
				return d;
	}

	function isStrandDepthOk(strand, depth) {
		for (let i = 0; i < strand.length; i += 1) {
			let c = strand[i];
			if (c.graph[depth])
				return false;
			if (i + 1 < strand.length && !isPassableLane(c, strand[i + 1], depth))
				return false;
		}
		return true;
	}

	function getStrandDepth(c, strand) {
		while (c) {
			strand.push(c);
			c = chooseStrandParent(c);
		}

		for (let depth = 0; ; depth += 1) {
			if (isStrandDepthOk(strand, depth))
				return depth;
		}
	}

	function branchUp(graph, from, to) {
		/*jslint bitwise: true */
		if (from < to) {
			graph[to] |= 4;
			graph[from] |= 4;
			for (let i = from + 1; i < to; i += 1)
				graph[i] |= 2;
		}
		else if (from > to) {
			graph[to] |= 16;
			graph[from] |= 2;
			for (let i = to + 1; i < from; i += 1)
				graph[i] |= 2;
		}
		else {
			graph[from] |= 1;
		}
	}

	function branchDown(graph, from, to) {
		/*jslint bitwise: true */
		if (from < to) {
			graph[to] |= 1;
			graph[from] |= 4;
			for (let i = from + 1; i < to; i += 1)
				graph[i] |= 2;
		}
		else if (from > to) {
			graph[to] |= 32;
			graph[from] |= 2;
			for (let i = to + 1; i < from; i += 1)
				graph[i] |= 2;
		}
		else {
			graph[from] |= 8;
		}
	}

	function setStrandDepth(strand, depth) {
		/*jslint bitwise: true */

		// Set the dots.
		strand.forEach(function(p) { assert(!p.graph[depth]); p.graph[depth] = 64; });

		strand.forEach(function(p) {
			// Draw a connection to each child.
			for (let j in p.children) {
				let k = p.children[j];
				let kdepth = graphDepth(k.graph);
				if (kdepth === -1)
					continue;

				let ldepth = findPassableLane(k, p, depth);
				branchDown(k.graph, kdepth, ldepth);
				branchUp(p.graph, depth, ldepth);
				for (let i = k.index + 1; i < p.index; i += 1)
					byOrder[i].graph[ldepth] |= 8;
			}

			// Draw a connection to each parent.
			for (let j in p.parents) {
				let k = p.parents[j];
				let kdepth = graphDepth(k.graph);
				if (kdepth === -1)
					continue;

				let ldepth = findPassableLane(p, k, depth);
				branchDown(p.graph, depth, ldepth);
				branchUp(k.graph, kdepth, ldepth);
				for (let i = p.index + 1; i < k.index; i += 1)
					byOrder[i].graph[ldepth] |= 8;
			}
		});
	}

	function graphDepth(g) {
		/*jslint bitwise: true */
		return g.reduce(function(p, n, i) { return (n & 64) ? i : p; }, -1);
	}

	byOrder.forEach(function(c) {
		var depth = graphDepth(c.graph), strand = [];
		if (depth !== -1) return;
		depth = getStrandDepth(c, strand);
		setStrandDepth(strand, depth);
	});

	byOrder.forEach(function(c) {
		var g = c.graph, j;
		for (j = 0; j < g.length; j += 1)
			g[j] = g[j] || 0;
	});

	return byOrder;
}
