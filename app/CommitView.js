"use strict";

var moment = require("moment");
var Backbone = require("backbone");
var DiffView = require('./DiffView');
var app = require('./app');

var commitInfoHbs = require('./commit-info.hbs');
var commitSummaryHbs = require('./commit-summary.hbs');

var CommitInfoView = Backbone.View.extend({
	className: "commit-info",

	initialize: function() {
		this.listenTo(app.repoSettings, "change:focusCommit", this.render);
		return this.render();
	},

	record: function() {
		let focusCommit = app.repoSettings.get('focusCommit');
		let c = app.commits.get(focusCommit);
		if (!c) return [];
		let commit = c.get('commit');
		return {
			sha: c.id,
			summary: commit.summary(),
			author: commit.author(),
			authorDate: moment(new Date(commit.author().when().time() * 1000)).format('LLL'),
			parents: commit.parents().map(function(p) { return { sha: p }; }),
		};
	},

	render: function() {
		this.$el.html(commitInfoHbs(this.record()));
		return this;
	},
});

var CommitSummaryView = Backbone.View.extend({
	className: "commit-summary",

	initialize: function() {
		this.listenTo(app.repoSettings, "change:focusCommit", this.render);
		this.listenTo(app.focusPatch, "all", this.render);
		return this.render();
	},

	record: function() {
		let focusCommit = app.repoSettings.get('focusCommit');
		let c = app.commits.get(focusCommit);
		if (!c) return {};
		let commit = c.get('commit');
		return {
			message: commit.message(),
			files: app.focusPatch.map(function(r) {
				let patch = r.get("patch");
				let oldFile = patch.oldFile().path();
				let newFile = patch.newFile().path();
				return {
					oldFile: oldFile,
					newFile: oldFile !== newFile && newFile,
				};
			}),
		};
	},

	render: function() {
		this.$el.html(commitSummaryHbs(this.record()));
		return this;
	},
});

var CommitView = Backbone.View.extend({
	className: 'commit-view',

	initialize: function() {
		this.info = new CommitInfoView();
		this.summary = new CommitSummaryView();
		this.diff = new DiffView({ collection: app.focusPatch });
		this.$el.append(this.info.$el);
		this.$el.append(this.summary.$el);
		this.$el.append(this.diff.$el);
	},
});
module.exports = CommitView;
