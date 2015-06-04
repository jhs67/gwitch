"use strict";

// Set's up require hook to handle hbs files
require("handlebars");

var $ = require('jquery');
var Backbone = require("backbone");

var path = require("path");
var NodeGit = require('nodegit');

var DiffView = require("./DiffView");
var HistoryView = require("./HistoryView");
var RefsView = require("./RefsView");
var SplitterView = require("./SplitterView");


var BranchModel = Backbone.Model.extend({
});

var BranchCollection = Backbone.Collection.extend({
	model: BranchModel,
});

var CommitModel = Backbone.Model.extend({
});

var CommitCollection = Backbone.Collection.extend({
	model: CommitModel,
});

var WorkingCopyModel = Backbone.Model.extend({
});

var RepoSettingsModel = Backbone.Model.extend({
});

var app = module.exports;

app.repo = null;
app.commits = new CommitCollection();
app.branches = new BranchCollection();
app.workingCopy = new WorkingCopyModel();
app.repoSettings = new RepoSettingsModel();

function localBranchName(branch) {
	if (branch.substr(0, "refs/heads/".length) == "refs/heads/")
		return branch.substr("refs/heads/".length);
	return branch;
}

function getCommits(repo, refs) {
	var byOrder = [];
	var byId = new Map();

	return Promise.all(refs.map(function(r) {
		return repo.getReferenceCommit(r).then(function(commit) {
			var id = commit.id().tostrS();
			var d = { commit: commit, id: id, children: [], search: 0, index: -1, graph: [] };
			byId.set(id, d);
			return d;
		});
	})).then(function(heads) {
		return Promise.all(heads.map(getParents)).then(function() { return heads; });

		function getParents(c) {
			return Promise.all(c.commit.parents().map(function(oid) {
				var id = oid.tostrS();
				var d = byId.get(id);
				if (d) {
					d.children.push(c);
					return;
				}

				d = { commit: null, id: id, children: [ c ], search: 0, index: -1, graph: [] };
				byId.set(id, d);
				return repo.getCommit(oid).then(function(commit) {
					d.commit = commit;
					return getParents(d);
				});
			}));
		}
	}).then(function(heads) {
		var concat = [].concat, search = 0;
		function getTip(c) {
			if (c.index !== -1 || c.search === search)
				return [];
			c.search = search;
			var t = getTips(c.children);
			return t.length !== 0 ? t : c;
		}
		function getTips(o) { return concat.apply([], o.map(getTip)); }

		function oidToRecord(oid) { return byId.get(oid.tostrS()); }
		function ordering(l, r) { return l.commit.timeMs() < r.commit.timeMs(); }
		function reverseOrdering(l, r) { return !ordering(l, r); }
		function addHead(c) { heads.unshift(c); }

		heads.sort(ordering);
		while (heads.length > 0) {
			var c = heads.shift();
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
				c.parents = c.commit.parents().map(oidToRecord).sort(reverseOrdering);
				c.parents.forEach(addHead);
			}
		}

		function chooseStrandParent(c) {
			return c.commit.parents().map(oidToRecord).reduce(function(p, k) {
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

		function getStrandDepth(c, strand) {
			var p, depth = 0;

			while ((p = c)) {
				strand.push(p);
				for (let i in p.children) {
					let k = p.children[i];
					if (graphDepth(k.graph) !== -1)
						depth = findPassableLane(k, p, depth);
				}

				var parents = p.commit.parents();
				for (let i in parents) {
					let k = oidToRecord(parents[i]);
					if (graphDepth(k.graph) !== -1)
						depth = findPassableLane(p, k, depth);
				}

				c = chooseStrandParent(p);
				if (c) depth = findPassableLane(p, c, depth);
			}

			return depth;
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
			strand.forEach(function(p) { p.graph[depth] = 64; });

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
				let parents = p.commit.parents();
				for (let j in parents) {
					let k = oidToRecord(parents[j]);
					let kdepth = graphDepth(k.graph);
					if (kdepth === -1)
						continue;

					let ldepth = findPassableLane(p, k, depth);
					branchDown(p.graph, depth, ldepth);
					branchUp(k.graph, kdepth, ldepth);
					for (let i = p.index + 1; i < k.index; i += 1)
						byOrder[i].graph[ldepth] |= 8;
				}

				c = chooseStrandParent(p);
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
	});
}

app.open = function(file) {
	app.workingCopy.set('name', path.basename(file, ".git"));
	NodeGit.Repository.open(file).then(function(repo) {
		app.repo = repo;
		return Promise.all([
			repo.getReferences(NodeGit.Reference.TYPE.ALL).then(function(refs) {
				var branches = refs.filter(function(ref) { return ref.isBranch(); }).map(function(ref) {
					var name = ref.name();
					return {
						refName: name,
						name: localBranchName(name),
						isRemote: ref.isRemote(),
					};
				});

				app.branches.add(branches);
			}),
			repo.head().then(function(ref) {
				app.workingCopy.set('head', ref.name());
			}),
		]);
	})
	.then(function() {
		return getCommits(app.repo, app.branches.map(function(b) { return b.get('refName'); })).then(function(commits) {
			console.log("commits: " + commits.length);
			app.commits.reset(commits);
		});
	})
	.catch(function(err) {
		console.log("error: " + err);
		console.log("error: " + err.stack);
	});
};

var ClientView = Backbone.View.extend({
	className: 'client-view',

	initialize: function() {
		this.refs = new RefsView();
		this.$el.append(this.refs.el);

		this.history = new HistoryView({ collection: app.commits });
		this.hsplitter = new SplitterView({ top: this.history.$el });
		this.hsplitter.$el.addClass("history-view");
		this.$el.append(this.hsplitter.el);

		this.diff = new DiffView();
		this.dsplitter = new SplitterView({ top: this.diff.$el });
		this.dsplitter.$el.addClass("stage-view");
		this.$el.append(this.dsplitter.el);

		this.branchChange();
		this.listenTo(app.repoSettings, "change:activeBranch", this.branchChange);
	},

	branchChange: function() {
		var b = app.repoSettings.get('activeBranch');
		this.$el.addClass(b ? 'history-mode' : "stage-mode");
		this.$el.removeClass(!b ? 'history-mode' : "stage-mode");
	},

	setSplitter: function() {
		if (this.splitter) {
			this.splitter.remove();
			this.splitter = null;
			this.history = null;
			this.diff = null;
		}

		var b = app.repoSettings.get('activeBranch');
		if (b) {
			this.history = new HistoryView({ collection: app.commits });
			this.splitter = new SplitterView({ top: this.history.$el });
			this.$el.append(this.splitter.el);
		}
		else {
			this.diff = new DiffView();
			this.splitter = new SplitterView({ top: this.diff.$el });
			this.$el.append(this.splitter.el);
		}
	},

	render: function(mode, f) {
		var self = this;

		var g = path.dirname(__dirname);
		NodeGit.Repository.open(g).then(function(repo) {
			return NodeGit.Diff.indexToWorkdir(repo, null, null);
		}).then(function(diff) {
			self.diff.model = diff;
			self.diff.render();
		}, function(err) {
			console.log("haa...");
			self.$el.text(err.message);
		});
	}
});

addEventListener('load', function() {
	app.open(path.resolve(path.join(__dirname, "..", "..", "tucheze")));
//	app.open("/Old/home/jon/loudcrow/crowsnest");
	var c = new ClientView({});
	$('#container').append(c.$el);
});
