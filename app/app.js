"use strict";

// Set's up require hook to handle hbs files
require("handlebars");

var $ = require('jquery');
var Backbone = require("backbone");
var ipc = require('ipc');

var path = require("path");
var NodeGit = require('nodegit');

var DiffView = require("./DiffView");
var HistoryView = require("./HistoryView");
var CommitView = require("./CommitView");
var RefsView = require("./RefsView");
var SplitterView = require("./SplitterView");
var RecentReposView = require("./RecentReposView");
var graph = require('./graph');


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

var PatchModel = Backbone.Model.extend({
});

var PatchCollection = Backbone.Collection.extend({
	model: PatchModel,
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
app.patches = new PatchCollection();
app.focusPatch = new PatchCollection();

app.close = function() {
	app.repo = null;
	app.commits.reset([]);
	app.patches.reset([]);
	app.focusPatch.reset([]);
	app.branches.reset([]);
	app.repoSettings.unset('focusCommit');
	app.repoSettings.unset('activeBranch');
	app.workingCopy.unset('name');
	app.repoSettings.unset('head');
};

function localBranchName(branch) {
	if (branch.substr(0, "refs/heads/".length) == "refs/heads/")
		return branch.substr("refs/heads/".length);
	return branch;
}

function getCommits(repo, refs) {
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
		return graph.createGraph(byId, heads);
	});
}

function loadCommits() {
	return Promise.all([
		app.repo.getReferences(NodeGit.Reference.TYPE.ALL).then(function(refs) {
			var branches = refs.filter(function(ref) { return ref.isBranch(); }).map(function(ref) {
				var name = ref.name();
				return {
					refName: name,
					name: localBranchName(name),
					isRemote: ref.isRemote(),
					target: ref.target,
				};
			});

			app.branches.add(branches);
		}),
		app.repo.head().then(function(ref) {
			app.workingCopy.set('head', ref.name());
		}),
	])
	.then(function() {
		return getCommits(app.repo, app.branches.map(function(b) { return b.get('refName'); })).then(function(commits) {
			app.commits.reset(commits);
			let focusCommit = app.repoSettings.get('focusCommit');
			if (focusCommit && !app.commits.get(focusCommit))
				focusCommit = null;
			if (!focusCommit && app.commits.length > 0)
				focusCommit = app.commits.at(0).id;
			app.repoSettings.set('focusCommit', focusCommit);
		});
	});
}

function loadDiff() {
	return NodeGit.Diff.indexToWorkdir(app.repo, null, null)
	.then(function(diff) {
		app.patches.reset(diff.patches().map(function(p) { return { patch: p }; }));
	});
}

function loadFocusCommit() {
	app.focusPatch.reset([]);
	let focusCommit = app.repoSettings.get('focusCommit');
	let c = app.commits.get(focusCommit);
	if (!c) return;
	let commit = c.get('commit');
	let p = commit.parents();
	if (p.length === 1) {
		commit.getTree().then(function(thisTree) {
			let pc = app.commits.get(p[0].tostrS());
			pc.get('commit').getTree().then(function(parentTree) {
				thisTree.diff(parentTree).then(function(diff) {
					app.focusPatch.reset(diff.patches().map(function(p) { return { patch: p }; }));
				});
			});
		});
	}
}

app.open = function(file) {
	app.workingCopy.set('name', path.basename(file, ".git"));
	NodeGit.Repository.open(file).then(function(repo) {
		app.repo = repo;
		return Promise.all([
			loadCommits(),
			loadDiff(),
		]);
	})
	.catch(function(err) {
		console.log("error: " + err.stack);
	});

	app.repoSettings.on("change:focusCommit", loadFocusCommit);
};

var ClientView = Backbone.View.extend({
	className: 'client-view',

	initialize: function() {
		this.refs = new RefsView();
		this.$el.append(this.refs.el);

		this.commit = new CommitView();
		this.history = new HistoryView({ collection: app.commits });
		this.hsplitter = new SplitterView({ top: this.history.$el, bottom: this.commit.$el });
		this.hsplitter.$el.addClass("history-splitter");
		this.$el.append(this.hsplitter.el);

		this.diff = new DiffView({ collection: app.patches });
		this.dsplitter = new SplitterView({ top: this.diff.$el });
		this.dsplitter.$el.addClass("stage-splitter");
		this.$el.append(this.dsplitter.el);

		this.branchChange();
		this.listenTo(app.repoSettings, "change:activeBranch", this.branchChange);
	},

	branchChange: function() {
		var b = app.repoSettings.get('activeBranch');
		this.$el.addClass(b ? 'history-mode' : "stage-mode");
		this.$el.removeClass(!b ? 'history-mode' : "stage-mode");
	},

	remove: function() {
		this.refs.remove();
		this.hsplitter.remove();
		this.dsplitter.remove();
		Backbone.View.prototype.remove.apply(this, arguments);
	},
});

var clientView = null;
var recentView = null;

ipc.on('open-repo', function(repo) {
	app.close();
	app.open(repo);
	if (recentView) {
		recentView.remove();
		recentView = null;
	}

	if (!clientView) {
		clientView = new ClientView({});
		$('#container').append(clientView.$el);
	}
});

ipc.on('recent', function(repoList) {
	app.close();
	if (clientView) {
		clientView.remove();
		clientView = null;
	}
	if (recentView) {
		recentView.remove();
		recentView = null;
	}

	recentView = new RecentReposView({ collection: repoList });
	$('#container').append(recentView.$el);
});
