
var Backbone = require("backbone");
var refsHbs = require('./refs.hbs');
var pathToId = require('./pathToId');
var ipcRenderer = require('electron').ipcRenderer;

var RefsView = Backbone.View.extend({
	className: 'refs-view',

	initialize: function(opts) {
		this.workingCopy = opts.workingCopy;
		this.repoSettings = opts.repoSettings;
		this.submodules = opts.submodules;
		this.listenTo(this.collection, "all", this.invalidate);
		this.listenTo(this.submodules, "all", this.invalidate);
		this.listenTo(this.workingCopy, "change:head", this.setHead);
		this.listenTo(this.repoSettings, "change:activeBranch", this.setActive);
		this.listenTo(this.repoSettings, "change:hiddenRemotes", this.setHiddenRemotes);
		this.listenTo(this.repoSettings, "change:showTags", this.setHiddenTags);
		this.listenTo(this.repoSettings, "change:busy", this.setBusy);
		this.busyStart = Date.now();
		this.busy = false;
		return this.render();
	},

	events: {
		"click .stage": "clickStage",
		"click .branch-line": "clickBranch",
		"click .remote-line": "clickBranch",
		"click .show-recent": "clickRecentList",
		"click .remote-header": "clickRemoteHeader",
		"click .tags-header": "clickTagsHeader",
		"click .tag-line": "clickBranch",
		"click .submodule": "clickSubmodule",
	},

	clickStage: function(ev) {
		this.repoSettings.set({ "activeBranch" : "" });
	},

	clickBranch: function(ev) {
		this.repoSettings.set({ "activeBranch" : pathToId.invert(ev.currentTarget.id) });
		let r = this.collection.get(ev.currentTarget.id);
		if (r) {
			this.repoSettings.set('focusCommit', r.get('revision'));
		}
	},

	clickRecentList: function(ev) {
		let submodule = this.workingCopy.get('submodule');
		if (submodule.length === 0) {
			ipcRenderer.send('open-recent');
		}
		else {
			submodule.pop();
			ipcRenderer.send('open-repo', this.workingCopy.get('root'), submodule);
		}
	},

	clickRemoteHeader: function(ev) {
		let e = ev.currentTarget.parentNode;
		let h = this.repoSettings.get('hiddenRemotes') || [];
		let r = pathToId.invert(e.id);
		let i = h.indexOf(r);
		if (i !== -1) {
			this.repoSettings.set('hiddenRemotes', h.filter(function(r, n) { return n !== i; }));
		}
		else {
			this.repoSettings.set('hiddenRemotes', h.concat(r));
		}
	},

	clickTagsHeader: function(ev) {
		let v = this.repoSettings.get('showTags');
		this.repoSettings.set('showTags', !v);
	},

	clickSubmodule: function(ev) {
		let e = ev.currentTarget.parentNode;
		let r = pathToId.invert(e.id);
		let submodule = this.workingCopy.get('submodule');
		submodule.push(r);
		ipcRenderer.send('open-repo', this.workingCopy.get('root'), submodule);
	},

	invalidate: function() {
		var self = this;
		if (self.timeout) return;
		self.timeout = setTimeout(function() { self.timeout = null; self.render(); }, 100);
	},

	setHiddenRemotes: function() {
		this.$(".remote-section").removeClass("hidden");
		let h = this.repoSettings.get('hiddenRemotes') || [];
		h.forEach(function(s) {
			this.$("#" + pathToId(s)).addClass("hidden");
		}.bind(this));
	},

	setHiddenTags: function() {
		let v = this.repoSettings.get('showTags');
		if (v)
			this.$(".tags").removeClass("hidden");
		else
			this.$(".tags").addClass("hidden");
	},

	setHead: function() {
		var branch = this.workingCopy.get("head");
		this.$(".branch-line").removeClass("active-ref");
		if (branch)
			this.$("#" + pathToId(branch)).addClass("active-ref");
	},

	setActive: function() {
		var branch = this.repoSettings.get("activeBranch");
		if (!branch) {
			this.$(".remote-line").removeClass("selected");
			this.$(".branch-line").removeClass("selected");
			this.$(".tag-line").removeClass("selected");
			this.$(".stage-line").addClass("selected");
		}
		else {
			this.$(".remote-line").removeClass("selected");
			this.$(".branch-line").removeClass("selected");
			this.$(".tag-line").removeClass("selected");
			this.$(".stage-line").removeClass("selected");
			this.$("#" + pathToId(branch)).addClass("selected");
		}
	},

	setBusy: function() {
		var b = this.repoSettings.get("busy");
		if (b && !this.busy) {
			this.busyStart = Date.now();
			this.$('.busy-indicator').css('animation-delay', `0ms`);
		}

		this.busy = b !== 0;
		if (this.busy)
			this.$('.busy-indicator').addClass('spinner');
		else
			this.$('.busy-indicator').removeClass('spinner');
	},

	record: function() {
		let remotes = new Map(), allRemotes = [];
		this.collection.forEach(function(r) {
			if (r.get('type') !== "remotes") return;
			let names = r.get('name').split('/');
			let rname = names.shift();
			let name = names.join('/');
			if (name === "HEAD")
				return;
			let e = remotes.get(rname);
			if (!e) {
				e = [];
				remotes.set(rname, e);
				allRemotes.push({ rname: rname, idName: pathToId(rname), branches: e });
			}
			e.push({ name: name, refName: r.get('refName'), idName: pathToId(r.get('refName')) });
		});

		let locals = this.collection.toJSON().filter(function(r) { return r.type === "heads"; });
		locals.forEach(function(r) { r.idName = pathToId(r.refName); });

		let tags = this.collection.toJSON().filter(r => r.type === "tags");
		tags.forEach(function(r) { r.idName = pathToId(r.refName); });

		let submodules = this.submodules.map(s => ({ name: s.get('path'), idName: pathToId(s.get('path')) }));

		return {
			title: this.workingCopy.get("name"),
			branches: locals,
			remotes: allRemotes,
			tags: tags,
			submodules: submodules,
		};
	},

	render: function(mode, f) {
		var record = this.record();
		this.$el.html(refsHbs(record));
		this.$('.busy-indicator').css('animation-delay', `${this.busyStart - Date.now()}ms`);
		this.setHiddenRemotes();
		this.setHiddenTags();
		this.setActive();
		this.setHead();
		this.setBusy();
	},
});
module.exports = RefsView;
