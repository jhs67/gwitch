"use strict";

// Set's up require hook to handle hbs files
require("handlebars");

var $ = require('jquery');
var Backbone = require("backbone");
var ipcRenderer = require('electron').ipcRenderer;
let cwait = require('cwait');

var path = require("path");

var PickView = require("./PickView");
var HistoryView = require("./HistoryView");
var CommitView = require("./CommitView");
var RefsView = require("./RefsView");
var IndexView = require("./IndexView");
var SplitterView = require("./SplitterView");
var RecentReposView = require("./RecentReposView");
var pathToId = require('./pathToId');
var LazyUpdater = require('./LazyUpdater');
var JetSync = require('./JetSync');
var Watcher = require('./Watcher');
let walkTree = require('./walkTree');
var graph = require('./graph');
var Gwit = require('./Gwit');


var CommitModel = Backbone.Model.extend({
});

var CommitCollection = Backbone.Collection.extend({
	model: CommitModel,
});

var PatchModel = Backbone.Model.extend({
	path: function() { return this.get('newFile') || this.get('oldFile'); },

	setup: function(difflimit, addlimit, old) {
		let hunks = this.get('hunks');
		let lines = !hunks ? 0 : hunks.reduce((p, h) => h.lines.length + p, 0);
		this.set('lines', lines);

		let status = this.get('status');
		let large =  lines > (status === 'D' || status === 'A' ? addlimit : difflimit);
		this.set('large', large);

		if (old && old.has('show'))
			this.set('show', old.get('show'));
	},

	show: function() {
		if (this.has('show'))
			return this.get('show');
		return !this.get('large');
	}
});

var PatchCollection = Backbone.Collection.extend({
	model: PatchModel,
});

var WorkingCopyModel = Backbone.Model.extend({
});

var RepoSettingsModel = Backbone.Model.extend({
});

var WindowLayoutModel = Backbone.Model.extend({
	url: function() {
		return pathToId(app.workingCopy.get('path'));
	},

	sync: JetSync,
});

var app = module.exports;

app.repo = null;
app.commits = new CommitCollection();
app.refs = new Backbone.Collection();
app.workingCopy = new WorkingCopyModel();
app.repoSettings = new RepoSettingsModel();
app.submodules = new Backbone.Collection();
app.focusPatch = new PatchCollection();
app.windowLayout = new WindowLayoutModel();
app.workingStatus = new PatchCollection();
app.indexStatus = new PatchCollection();
app.statusGeneration = 0;

function loadStatus() {
	// Use a generation counter to keep old jobs from continuing
	app.statusGeneration += 1;
	let generation = app.statusGeneration;

	return app.repo.getStatus().then(function (files) {
		if (app.statusGeneration !== generation)
			return;

		// Sort through the list and sort into working and index changes.
		let work = [], cache = [];
		files.forEach(f => {
			let id = pathToId(f.path);
			if (f.workingStatus !== ' ') {
				let status = f.workingStatus;
				let newFile = status === 'D' ? null : f.path;
				let oldFile = status === 'D' ? f.path : f.fromPath || f.path;
				work.push({ id, status, newFile, oldFile, unmerged: f.unmerged });
			}
			if (f.indexStatus !== ' ' && f.indexStatus !== '?') {
				cache.push({ id, status: f.indexStatus, newFile: f.path, oldFile: f.fromPath, unmerged: f.unmerged });
			}

		});

		work = work.map(w => new PatchModel(w));
		cache = cache.map(w => new PatchModel(w));

		let queue = new (cwait.TaskQueue)(Promise, 2);

		return Promise.all(work.map(queue.wrap(r => {
			if (app.statusGeneration !== generation)
				return Promise.resolve();

			let patch;
			let status = r.get('status');
			if (status === '?')
				patch = app.repo.diffFileUntracked(r.path());
			else if (r.get('unmerged'))
				patch = app.repo.diffFileWorkingToHead(r.path());
			else
				patch = app.repo.diffFileWorkingToIndex(r.path());

			return patch.then(patch => {
				if (!patch)
					return;
				if (status === '?' && patch.status === 'A')
					patch.status = status;
				if (app.statusGeneration !== generation)
					return;
				r.set(patch);
			});
		})).concat(cache.map(queue.wrap(r => {
			if (app.statusGeneration !== generation)
				return Promise.resolve();

			if (r.get("unmerged")) {
				r.set("hunks", []);
				return Promise.resolve();
			}

			let patch = app.repo.diffFileIndexToHead(r.path(), r.get("oldFile"));

			return patch.then(patch => {
				if (app.statusGeneration !== generation)
					return;
				r.set(patch);
			});
		})))).then(() => {
			if (app.statusGeneration !== generation)
				return;

			// Setup the implicit values and copy ui state from the old model
			work.forEach(r => { r.setup(400, 50, app.workingStatus.get(r.id)); });
			cache.forEach(r => { r.setup(400, 50, app.indexStatus.get(r.id)); });

			// reset the model
			app.workingStatus.reset(work);
			app.indexStatus.reset(cache);

			// Remove any focus files that don't exist.
			let a;
			let ff = app.repoSettings.get("focusFiles");
			if (ff && ff.unstaged) {
				let nf = ff.unstaged.filter(f => { return app.workingStatus.get(pathToId(f)); });
				if (ff.length !== nf.length)
					a = { unstaged: nf };
			}
			if (ff && ff.staged) {
				let nf = ff.staged.filter(f => { return app.indexStatus.get(pathToId(f)); });
				if (ff.length !== nf.length) {
					if (!a) a = {};
					a.staged = nf;
				}
			}

			if (a) app.repoSettings.set("focusFiles", a);
		});
	});
}

app.workingUpdater = new LazyUpdater(loadStatus);
app.workingWatch = new Watcher(function() { app.workingUpdater.poke(); });

app.close = function() {
	app.repo = null;
	app.commits.reset([]);
	app.workingStatus.reset([]);
	app.indexStatus.reset([]);
	app.focusPatch.reset([]);
	app.refs.reset([]);
	app.submodules.reset([]);
	app.repoSettings.unset('focusCommit');
	app.repoSettings.unset('activeBranch');
	app.repoSettings.unset('focusFiles');
	app.repoSettings.unset('hiddenRemotes');
	app.workingCopy.unset('path');
	app.workingCopy.unset('name');
	app.workingCopy.unset('gitdir');
	app.repoSettings.unset('head');
	app.windowLayout.unset('commitBar');
	app.windowLayout.unset('historyBar');
	app.windowLayout.unset('workingList');
	app.windowLayout.unset('stageList');
	app.workingWatch.close();
	app.commitsWatch.close();
	app.statusGeneration += 1;

	if (app.workingWalk) {
		app.workingWalk.cancel();
		app.workingWalk = null;
	}
	if (app.commitsWalk) {
		app.commitsWalk.cancel();
		app.commitsWalk = null;
	}
};

function getCommits(repo, refs) {
	return Promise.all(refs.map(function(r) {
		return repo.lookupRef(r);
	}))
	.then(function(heads) {
		return repo.log(refs).then(function(log) {
			var byId = new Map();
			log.forEach(function(commit) {
				var d = { commit: commit, id: commit.hash, children: [], search: 0, index: -1, graph: [] };
				byId.set(commit.hash, d);
			});
			log.forEach(function(commit) {
				commit.parents.forEach(function(p) {
					var d = byId.get(p);
					d.children.push(byId.get(commit.hash));
				});
			});

			return graph.createGraph(byId, heads.map(function(h) { return byId.get(h); }));
		});
	});
}

function loadCommits() {
	return Promise.all([
		app.repo.getRefs().then(function(refs) {
			app.refs.reset(refs.map(function(r) { r.id = pathToId(r.refName); return r; }));
		}),
		app.repo.head().then(function(ref) {
			app.workingCopy.set('head', ref);
		}),
	])
	.then(function() {
		return getCommits(app.repo, app.refs.map(function(b) { return b.get('refName'); })).then(function(commits) {
			app.commits.reset(commits);

			let focusCommit = app.repoSettings.get('focusCommit');
			if (focusCommit && !app.commits.get(focusCommit))
				focusCommit = null;

			if (!focusCommit && app.commits.length > 0) {
				focusCommit = app.commits.at(0).id;
				let head = app.workingCopy.get('head');
				if (head) {
					let headid = pathToId(head);
					if (app.commits.get(headid))
						focusCommit = headid;
				}
			}

			app.repoSettings.set('focusCommit', focusCommit);
		});
	});
}

app.commitsUpdater = new LazyUpdater(loadCommits);
app.commitsWatch = new Watcher(function(ev, file) {
	app.commitsUpdater.poke();
	let rel = path.relative(path.resolve(app.workingCopy.get('path'), app.workingCopy.get('gitdir')), file);
	if (rel === "HEAD")
		app.workingUpdater.poke();
	if (rel === app.workingCopy.get('head'))
		app.workingUpdater.poke();
});

function loadFocusCommit() {
	app.focusPatch.reset([]);
	let focusCommit = app.repoSettings.get('focusCommit');
	let commit = app.commits.get(focusCommit);
	if (!commit)
		return Promise.resolve();
	let p = commit.get('commit').parents;
	if (p.length !== 1)
		return Promise.resolve();

	return app.repo.commitStatus(focusCommit).then(status => {
		if (focusCommit !== app.repoSettings.get('focusCommit'))
			return;
		app.focusPatch.reset(status);
	}).then(() => {
		if (focusCommit !== app.repoSettings.get('focusCommit'))
			return;

		let queue = new (cwait.TaskQueue)(Promise, 2);
		return Promise.all(app.focusPatch.map(queue.wrap(r => {
			if (focusCommit != app.repoSettings.get('focusCommit'))
				return Promise.resolve();

			return app.repo.diffCommitFile(p[0], focusCommit, r.path()).then(patches => {
				if (focusCommit !== app.repoSettings.get('focusCommit'))
					return;

				let patch = patches.patches[0];
				r.set(patch);
				r.setup(200, 25);
			});
		})));
	});
}

function getGitDir() {
	return app.repo.getGitDir().then(function(gitdir) {
		gitdir = path.resolve(app.repo.repodir, gitdir);
		app.workingCopy.set('gitdir', gitdir);
	});
}

function loadWatches() {
	return app.repo.getSubmodules().then(function(submodules) {
		submodules.forEach(function(s) { s.fullpath = path.resolve(app.repo.repodir, s.path); });
		app.submodules.add(submodules);

		return app.repo.getIndexFiles();
	})
	.then(function(files) {
		let root = app.workingCopy.get('path');
		files.forEach(function(f) { app.workingWatch.add(path.join(root, f)); });
		app.workingWatch.add(root);
		app.workingWatch.add(path.resolve(root, app.workingCopy.get('gitdir'), "index"));

		app.workingWalk = walkTree(root, function(records) {
			records = records.filter(function(rec) {
				if (!rec.stat.isDirectory())
					return false;

				let fullpath = path.join(rec.root, rec.path);
				if (fullpath == app.workingCopy.get('gitdir'))
					return false;
				if (app.submodules.any(function(s) { return s.get('fullpath') === fullpath; }))
					return false;

				return true;
			});

			let totest = records.filter(function(rec) { return rec.path; }).map(function(rec) { return rec.path + "/"; });
			if (totest.length === 0)
				return records;

			return app.repo.getIgnored(totest)
			.then(function(ignored) {
				records = records.filter(function(rec) {
					return ignored.every(function(f) { return rec.path !== f.substr(0, f.length - 1); });
				});

				records.forEach(function(r) {
					app.workingWatch.add(path.join(root, r.path));
				});
				return records;
			});
		});

		return app.workingWalk;

	}).then(function() {
		app.workingWalk = null;
		app.workingUpdater.poke();
	});
}

function loadRefWatches() {
	let root = app.workingCopy.get('path');
	let gitdir = app.workingCopy.get('gitdir');

	function addRecusive(d) {
		let p = path.resolve(root, gitdir, d);
		app.commitsWalk = walkTree(p, function(records) {
			records.forEach(rec => {
				app.commitsWatch.add(path.join(rec.root, rec.path));
			});
			return records;
		});

		return app.commitsWalk;
	}

	app.commitsWatch.add(path.resolve(root, gitdir, 'packed-refs'));
	app.commitsWatch.add(path.resolve(root, gitdir, 'HEAD'));
	return addRecusive('refs')
	.then(() => {
		return addRecusive('logs');
	}).then(() => {
		app.commitsWalk = null;
		app.commitsUpdater.poke();
	});
}

app.open = function(file) {
	app.workingCopy.set('path', file);
	app.workingCopy.set('name', path.basename(file, ".git"));
	Gwit.open(file).then(function(repo) {
		app.repo = repo;
		app.workingUpdater.start();
		app.commitsUpdater.start();
		return getGitDir()
		.then(() => {
			return Promise.all([
				loadWatches(),
				loadRefWatches(),
			]);
		});
	})
	.catch(function(err) {
		console.log("error: " + (err && err.stack));
	});

	app.windowLayout.fetch();
	app.repoSettings.on("change:focusCommit", loadFocusCommit);
};

var ClientView = Backbone.View.extend({
	className: 'client-view',

	initialize: function() {
		this.refs = new RefsView({ collection: app.refs, workingCopy: app.workingCopy, repoSettings: app.repoSettings });
		this.$el.append(this.refs.el);

		this.commit = new CommitView();
		this.history = new HistoryView({ collection: app.commits, repoSettings: app.repoSettings, refs: app.refs });
		this.hsplitter = new SplitterView({ top: this.history.$el, bottom: this.commit.$el, key: "historyBar" });
		this.hsplitter.$el.addClass("history-splitter");
		this.$el.append(this.hsplitter.el);

		this.diff = new PickView({ settings: app.repoSettings, app: app });
		this.index = new IndexView({ windowLayout: app.windowLayout, settings: app.repoSettings, app: app });
		this.dsplitter = new SplitterView({ top: this.diff.$el, bottom: this.index.$el, key: "commitBar" });
		this.dsplitter.$el.addClass("stage-splitter");
		this.$el.append(this.dsplitter.el);

		this.branchChange();
		this.listenTo(app.repoSettings, "change:activeBranch", this.branchChange);
	},

	setSize: function() {
		this.hsplitter.setSize();
		this.dsplitter.setSize();
	},

	branchChange: function() {
		var b = app.repoSettings.get('activeBranch');
		this.$el.addClass(b ? 'history-mode' : "stage-mode");
		this.$el.removeClass(!b ? 'history-mode' : "stage-mode");
		this.setSize();
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

ipcRenderer.on('open-repo', function(emitter, repo) {
	app.close();
	app.open(repo);
	if (recentView) {
		recentView.remove();
		recentView = null;
	}

	if (!clientView) {
		clientView = new ClientView({});
		$('#container').append(clientView.$el);
		clientView.setSize();
	}
});

ipcRenderer.on('recent', function(emitter, repoList) {
	app.close();
	if (clientView) {
		clientView.remove();
		clientView = null;
	}
	if (recentView) {
		recentView.remove();
		recentView = null;
	}

	let c = new Backbone.Collection(repoList.map(p => { return { path: p, name: path.basename(p, ".git") }; }));
	recentView = new RecentReposView({ collection: c });
	$('#container').append(recentView.$el);
});

ipcRenderer.on('reload', function(emitter) {
	if (app.repo) {
		app.workingUpdater.commit();
		app.commitsUpdater.commit();
	}
});
