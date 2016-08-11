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
app.status = new Backbone.Collection();

function loadStatus() {

	return app.repo.getStatus().then(function (files) {
		var queue = new (cwait.TaskQueue)(Promise, 16);

		return Promise.all(files.map(queue.wrap(function(status) {
			let tasks = [];
			status.id = pathToId(status.path);
			if (status.workingStatus === '?') {
				tasks.push(queue.wrap(app.repo.diffFileUntracked.bind(app.repo))(status.path)
					.then(function(patch) {
						status.workingPatch = patch;
						return;
					}));
			}
			else if (status.unmerged) {
				tasks.push(queue.wrap(app.repo.diffFileWorkingToHead.bind(app.repo))(status.path)
					.then(function(patch) {
						status.workingPatch = patch;
						return;
					}));
			}
			else if (status.workingStatus !== ' ') {
				tasks.push(queue.wrap(app.repo.diffFileWorkingToIndex.bind(app.repo))(status.path)
					.then(function(patch) {
						status.workingPatch = patch;
						return;
					}));
			}
			if (status.indexStatus !== ' ' && !status.unmerged) {
				tasks.push(queue.wrap(app.repo.diffFileIndexToHead.bind(app.repo))(status.path, status.fromPath)
					.then(function(patch) {
						status.indexPatch = patch;
						return;
					}));
			}

			return queue.unblock(Promise.all(tasks))
			.then(function() {
				return status;
			})
			.catch(function(err) {
				console.log("hmmm " + err.stack);
			});
		})))
		.then(function(stati) {
			// Reset the status collection
			app.status.reset(stati);

			// Remove any focus files that don't exist.
			let a;
			let ff = app.repoSettings.get("focusFiles");
			if (ff && ff.unstaged) {
				let nf = ff.unstaged.filter(function(f) {
					let r = app.status.get(pathToId(f));
					if (!r) return false;
					let s = r.get('workingStatus');
					return s !== ' ';
				});
				if (ff.length !== nf.length)
					a = { unstaged: nf };
			}
			if (ff && ff.staged) {
				let nf = ff.staged.filter(function(f) {
					let r = app.status.get(pathToId(f));
					if (!r) return false;
					let s = r.get('indexStatus');
					return s !== ' ' && s !== '?';
				});
				if (ff.length !== nf.length) {
					if (!a) a = {};
					a.staged = nf;
				}
			}

			if (a) {
				app.repoSettings.set("focusFiles", a);
			}
		});
	});
}

app.workingUpdater = new LazyUpdater(loadStatus);
app.workingWatch = new Watcher(function() { app.workingUpdater.poke(); });

app.close = function() {
	app.repo = null;
	app.commits.reset([]);
	app.status.reset([]);
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
	let c = app.commits.get(focusCommit);
	if (!c) return;
	let commit = c.get('commit');
	let p = commit.parents;
	if (p.length === 1) {
		app.repo.diffCommits(p[0], focusCommit).then(function(diff) {
			app.focusPatch.reset(diff.patches.map(function(p) { return { patch: p }; }));
		});
	}
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

		this.diff = new PickView({ collection: app.status, settings: app.repoSettings, app: app });
		this.index = new IndexView({ collection: app.status, windowLayout: app.windowLayout, settings: app.repoSettings, app: app });
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
